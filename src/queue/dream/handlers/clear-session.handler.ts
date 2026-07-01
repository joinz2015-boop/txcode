import { IDreamHandler, DreamTask } from '../dream.types.js'
import { sessionRepository } from '../../../repository/session.repository.js'
import { messageRepository } from '../../../repository/message.repository.js'
import { dbService } from '../../../core/db/db.service.js'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const TRIGGER_TOTAL = 10000
const STOP_TOTAL = 5000

export class ClearSessionHandler implements IDreamHandler {
  dreamType = 'clear-session'

  async handle(_task: DreamTask): Promise<void> {
    let totalCount = messageRepository.countAll()
    if (totalCount <= TRIGGER_TOTAL) return

    const home = os.homedir()
    const sessionDir = path.join(home, '.txcode', 'session')
    fs.mkdirSync(sessionDir, { recursive: true })

    while (totalCount >= STOP_TOTAL) {
      const oldestSessionId = messageRepository.getOldestSessionId()
      if (!oldestSessionId) break

      const messages = messageRepository.getAll(oldestSessionId)
      if (messages.length === 0) break

      const archivePath = path.join(sessionDir, `${oldestSessionId}.json`)
      const archiveData = {
        sessionId: oldestSessionId,
        archivedAt: new Date().toISOString(),
        totalArchived: messages.length,
        messages: messages.map(m => ({
          id: m.id,
          sessionId: m.session_id,
          role: m.role,
          content: m.content,
          keepContext: Boolean(m.keep_context),
          isOriginal: Boolean(m.is_original),
          createdAt: m.created_at,
        })),
      }
      fs.writeFileSync(archivePath, JSON.stringify(archiveData, null, 2), 'utf-8')

      messageRepository.deleteBySession(oldestSessionId)
      sessionRepository.delete(oldestSessionId)

      totalCount = messageRepository.countAll()
    }

    dbService.vacuum()
  }
}
