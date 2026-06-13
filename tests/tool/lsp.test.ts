/**
 * LspTool 测试
 */

import { lspTool } from "../../src/core/tools/provider/lsp.js";
import { ToolContext } from "../../src/core/tools/tool.types.js";

const mockContext: ToolContext = {
  sessionId: "test-session",
  workDir: "/tmp/test",
};

describe("LspTool", () => {
  test("lspTool - 应有正确的名称", () => {
    expect(lspTool.name).toBe("lsp");
  });

  test("lspTool - 应有描述", () => {
    expect(lspTool.description).toContain("LSP");
  });

  test("lspTool - 应有参数定义", () => {
    expect(lspTool.parameters).toHaveProperty("type", "object");
    expect(lspTool.parameters.properties).toHaveProperty("action");
  });

  test("lspTool.execute - 缺少 filePath 应返回错误", async () => {
    const result = await lspTool.execute({ action: "hover" } as any, mockContext);
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test("lspTool.execute - workspaceSymbol 缺少 query 应返回错误", async () => {
    const result = await lspTool.execute({
      action: "workspaceSymbol"
    } as any, mockContext);
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test("lspTool.execute - 不存在的扩展名应返回错误", async () => {
    const result = await lspTool.execute({
      action: "gotoDefinition",
      filePath: "/path/to/file.unknown",
      line: 1,
      character: 0
    } as any, mockContext);
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
