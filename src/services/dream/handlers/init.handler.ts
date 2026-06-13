import { IDreamHandler, DreamTask } from '../dream.types.js'
import { DreamAgent } from '../../../core/ai/agents/dream/dream.agent.js'
import { configService } from '../../../services/config/config.service.js'
import { createProvider } from '../../../core/ai/provider/factory.js'
import { projectService } from '../../../services/project/project.service.js'
import * as fs from 'fs'
import * as path from 'path'

export class InitHandler implements IDreamHandler {
  dreamType = 'init'

  async handle(task: DreamTask): Promise<void> {
    const workDir = projectService.getCurrentProjectPath()
    const projectDir = path.join(workDir, '.txcode', 'project')
    const projectMdPath = path.join(projectDir, 'PROJECT.md')
    const metaPath = path.join(projectDir, 'meta.json')

    fs.mkdirSync(projectDir, { recursive: true })

    if (fs.existsSync(projectMdPath)) {
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
          const lastGen = new Date(meta.lastGenerated).getTime()
          const hoursAgo = (Date.now() - lastGen) / (1000 * 60 * 60)
          if (hoursAgo < 24) {
            //console.log('[Dream:init] PROJECT.md 距上次生成不足24小时，跳过')
            return
          }
        } catch {
          console.log('[Dream:init] meta.json 损坏，触发重生成')
        }
      }

      //console.log('[Dream:init] PROJECT.md 已超过24小时，触发审查重生成')
      await this.runAgent(workDir, '这是之前生成的 PROJECT.md 文件已经超过24小时了，你来检查下是否准确如果不准确重新生成')
      return
    }

    await this.runAgent(workDir, '请分析项目并生成 PROJECT.md')
    console.log('[Dream:init] PROJECT.md 生成完成')
  }

  private async runAgent(workDir: string, userMessage: string): Promise<void> {
    try {
      const defaultModel = configService.getDefaultModel()
      const providerConfig = configService.getModelProvider(defaultModel)

      if (!providerConfig) {
        console.error('[Dream:init] 未找到可用 provider')
        return
      }

      const provider = createProvider({
        apiKey: providerConfig.apiKey,
        baseUrl: providerConfig.baseUrl || '',
        defaultModel: defaultModel,
      })

      const agent = new DreamAgent({
        provider,
        workDir,
      })

      await agent.run('init', userMessage)

      const metaPath = path.join(workDir, '.txcode', 'project', 'meta.json')
      fs.writeFileSync(metaPath, JSON.stringify({
        lastGenerated: new Date().toISOString(),
        projectName: path.basename(workDir),
      }, null, 2))
    } catch (error) {
      console.error('[Dream:init] 生成失败:', error)
    }
  }
}
