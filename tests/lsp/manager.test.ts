/**
 * LSP 管理器测试
 */

import * as fs from "fs";
import * as path from "path";
import { DbService } from "../../src/modules/db/db.service";
import { LSPManager } from "../../src/lsp/manager";
import { lspServerTable, defaultLSPServers, insertLSPServerSQL } from "../../src/lsp/sql";

describe("LSPManager", () => {
  let testDbPath: string;
  let originalDbPath: string;

  beforeEach(() => {
    testDbPath = path.join(__dirname, `test-lsp-${Date.now()}.db`);
    originalDbPath = path.join(process.env.HOME || ".", ".txcode", "data.db");

    if (!fs.existsSync(path.dirname(testDbPath))) {
      fs.mkdirSync(path.dirname(testDbPath), { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  test("getServerPath - 应返回包含服务器 ID 的路径", () => {
    const serverPath = LSPManager.getServerPath("typescript");
    expect(serverPath).toContain("typescript");
  });

  test("checkJavaVersion - 应返回版本检查结果", async () => {
    const result = await LSPManager.checkJavaVersion();
    expect(typeof result.valid).toBe("boolean");
    expect(result).toHaveProperty("error");
  });

  test("stopServer - 不存在的服务器应正常处理", async () => {
    await expect(LSPManager.stopServer("nonexistent")).resolves.toBeUndefined();
  });
});
