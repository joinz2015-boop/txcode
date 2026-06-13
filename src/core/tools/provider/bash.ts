import { spawn } from 'child_process'
import { Tool, ToolContext, ToolResult } from '../tool.types.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import which from 'which'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const bash_description = fs.readFileSync(path.join(__dirname, 'bash.txt'), 'utf-8')

const DEFAULT_TIMEOUT = 120000
const MAX_BYTES = 50 * 1024
const MAX_LINES = 2000

function getGitBashPath(): string | null {
  if (process.platform !== 'win32') return null

  const gitPath = which.sync('git', { nothrow: true })
  if (!gitPath) return null

  const bashPath = path.resolve(path.dirname(gitPath), '..',  'bin', 'bash.exe')

  try {
    if (fs.statSync(bashPath).isFile()) {
      return bashPath
    }
  } catch {}
  return null
}

function getShellConfig(): { shell: string; args: string[]; useBash: boolean } {
  if (process.platform === 'win32') {
    const gitBash = getGitBashPath()
    if (gitBash) {
      return { shell: gitBash, args: ['-c'], useBash: true }
    }
    return { shell: process.env.COMSPEC || 'cmd.exe', args: [], useBash: false }
  }
  return { shell: process.env.SHELL || '/bin/sh', args: ['-c'], useBash: false }
}

export const bashTool: Tool = {
  name: 'bash',
  description: bash_description,
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: '要执行的命令'
      },
      workdir: {
        type: 'string',
        description: '工作目录（可选，默认为当前目录）'
      },
      timeout: {
        type: 'number',
        description: '超时时间，毫秒（可选，默认 120000 = 2分钟）'
      }
    },
    required: ['command']
  },
  execute: async (params: { command: string; workdir?: string; timeout?: number }, context: ToolContext): Promise<ToolResult> => {
    const { command, workdir, timeout = DEFAULT_TIMEOUT } = params
    const cwd = workdir || context.workDir || process.cwd()

    let output = ''
    let exited = false

    const { shell, args, useBash } = getShellConfig()

    const proc = spawn(useBash ? shell : command, useBash ? [...args, command] : [], {
      shell: useBash ? undefined : (shell || true),
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    })

    const killTree = () => {
      if (process.platform === 'win32' && proc.pid) {
        spawn('taskkill', ['/pid', String(proc.pid), '/f', '/t'], { stdio: 'ignore', windowsHide: true })
      } else if (proc.pid) {
        try {
          process.kill(-proc.pid, 'SIGTERM')
        } catch {
          proc.kill('SIGTERM')
        }
      }
    }

    proc.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString()
      if (output.length > MAX_BYTES) {
        output = output.slice(0, MAX_BYTES) + '\n\n[output truncated - exceeded ' + MAX_BYTES + ' bytes]'
        killTree()
      }
    })

    proc.stderr?.on('data', (chunk: Buffer) => {
      output += chunk.toString()
    })

    const abortHandler = () => {
      killTree()
    }
    context.abortSignal?.addEventListener('abort', abortHandler)

    const timeoutTimer = setTimeout(() => {
      output += '\n\n[command timed out after ' + timeout + 'ms]'
      killTree()
    }, timeout)

    try {
      await new Promise<void>((resolve, reject) => {
        proc.on('exit', (code) => {
          exited = true
          clearTimeout(timeoutTimer)
          context.abortSignal?.removeEventListener('abort', abortHandler)
          resolve()
        })
        proc.on('error', (err) => {
          exited = true
          clearTimeout(timeoutTimer)
          context.abortSignal?.removeEventListener('abort', abortHandler)
          reject(err)
        })
      })
    } catch (err: any) {
      return {
        success: false,
        output,
        error: err.message
      }
    }

    const lines = output.split('\n').length
    if (lines > MAX_LINES) {
      const truncated = output.split('\n').slice(0, MAX_LINES).join('\n')
      output = truncated + '\n\n[output truncated - exceeded ' + MAX_LINES + ' lines]'
    }

    return {
      success: true,
      output: output || '命令执行成功（无输出）',
      metadata: { exitCode: proc.exitCode }
    }
  }
}
