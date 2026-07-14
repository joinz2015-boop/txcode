"""Test tool call executing notification via WebSocket"""
import asyncio
import json
import aiohttp
import time

BASE = "http://localhost:40001"
WS_URL = "ws://localhost:40001/ws/code"

async def main():
    # 1. Create session
    async with aiohttp.ClientSession() as s:
        r = await s.post(f"{BASE}/api/session/create_session", json={"title": "test_tool_notify"})
        data = await r.json()
        sid = data["data"]["id"]
        print(f"[+] Session created: {sid}")

    # 2. Connect WebSocket
    async with aiohttp.ClientSession() as s:
        ws = await s.ws_connect(WS_URL)
        print("[+] WebSocket connected")

        # Send chat to trigger tool call
        chat_msg = {
            "type": "chat",
            "data": {
                "message": "run: sleep 15 && echo done - use bash tool",
                "sessionId": sid,
            }
        }
        await ws.send_json(chat_msg)
        print(f"[>] Sent chat message")

        t0 = time.time()
        executing_seen = False

        async for msg in ws:
            if msg.type == aiohttp.WSMsgType.TEXT:
                try:
                    payload = json.loads(msg.data)
                except:
                    continue

                msg_type = payload.get("type", "")
                data = payload.get("data", {})

                elapsed = time.time() - t0
                ts = f"[{elapsed:5.1f}s]"

                if msg_type == "step":
                    tcs = data.get("toolCalls", [])
                    has_exec = any(tc.get("status") == "executing" for tc in tcs)
                    if has_exec:
                        executing_seen = True
                        print(f"{ts} EXECUTING: {json.dumps(tcs, indent=2)}")
                    else:
                        print(f"{ts} step    : {json.dumps(tcs, indent=2)}")
                elif msg_type == "done":
                    print(f"{ts} DONE: {data.get('response','')[:80]}")
                    break
                elif msg_type == "error":
                    print(f"{ts} ERROR: {data.get('error','')}")
                    break
                elif msg_type == "stopped":
                    print(f"{ts} STOPPED")
                    break

        await ws.close()

    print(f"\n[✓] Test complete. executing_seen={executing_seen}")

asyncio.run(main())
