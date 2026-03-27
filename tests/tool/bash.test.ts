import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import which from 'which'

function getGitBashPath(): string | null {
  if (process.platform !== 'win32') return null

  const gitPath = which.sync('git', { nothrow: true })
  if (!gitPath) return null

  const bashPath = path.resolve(path.dirname(gitPath), '..', '..', 'bin', 'bash.exe')
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

describe('bash shell detection', () => {
  describe('getGitBashPath', () => {
    test('should return null on non-Windows', () => {
      if (process.platform !== 'win32') {
        expect(getGitBashPath()).toBeNull()
      }
    })

    test('should detect git bash on Windows if git is installed', () => {
      if (process.platform === 'win32') {
        const gitBash = getGitBashPath()
        if (gitBash) {
          expect(fs.existsSync(gitBash)).toBe(true)
          expect(gitBash.endsWith('bash.exe')).toBe(true)
        } else {
          console.log('Git not found or bash.exe not found')
        }
      }
    })
  })

  describe('getShellConfig', () => {
    test('should return bash config on Windows with git', () => {
      if (process.platform === 'win32') {
        const config = getShellConfig()
        if (config.useBash) {
          expect(config.args).toContain('-c')
          expect(config.shell).toContain('bash.exe')
        } else {
          console.log('Git bash not available, using:', config.shell)
        }
      }
    })

    test('should execute ls command via git bash on Windows', () => {
      if (process.platform === 'win32') {
        const { shell, args, useBash } = getShellConfig()
        
        if (useBash) {
          const result = spawnSync(shell, [...args, 'ls'], { 
            encoding: 'utf-8',
            windowsHide: true
          })
          
          expect(result.status).toBe(0)
          expect(result.stdout).toContain('node_modules')
        } else {
          console.log('Skipping - git bash not available')
        }
      }
    })

    test('should execute echo command via git bash', () => {
      if (process.platform === 'win32') {
        const { shell, args, useBash } = getShellConfig()
        
        if (useBash) {
          const result = spawnSync(shell, [...args, 'echo hello'], { 
            encoding: 'utf-8',
            windowsHide: true
          })
          
          expect(result.stdout.trim()).toBe('hello')
        }
      }
    })
  })
})
