export type * from './callerChat.types.js'
export { CallerChatService } from './callerChat.service.js'

import { CallerChatService } from './callerChat.service.js'

export const callerChatService = new CallerChatService()
