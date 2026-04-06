import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:40001/ws/code');

ws.on('open', () => {
  console.log('Connected to WebSocket');
  
  const sessionId = 'test-compact-' + Date.now();
  
  const msg = {
    type: 'chat',
    data: {
      message: '请详细介绍 txcode 的所有功能，包括代码读写、搜索、调试、重构、命令执行等，至少写500字',
      sessionId,
    }
  };
  
  console.log('\n发送长消息以测试压缩功能...');
  ws.send(JSON.stringify(msg));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  
  switch (msg.type) {
    case 'connected':
      console.log('[服务器]', msg.message);
      break;
    case 'step':
      console.log('[Step]', msg.data.iteration, '-', msg.data.toolCalls?.[0]?.function?.name || '(text)');
      break;
    case 'compact':
      console.log('\n========== [Compact 触发!] ==========');
      console.log('beforeTokens:', msg.data.beforeTokens);
      console.log('afterTokens:', msg.data.afterTokens);
      if (msg.data.summary) {
        console.log('summary:', msg.data.summary.slice(0, 200) + '...');
      }
      console.log('========================================\n');
      break;
    case 'done':
      console.log('[Done]', msg.data.success ? 'success' : 'failed');
      console.log('[Response 长度]', msg.data.response?.length || 0);
      if (msg.data.response) {
        console.log('[Response 前100字]', msg.data.response.slice(0, 100));
      }
      setTimeout(() => {
        console.log('\n测试完成，关闭连接');
        ws.close();
      }, 1000);
      break;
    case 'error':
      console.error('[Error]', msg.error);
      break;
    case 'stopped':
      console.log('[Stopped]', msg.reason);
      break;
    case 'pong':
      break;
    default:
      if (msg.type !== 'running_sessions') {
        console.log('[消息]', msg.type);
      }
  }
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err);
});

ws.on('close', () => {
  console.log('Disconnected');
  process.exit(0);
});

setTimeout(() => {
  console.log('\n测试超时，关闭连接');
  ws.close();
  process.exit(0);
}, 180000);
