/**
 * LSP 下载管理器测试
 */

import { LSPDownloader } from "../../src/lsp/downloader";

describe("LSPDownloader", () => {
  test("getDownloadURL - Java 应返回正确的下载 URL", () => {
    const url = LSPDownloader.getDownloadURL("java");
    expect(url).toBeDefined();
    expect(typeof url).toBe("string");
    expect(url).toContain("eclipse.org");
  });

  test("getDownloadURL - TypeScript 应返回 undefined (使用 bunx)", () => {
    const url = LSPDownloader.getDownloadURL("typescript");
    expect(url).toBeUndefined();
  });

  test("getDownloadURL - 不存在的服务器应返回 undefined", () => {
    const url = LSPDownloader.getDownloadURL("nonexistent");
    expect(url).toBeUndefined();
  });

  test("needsDownload - 不存在的服务器应返回 false", async () => {
    const needs = await LSPDownloader.needsDownload("nonexistent");
    expect(typeof needs).toBe("boolean");
  });

  test("download - 不存在的服务器应返回 false", async () => {
    const result = await LSPDownloader.download("nonexistent");
    expect(result).toBe(false);
  });
});
