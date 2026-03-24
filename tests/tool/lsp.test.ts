/**
 * LspTool 测试
 */

import { lspTool } from "../../src/tool/lsp";

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

  test("lspTool.execute - 缺少 action 应返回错误", async () => {
    const result = await lspTool.execute({} as any);
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty("error");
  });

  test("lspTool.execute - workspaceSymbol 缺少 query 应返回错误", async () => {
    const result = await lspTool.execute({
      action: "workspaceSymbol"
    } as any);
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty("error");
  });

  test("lspTool.execute - 不存在的扩展名应返回错误", async () => {
    const result = await lspTool.execute({
      action: "gotoDefinition",
      filePath: "/path/to/file.unknown",
      line: 1,
      character: 0
    } as any);
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty("error");
  });
});
