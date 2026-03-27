import { spawn } from 'child_process'
import { Tool, ToolContext, ToolResult } from '../tool.types.js'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const bash_description = fs.readFileSync(path.join(__dirname, 'bash.txt'), 'utf-8')

const DEFAULT_TIMEOUT = 120000
const MAX_BYTES = 50 * 1024
const MAX_LINES = 2000

function getShell(): string {
  if (process.platform === 'win32') {
    const gitPath = spawn('where', ['git'], { shell: true }).stdout.toString().trim()
    if (gitPath) {
      const bashPath = path.join(path.dirname(gitPath), '..', 'bin', 'bash.exe')
      try {
        if (fs.statSync(bashPath).isFile()) {
          return bashPath
        }
      } catch {}
    }
    return process.env.COMSPEC || 'cmd.exe'
  }
  return process.env.SHELL || '/bin/sh'
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

    const shell = getShell()
    const isWindows = process.platform === 'win32'
    const shellArg = isWindows && shell.endsWith('bash.exe') ? shell : undefined

    const proc = spawn(command, {
      shell: shellArg || shell,
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: isWindows
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
