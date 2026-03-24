/**
 * LSP 服务器定义测试
 */

import { servers, getServer, getAllServers, getServersByExtension } from "../../src/lsp/server";

describe("LSP Servers", () => {
  test("servers - 应包含所有默认服务器", () => {
    expect(servers.typescript).toBeDefined();
    expect(servers.python).toBeDefined();
    expect(servers.java).toBeDefined();
    expect(servers.cpp).toBeDefined();
  });

  test("getServer - 应正确查找服务器", () => {
    const ts = getServer("typescript");
    expect(ts).toBeDefined();
    expect(ts?.name).toBe("TypeScript");
  });

  test("getServer - 不存在的服务器应返回 undefined", () => {
    const result = getServer("nonexistent");
    expect(result).toBeUndefined();
  });

  test("getServersByExtension - 应正确查找服务器", () => {
    const result = getServersByExtension(".py");
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]?.id).toBe("python");
  });

  test("getServersByExtension - .ts 应返回 typescript 服务器", () => {
    const result = getServersByExtension(".ts");
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(s => s.id === "typescript")).toBe(true);
  });

  test("typescript - 应包含正确的文件扩展名", () => {
    expect(servers.typescript.extensions).toContain(".ts");
    expect(servers.typescript.extensions).toContain(".tsx");
  });

  test("java - 应包含 Java 特定配置", () => {
    expect(servers.java.requiresJava).toBe(true);
    expect(servers.java.minJavaVersion).toBe(21);
  });

  test("getAllServers - 应返回所有服务器", () => {
    const all = getAllServers();
    expect(all.length).toBeGreaterThan(10);
  });

  test("rust - 应标记为需要系统二进制", () => {
    expect(servers.rust.requiresSystemBinary).toBe(true);
  });
});
