import { defineConfig } from 'vite';
import vue2 from '@vitejs/plugin-vue2';
import { createServer } from 'net';
import { resolve } from 'path';

async function findAvailablePort(startPort) {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(startPort, () => {
      server.close(() => resolve(startPort));
    });
    server.on('error', async () => {
      const nextPort = await findAvailablePort(startPort + 1);
      resolve(nextPort);
    });
  });
}

export default defineConfig(async () => {
  const port = await findAvailablePort(3000);
  
  return {
    plugins: [vue2()],
    base: '/',
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    },
    server: {
      port,
      proxy: {
        '/api': {
          target: 'http://localhost:40000',
          changeOrigin: true,
        },
        '/ws': {
          target: 'ws://localhost:40000',
          ws: true,
        },
      },
    },
  };
});