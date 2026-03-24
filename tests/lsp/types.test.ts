/**
 * LSP 类型测试
 */

import { LSPServerStatus, LSPServerInfo, LSPConfig } from "../../src/lsp/types";

describe("LSP Types", () => {
  test("LSPServerStatus 枚举值正确", () => {
    expect(LSPServerStatus.Stopped).toBe("stopped");
    expect(LSPServerStatus.Running).toBe("running");
    expect(LSPServerStatus.Downloading).toBe("downloading");
    expect(LSPServerStatus.DownloadFailed).toBe("download_failed");
    expect(LSPServerStatus.NotFound).toBe("not_found");
    expect(LSPServerStatus.VersionError).toBe("version_error");
  });

  test("LSPServerInfo 类型检查", () => {
    const server: LSPServerInfo = {
      id: "typescript",
      name: "TypeScript",
      extensions: [".ts", ".tsx"],
      binaryName: "tsserver",
      rootMarkers: ["package.json"]
    };
    
    expect(server.id).toBe("typescript");
    expect(server.extensions).toContain(".ts");
  });

  test("LSPConfig 类型检查", () => {
    const config: LSPConfig = {
      enabled: true,
      autoStart: false
    };
    
    expect(config.enabled).toBe(true);
    expect(config.autoStart).toBe(false);
  });
});
