import * as fs from 'fs'
import * as path from 'path'

export function loadProjectContext(workDir: string): string {
  const projectMdPath = path.join(workDir, '.txcode', 'project', 'PROJECT.md')
  if (!fs.existsSync(projectMdPath)) return ''

  const content = fs.readFileSync(projectMdPath, 'utf-8')
  const lines = content.split('\n').slice(0, 150)
  return lines.join('\n')
}
