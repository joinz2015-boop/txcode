/**
 * LspTool - AI 交互工具
 */

import * as path from "path";
import * as fs from "fs";
import { LSPManager, LSPClient, getServersByExtension } from "../lsp/index.js";
import { Tool } from "../modules/tools/tool.types.js";

interface LSPToolParams {
  action: "gotoDefinition" | "findReferences" | "hover" | "documentSymbol" | "workspaceSymbol" | "gotoImplementation" | "callHierarchy";
  filePath?: string;
  line?: number;
  character?: number;
  query?: string;
}

const lspTool: Tool = {
  name: "lsp",
  description: `LSP (Language Server Protocol) tools for code navigation and analysis.

Available actions:
- gotoDefinition: Jump to the definition of a symbol
- findReferences: Find all references to a symbol
- hover: Get hover information about a symbol
- documentSymbol: Get all symbols in a document
- workspaceSymbol: Search for symbols across the workspace
- gotoImplementation: Jump to the implementation of a symbol
- callHierarchy: Get the call hierarchy of a function`,

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
        description: "The LSP action to perform",
      },
      filePath: {
        type: "string",
        description: "Path to the file (required for gotoDefinition, findReferences, hover, documentSymbol, gotoImplementation, callHierarchy)",
      },
      line: {
        type: "number",
        description: "Line number (1-indexed, required for gotoDefinition, findReferences, hover, gotoImplementation, callHierarchy)",
      },
      character: {
        type: "number",
        description: "Character position (0-indexed, required for gotoDefinition, findReferences, hover, gotoImplementation, callHierarchy)",
      },
      query: {
        type: "string",
        description: "Search query (required for workspaceSymbol)",
      },
    },
    required: ["action"],
  },

  execute: async (params: LSPToolParams): Promise<string> => {
    const { action, filePath, line, character, query } = params;

    if (!filePath && action !== "workspaceSymbol") {
      return JSON.stringify({ error: "filePath is required for this action" });
    }

    const ext = path.extname(filePath || "");
    const servers = getServersByExtension(ext);

    if (servers.length === 0) {
      return JSON.stringify({ error: `No LSP server found for extension: ${ext}` });
    }

    const serverId = servers[0].id;
    const status = await LSPManager.getServerStatus(serverId);

    if (status.status !== "running") {
      return JSON.stringify({ error: `LSP server ${serverId} is not running` });
    }

    const client = new LSPClient(serverId);

    const uri = `file://${path.resolve(filePath || "")}`;

    switch (action) {
      case "gotoDefinition": {
        const result = await client.gotoDefinition(uri, {
          line: (line || 1) - 1,
          character: character || 0,
        });
        return JSON.stringify(result);
      }

      case "findReferences": {
        const result = await client.findReferences(uri, {
          line: (line || 1) - 1,
          character: character || 0,
        });
        return JSON.stringify(result);
      }

      case "hover": {
        const result = await client.hover(uri, {
          line: (line || 1) - 1,
          character: character || 0,
        });
        return JSON.stringify(result);
      }

      case "documentSymbol": {
        const result = await client.documentSymbol(uri);
        return JSON.stringify(result);
      }

      case "workspaceSymbol": {
        if (!query) {
          return JSON.stringify({ error: "query is required for workspaceSymbol" });
        }
        const result = await client.workspaceSymbol(query);
        return JSON.stringify(result);
      }

      case "gotoImplementation": {
        const result = await client.gotoImplementation(uri, {
          line: (line || 1) - 1,
          character: character || 0,
        });
        return JSON.stringify(result);
      }

      case "callHierarchy": {
        const result = await client.callHierarchy(uri, {
          line: (line || 1) - 1,
          character: character || 0,
        });
        return JSON.stringify(result);
      }

      default:
        return JSON.stringify({ error: `Unknown action: ${action}` });
    }
  },
};

export { lspTool };
