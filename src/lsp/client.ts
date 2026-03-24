/**
 * LSP 客户端实现
 * 
 * 基于 stdio 的 JSON-RPC 通信
 */

import { ChildProcess } from "child_process";
import { EventEmitter } from "events";
import { launchProcess } from "./launch.js";
import { LSPServerInfo } from "./types.js";

interface JSONRPCMessage {
  jsonrpc: "2.0";
  id?: number | string;
  method?: string;
  params?: any;
  result?: any;
  error?: any;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

export class LSPClient extends EventEmitter {
  private serverId: string;
  private process: ChildProcess | null = null;
  private cleanupFn: (() => void) | null = null;
  private pendingRequests: Map<number | string, PendingRequest> = new Map();
  private messageBuffer: string = "";
  private requestId: number = 0;
  private initialized: boolean = false;
  private rootPath: string = "";

  constructor(serverId: string) {
    super();
    this.serverId = serverId;
  }

  async connect(
    serverInfo: LSPServerInfo,
    rootPath: string,
    command: string,
    args: string[] = []
  ): Promise<boolean> {
    this.rootPath = rootPath;

    const { process: proc, cleanup } = launchProcess({
      command,
      args,
      cwd: rootPath,
    });

    this.process = proc;
    this.cleanupFn = cleanup;

    this.process.stdout?.on("data", (data: Buffer) => {
      this.handleData(data.toString());
    });

    this.process.stderr?.on("data", (data: Buffer) => {
      this.emit("error", data.toString());
    });

    this.process.on("close", (code) => {
      this.emit("close", code);
    });

    return this.initialize();
  }

  private handleData(data: string): void {
    this.messageBuffer += data;

    while (this.messageBuffer.includes("\n")) {
      const newlineIndex = this.messageBuffer.indexOf("\n");
      const message = this.messageBuffer.slice(0, newlineIndex);
      this.messageBuffer = this.messageBuffer.slice(newlineIndex + 1);

      if (message.trim()) {
        try {
          const parsed: JSONRPCMessage = JSON.parse(message);
          this.handleMessage(parsed);
        } catch (e) {
          this.emit("parseError", message);
        }
      }
    }
  }

  private handleMessage(message: JSONRPCMessage): void {
    if (message.id !== undefined && this.pendingRequests.has(message.id)) {
      const pending = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);

      if (message.error) {
        pending.reject(message.error);
      } else {
        pending.resolve(message.result);
      }
    } else if (message.method) {
      this.emit("notification", message.method, message.params);
    }
  }

  private send(message: JSONRPCMessage): void {
    if (!this.process?.stdin) return;

    const data = JSON.stringify(message) + "\n";
    this.process.stdin.write(data);
  }

  private async sendRequest<T>(method: string, params?: any): Promise<T> {
    const id = ++this.requestId;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      this.send({
        jsonrpc: "2.0",
        id,
        method,
        params,
      });

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request ${method} timed out`));
        }
      }, 30000);
    });
  }

  private sendNotification(method: string, params?: any): void {
    this.send({
      jsonrpc: "2.0",
      method,
      params,
    });
  }

  private async initialize(): Promise<boolean> {
    try {
      const result = await this.sendRequest<any>("initialize", {
        processId: process.pid,
        rootUri: `file://${this.rootPath}`,
        capabilities: {
          workspace: {
            applyEdit: true,
            workspaceEdit: { documentChanges: true },
            didChangeConfiguration: { dynamicRegistration: true },
            didChangeWatchedFiles: { dynamicRegistration: true },
            symbol: { dynamicRegistration: true },
            executeCommand: { dynamicRegistration: true },
          },
          textDocument: {
            synchronization: {
              dynamicRegistration: true,
              willSave: true,
              willSaveWaitUntil: true,
              didSave: true,
              didOpen: true,
              didChange: true,
              didClose: true,
            },
            completion: {
              dynamicRegistration: true,
              completionItem: {
                snippetSupport: true,
                commitCharactersSupport: true,
              },
            },
            hover: { dynamicRegistration: true },
            signatureHelp: { dynamicRegistration: true },
            references: { dynamicRegistration: true },
            documentHighlight: { dynamicRegistration: true },
            documentSymbol: { dynamicRegistration: true },
            formatting: { dynamicRegistration: true },
            rangeFormatting: { dynamicRegistration: true },
            onTypeFormatting: { dynamicRegistration: true },
            definition: { dynamicRegistration: true },
            typeDefinition: { dynamicRegistration: true },
            implementation: { dynamicRegistration: true },
            codeAction: { dynamicRegistration: true },
            codeLens: { dynamicRegistration: true },
            rename: { dynamicRegistration: true },
          },
          window: {
            workDoneProgress: true,
          },
        },
        workspaceFolders: [{ uri: `file://${this.rootPath}`, name: "workspace" }],
      });

      this.initialized = true;
      this.sendNotification("initialized", {});

      return true;
    } catch (error) {
      this.emit("error", `Initialization failed: ${error}`);
      return false;
    }
  }

  async shutdown(): Promise<void> {
    if (this.initialized) {
      try {
        await this.sendRequest("shutdown");
        this.sendNotification("exit");
      } catch (e) {
        // Ignore shutdown errors
      }
    }
    this.disconnect();
  }

  disconnect(): void {
    if (this.cleanupFn) {
      this.cleanupFn();
      this.cleanupFn = null;
    }
    this.process = null;
  }

  isConnected(): boolean {
    return this.process !== null && this.initialized;
  }

  async gotoDefinition(uri: string, position: { line: number; character: number }) {
    return this.sendRequest("textDocument/definition", {
      textDocument: { uri },
      position,
    });
  }

  async findReferences(uri: string, position: { line: number; character: number }) {
    return this.sendRequest("textDocument/references", {
      textDocument: { uri },
      position,
      context: { includeDeclaration: true },
    });
  }

  async hover(uri: string, position: { line: number; character: number }) {
    return this.sendRequest("textDocument/hover", {
      textDocument: { uri },
      position,
    });
  }

  async documentSymbol(uri: string) {
    return this.sendRequest("textDocument/documentSymbol", {
      textDocument: { uri },
    });
  }

  async workspaceSymbol(query: string) {
    return this.sendRequest("workspace/symbol", {
      query,
    });
  }

  async gotoImplementation(uri: string, position: { line: number; character: number }) {
    return this.sendRequest("textDocument/implementation", {
      textDocument: { uri },
      position,
    });
  }

  async callHierarchy(uri: string, position: { line: number; character: number }) {
    return this.sendRequest("textDocument/prepareCallHierarchy", {
      textDocument: { uri },
      position,
    });
  }

  didOpenTextDocument(uri: string, languageId: string, content: string) {
    this.sendNotification("textDocument/didOpen", {
      textDocument: {
        uri,
        languageId,
        text: content,
        version: 1,
      },
    });
  }

  didChangeTextDocument(
    uri: string,
    content: string,
    version: number = 1
  ) {
    this.sendNotification("textDocument/didChange", {
      textDocument: { uri, version },
      contentChanges: [{ text: content }],
    });
  }

  didCloseTextDocument(uri: string) {
    this.sendNotification("textDocument/didClose", {
      textDocument: { uri },
    });
  }
}

export function createClient(serverId: string): LSPClient {
  return new LSPClient(serverId);
}
