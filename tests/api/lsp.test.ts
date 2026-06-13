/**
 * LSP API 测试（适配新路由规范: GET/POST only, query/body params, 无 URL path params）
 */

import express, { Express } from "express";
import { GET as serversLsp } from "../../src/gateway/api/lsp/servers_lsp.js";
import { POST as updateLsp } from "../../src/gateway/api/lsp/update_lsp.js";
import { POST as startLsp } from "../../src/gateway/api/lsp/start_lsp.js";
import { POST as stopLsp } from "../../src/gateway/api/lsp/stop_lsp.js";
import { GET as statusLsp } from "../../src/gateway/api/lsp/status_lsp.js";
import { GET as javaVersionLsp } from "../../src/gateway/api/lsp/java_version_lsp.js";

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
    // 手动注册新路由规范的路由（GET query, POST body）
    app.get("/api/lsp/servers_lsp", serversLsp);
    app.post("/api/lsp/update_lsp", updateLsp);
    app.post("/api/lsp/start_lsp", startLsp);
    app.post("/api/lsp/stop_lsp", stopLsp);
    app.get("/api/lsp/status_lsp", statusLsp);
    app.get("/api/lsp/java_version_lsp", javaVersionLsp);
    server = app.listen(0, done);
  });

  afterAll((done) => {
    server.close(done);
  });

  test("GET /api/lsp/servers_lsp - 应返回所有服务器", async () => {
    const port = server.address().port;
    const response = await fetch(`http://localhost:${port}/api/lsp/servers_lsp`);

    expect(response.status).toBe(200);
    const body = await response.json() as ApiResponse;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);

    const ts = body.data.find((s: any) => s.id === "typescript");
    expect(ts).toHaveProperty("enabled");
    expect(ts).toHaveProperty("status");
  });

  test("POST /api/lsp/update_lsp - 应更新配置", async () => {
    const port = server.address().port;
    const response = await fetch(`http://localhost:${port}/api/lsp/update_lsp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "typescript", enabled: false })
    });

    expect(response.status).toBe(200);
    const body = await response.json() as ApiResponse;
    expect(body.success).toBe(true);
  });

  test("POST /api/lsp/start_lsp - 无效服务器应返回错误", async () => {
    const port = server.address().port;
    const response = await fetch(`http://localhost:${port}/api/lsp/start_lsp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "nonexistent" })
    });

    expect(response.status).toBe(400);
  });

  test("POST /api/lsp/stop_lsp - 应正常处理", async () => {
    const port = server.address().port;
    const response = await fetch(`http://localhost:${port}/api/lsp/stop_lsp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "typescript" })
    });

    expect(response.status).toBe(200);
  });

  test("GET /api/lsp/status_lsp - 应返回状态", async () => {
    const port = server.address().port;
    const response = await fetch(`http://localhost:${port}/api/lsp/status_lsp?id=typescript`);

    expect(response.status).toBe(200);
    const body = await response.json() as ApiResponse;
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("status");
  });

  test("GET /api/lsp/java_version_lsp - 应返回 Java 版本信息", async () => {
    const port = server.address().port;
    const response = await fetch(`http://localhost:${port}/api/lsp/java_version_lsp`);

    expect(response.status).toBe(200);
    const body = await response.json() as ApiResponse;
    expect(body.success).toBe(true);
  });
});
