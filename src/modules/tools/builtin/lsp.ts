/**
 * LSP (Language Server Protocol) 工具
 */

import * as path from "path"
import { Tool, ToolContext, ToolResult } from '../tool.types.js'
import { LSPManager, LSPClient, getServersByExtension } from "../../../lsp/index.js"

const lspTool: Tool = {
  name: "lsp",
  description: '',
  descriptionFile: 'lsp.txt',

  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: [
          "gotoDefinition",
          "findReferences",
          "hover",
          "documentSymbol",
          "workspaceSymbol",
          "gotoImplementation",
          "callHierarchy",
        ],
        description: "要执行的 LSP 操作",
      },
      filePath: {
        type: "string",
        description: "文件路径（gotoDefinition, findReferences, hover, documentSymbol, gotoImplementation, callHierarchy 操作需要）",
      },
      line: {
        type: "number",
        description: "行号（1-indexed，用于 gotoDefinition, findReferences, hover, gotoImplementation, callHierarchy）",
      },
      character: {
        type: "number",
        description: "字符位置（0-indexed，用于 gotoDefinition, findReferences, hover, gotoImplementation, callHierarchy）",
      },
      query: {
        type: "string",
        description: "搜索查询（workspaceSymbol 操作需要）",
      },
    },
    required: ["action"],
  },

  execute: async (params: {
    action: "gotoDefinition" | "findReferences" | "hover" | "documentSymbol" | "workspaceSymbol" | "gotoImplementation" | "callHierarchy"
    filePath?: string
    line?: number
    character?: number
    query?: string
  }, context: ToolContext): Promise<ToolResult> => {
    const { action, filePath, line, character, query } = params

    if (!filePath && action !== "workspaceSymbol") {
      return { success: false, output: '', error: "filePath is required for this action" }
    }

    const ext = path.extname(filePath || "")
    const servers = getServersByExtension(ext)

    if (servers.length === 0) {
      return { success: false, output: '', error: `No LSP server found for extension: ${ext}` }
    }

    const serverId = servers[0].id
    const status = await LSPManager.getServerStatus(serverId)

    if (status.status !== "running") {
      return { success: false, output: '', error: `LSP server ${serverId} is not running` }
    }

    const client = new LSPClient(serverId)
    const uri = `file://${path.resolve(filePath || "")}`

    try {
      let result: any

      switch (action) {
        case "gotoDefinition": {
          result = await client.gotoDefinition(uri, {
            line: (line || 1) - 1,
            character: character || 0,
          })
          break
        }

        case "findReferences": {
          result = await client.findReferences(uri, {
            line: (line || 1) - 1,
            character: character || 0,
          })
          break
        }

        case "hover": {
          result = await client.hover(uri, {
            line: (line || 1) - 1,
            character: character || 0,
          })
          break
        }

        case "documentSymbol": {
          result = await client.documentSymbol(uri)
          break
        }

        case "workspaceSymbol": {
          if (!query) {
            return { success: false, output: '', error: "query is required for workspaceSymbol" }
          }
          result = await client.workspaceSymbol(query)
          break
        }

        case "gotoImplementation": {
          result = await client.gotoImplementation(uri, {
            line: (line || 1) - 1,
            character: character || 0,
          })
          break
        }

        case "callHierarchy": {
          result = await client.callHierarchy(uri, {
            line: (line || 1) - 1,
            character: character || 0,
          })
          break
        }

        default:
          return { success: false, output: '', error: `Unknown action: ${action}` }
      }

      return {
        success: true,
        output: JSON.stringify(result, null, 2),
        metadata: { action, filePath, serverId }
      }
    } catch (err: any) {
      return { success: false, output: '', error: err.message }
    }
  }
}

export { lspTool }
