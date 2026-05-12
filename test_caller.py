"""
CallerAgent WebSocket 测试脚本
模拟 A 系统连接 /ws/caller，注册扩展工具，发起对话
"""
import asyncio
import json
import sys
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler

# ============== 回调 HTTP 服务器 ==============
tool_responses = {
    "query_database": {"success": True, "output": "查询结果: 找到 42 条记录, 表 users 有 3 个字段"},
    "send_email": {"success": True, "output": "邮件已发送给 admin@example.com"},
    "deploy_app": {"success": True, "output": "应用已部署到生产环境, 版本 v2.1.0"},
}

class ToolCallbackHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        try:
            data = json.loads(body)
            tool_name = data.get('toolName', '')
            print(f"\n[回调] 收到工具调用: {tool_name}")
            print(f"[回调] 参数: {json.dumps(data.get('arguments', {}), ensure_ascii=False)}")
            print(f"[回调] sessionId: {data.get('sessionId', '')}")

            resp = tool_responses.get(tool_name, {"success": False, "error": f"未知工具: {tool_name}"})
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(resp, ensure_ascii=False).encode())
            print(f"[回调] 返回: {json.dumps(resp, ensure_ascii=False)}")
        except Exception as e:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode())

    def log_message(self, format, *args):
        pass  # 抑制 HTTP 日志

def start_callback_server(port=18765):
    server = HTTPServer(('127.0.0.1', port), ToolCallbackHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    print(f"[回调服务器] 启动在 http://127.0.0.1:{port}")
    return server

# ============== WebSocket 客户端 ==============
async def test_caller():
    import websockets

    # 启动回调 HTTP 服务器
    callback_port = 18765
    server = start_callback_server(callback_port)

    ws_url = "ws://localhost:40000/ws/caller"
    print(f"[WS] 连接到 {ws_url} ...")

    async with websockets.connect(ws_url) as ws:
        print("[WS] 已连接")

        # 等待 connected 消息
        msg = await asyncio.wait_for(ws.recv(), timeout=5)
        print(f"[WS] 收到: {msg}")

        # ===== 1. 发送 init =====
        init_msg = {
            "type": "init",
            "data": {
                "callbackUrl": f"http://127.0.0.1:{callback_port}/tool-call",
                "title": "测试会话",
                "projectPath": "E:/ai/txcode",
                "tools": [
                    {
                        "name": "query_database",
                        "description": "查询数据库，执行 SQL 并返回结果",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "sql": {"type": "string", "description": "要执行的 SQL 查询语句"},
                                "db": {"type": "string", "description": "数据库名称", "enum": ["mysql", "postgres", "sqlite"]}
                            },
                            "required": ["sql"]
                        }
                    },
                    {
                        "name": "deploy_app",
                        "description": "部署应用到指定环境",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "env": {"type": "string", "description": "部署环境", "enum": ["staging", "production"]},
                                "version": {"type": "string", "description": "版本号"}
                            },
                            "required": ["env", "version"]
                        }
                    }
                ],
                "systemPrompt": "这是一个测试环境，当用户要求查询数据时，请使用 query_database 工具"
            }
        }
        print(f"\n[WS] → init (2个扩展工具)")
        await ws.send(json.dumps(init_msg, ensure_ascii=False))

        # 等待 init_ready 或 error
        msg = await asyncio.wait_for(ws.recv(), timeout=10)
        print(f"[WS] 收到: {msg}")
        data = json.loads(msg)
        if data.get("type") == "error":
            print(f"\n[失败] init 失败: {data.get('error')}")
            return

        session_id = data.get("data", {}).get("sessionId", "")
        print(f"\n[成功] sessionId: {session_id}, 工具总数: {data.get('data', {}).get('toolsCount', 0)}")

        # ===== 2. 发送 chat =====
        chat_msg = {
            "type": "chat",
            "data": {
                "sessionId": session_id,
                "message": "请使用 query_database 工具查询 users 表的所有数据",
            }
        }
        print(f"\n[WS] → chat")
        await ws.send(json.dumps(chat_msg, ensure_ascii=False))

        # 接收响应（step / tool_call / done / error）
        try:
            while True:
                msg = await asyncio.wait_for(ws.recv(), timeout=120)
                data = json.loads(msg)
                msg_type = data.get("type", "")
                print(f"\n[WS] 收到: type={msg_type}")

                if msg_type == "step":
                    step_data = data.get("data", {})
                    print(f"  迭代: {step_data.get('iteration')}")
                    print(f"  思考: {(step_data.get('thought') or '')[:150]}")
                    for tc in (step_data.get("toolCalls") or []):
                        fn = tc.get("function", {})
                        print(f"  工具调用: {fn.get('name')}({fn.get('arguments', '')[:100]})")
                    for r in (step_data.get("results") or []):
                        status = "✓" if r.get("success") else "✗"
                        print(f"  结果 {status}: {(r.get('output') or r.get('error') or '')[:200]}")

                elif msg_type == "tool_call":
                    tc_data = data.get("data", {})
                    print(f"  [扩展工具调用] {tc_data.get('toolName')}")

                elif msg_type == "done":
                    done_data = data.get("data", {})
                    print(f"\n[DONE] 成功: {done_data.get('success')}")
                    print(f"  回复: {(done_data.get('response') or '')[:200]}")
                    print(f"  迭代次数: {done_data.get('iterations')}")
                    break

                elif msg_type == "error":
                    print(f"\n[错误] {data.get('error')}")
                    break

                elif msg_type in ("compact", "pong"):
                    pass  # 忽略

                else:
                    print(f"  内容: {json.dumps(data, ensure_ascii=False)[:300]}")
        except asyncio.TimeoutError:
            print("\n[超时] 等待响应超时")

    server.shutdown()
    print("\n[测试完成]")

if __name__ == "__main__":
    asyncio.run(test_caller())
