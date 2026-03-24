/**
 * LSP API 测试
 */

import express, { Express } from "express";
import { lspRouter } from "../../src/api/lsp";

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

describe("LSP API", () => {
  let app: Express;
  let server: any;

  beforeAll((done) => {
    app = express();
    app.use(express.json());
    app.use("/api/lsp", lspRouter);
    server = app.listen(0, done);
  });

  afterAll((done) => {
    server.close(done);
  });

  test("GET /api/lsp/servers - 应返回所有服务器", async () => {
    const port = server.address().port;
    const response = await fetch(`http://localhost:${port}/api/lsp/servers`);

    expect(response.status).toBe(200);
    const body = await response.json() as ApiResponse;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);

    const ts = body.data.find((s: any) => s.id === "typescript");
    expect(ts).toHaveProperty("enabled");
    expect(ts).toHaveProperty("status");
  });

  test("PUT /api/lsp/servers/:id - 应更新配置", async () => {
    const port = server.address().port;
    const response = await fetch(`http://localhost:${port}/api/lsp/servers/typescript`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false })
    });

    expect(response.status).toBe(200);
    const body = await response.json() as ApiResponse;
    expect(body.success).toBe(true);
  });

  test("POST /api/lsp/servers/:id/start - 无效服务器应返回错误", async () => {
    const port = server.address().port;
    const response = await fetch(`http://localhost:${port}/api/lsp/servers/nonexistent/start`, {
      method: "POST"
    });

    expect(response.status).toBe(400);
  });

  test("POST /api/lsp/servers/:id/stop - 应正常处理", async () => {
    const port = server.address().port;
    const response = await fetch(`http://localhost:${port}/api/lsp/servers/typescript/stop`, {
      method: "POST"
    });

    expect(response.status).toBe(200);
  });

  test("GET /api/lsp/servers/:id/status - 应返回状态", async () => {
    const port = server.address().port;
    const response = await fetch(`http://localhost:${port}/api/lsp/servers/typescript/status`);

    expect(response.status).toBe(200);
    const body = await response.json() as ApiResponse;
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("status");
  });

  test("GET /api/lsp/java-version - 应返回 Java 版本信息", async () => {
    const port = server.address().port;
    const response = await fetch(`http://localhost:${port}/api/lsp/java-version`);

    expect(response.status).toBe(200);
    const body = await response.json() as ApiResponse;
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("valid");
    expect(body.data).toHaveProperty("error");
  });
});
