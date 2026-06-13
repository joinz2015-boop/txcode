/**
 * CLI 模块
 */

export { parseArgs } from './args.js';
export { executeCommand, registerCommand, getAllCommands } from './commands.js';
export type { CLIState, MessageItem, CommandResult } from './cli.types.js';