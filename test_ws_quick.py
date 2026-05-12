import asyncio
import websockets
import sys

async def test():
    for path in ['/ws/code', '/ws/caller']:
        try:
            async with websockets.connect(f'ws://localhost:40000{path}', close_timeout=3) as ws:
                msg = await asyncio.wait_for(ws.recv(), timeout=5)
                print(f'{path} OK: {msg[:200]}')
        except Exception as e:
            print(f'{path} FAIL: {type(e).__name__}: {e}')

asyncio.run(test())
