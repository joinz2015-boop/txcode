import { chromium, type Browser, type Page } from 'playwright';
import * as net from 'net';
import * as http from 'http';
import * as fs from 'fs';

const CDP_PORT = parseInt(process.env.CDP_PORT || '9222', 10);
const STANDALONE_MODE = process.env.STANDALONE === '1';

async function connectCDP(port: number): Promise<Browser> {
  console.log(`[TestCDP] 尝试连接 CDP: http://localhost:${port} ...`);
  try {
    const browser = await chromium.connectOverCDP(`http://localhost:${port}`, { timeout: 5000 });
    console.log('[TestCDP] CDP 连接成功');
    return browser;
  } catch (e: any) {
    console.error(`[TestCDP] CDP 连接失败: ${e.message}`);
    throw e;
  }
}

function probePort(port: number): Promise<{ reachable: boolean; error: string | null }> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(3000);

    socket.on('connect', () => {
      socket.destroy();
      resolve({ reachable: true, error: null });
    });

    socket.on('error', (err: NodeJS.ErrnoException) => {
      socket.destroy();
      resolve({ reachable: false, error: err.code || err.message });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ reachable: false, error: 'TIMEOUT' });
    });

    socket.connect(port, 'localhost');
  });
}

function httpProbe(port: number): Promise<{ statusCode: number | null; error: string | null; body: string | null }> {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/json/version`, { timeout: 3000 }, (res) => {
      let body = '';
      res.on('data', (chunk: string) => { body += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode || null, error: null, body });
      });
    });

    req.on('error', (err: NodeJS.ErrnoException) => {
      resolve({ statusCode: null, error: err.code || err.message, body: null });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ statusCode: null, error: 'TIMEOUT', body: null });
    });
  });
}

async function diagnoseCDP(port: number): Promise<void> {
  console.log('\n========== CDP 端口诊断 ==========');
  console.log(`目标端口: ${port}`);

  console.log('\n[Step1] 端口监听探测 (net.connect)...');
  const portResult = await probePort(port);

  if (!portResult.reachable) {
    console.log(`  结果: 端口未监听 (${portResult.error})`);
    console.log('  建议:');
    console.log(`    - 请启动 Electron 应用并确保开启了 --remote-debugging-port=${port}`);
    console.log('    - 或设置环境变量 STANDALONE=1 使用独立浏览器模式');
    console.log('===================================\n');
    return;
  }

  console.log('  结果: 端口可达 (LISTENING)');

  console.log('\n[Step2] HTTP 探测 (/json/version)...');
  const httpResult = await httpProbe(port);

  if (httpResult.error === 'TIMEOUT') {
    console.log('  结果: 请求超时 - 僵尸端口（端口占用但进程无响应）');
    console.log('  建议:');
    console.log(`    - 端口 ${port} 被占用但进程无响应，请检查占用该端口的进程`);
    console.log('    - 运行: netstat -ano | findstr :' + port);
    console.log('    - 尝试终止占用进程后重启 Electron 应用');
    console.log('    - 或设置环境变量 STANDALONE=1 使用独立浏览器模式');
    console.log('===================================\n');
    return;
  }

  if (httpResult.error) {
    console.log(`  结果: 连接异常 (${httpResult.error})`);
    console.log('  建议:');
    console.log(`    - 端口 ${port} 可达但 HTTP 请求失败，可能非 CDP 服务`);
    console.log('    - 检查是否有其他服务占用了该端口');
    console.log('    - 运行: netstat -ano | findstr :' + port);
    console.log('===================================\n');
    return;
  }

  if (httpResult.statusCode === 200) {
    console.log('  结果: 200 OK - CDP 服务响应正常');
    console.log(`  响应: ${httpResult.body}`);
    console.log('  说明: HTTP 探测通过但 Playwright connectOverCDP 连接失败，可能是 Playwright 版本兼容问题');
    console.log('  建议: 检查 Playwright 版本是否与 Electron Chromium 版本匹配');
    console.log('===================================\n');
    return;
  }

  console.log(`  结果: HTTP ${httpResult.statusCode} - 非 CDP 服务占用端口`);
  console.log('  建议:');
  console.log(`    - 端口 ${port} 被非 CDP 服务占用，请更换端口或关闭占用服务`);
  console.log('    - 运行: netstat -ano | findstr :' + port);
  console.log('===================================\n');
}

function checkPlaywrightInstalled(): boolean {
  try {
    const execPath = chromium.executablePath();
    console.log(`[TestCDP] Playwright Chromium 路径: ${execPath}`);
    const exists = fs.existsSync(execPath);
    if (!exists) {
      console.error(`[TestCDP] Chromium 可执行文件不存在: ${execPath}`);
      console.error('[TestCDP] 请运行: npx playwright install chromium');
    }
    return exists;
  } catch (e: any) {
    console.error(`[TestCDP] 无法获取 Chromium 路径: ${e.message}`);
    console.error('[TestCDP] 请运行: npx playwright install chromium');
    return false;
  }
}

async function launchStandalone(): Promise<{ browser: Browser; page: Page }> {
  if (!checkPlaywrightInstalled()) {
    console.error('[TestCDP] Playwright Chromium 未安装，无法启动独立浏览器');
    process.exit(1);
  }

  console.log('[TestCDP] 启动独立 Chromium 浏览器 ...');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  console.log('[TestCDP] 独立浏览器已启动');
  return { browser, page };
}

function isExcludedUrl(url: string): boolean {
  return url === 'about:blank'
    || url.startsWith('chrome://')
    || url.startsWith('devtools://')
    || url.startsWith('file://')
    || url.startsWith('chrome-extension://');
}

type PageMode = 'guest' | 'host' | 'normal';

async function detectPageMode(page: Page): Promise<PageMode> {
  const electronId = await page.evaluate(() => {
    return (window as any).__ELECTRON_WEBVIEW_ID__;
  }).catch(() => null);
  if (electronId) return 'guest';

  const hasWebview = await page.evaluate(() => {
    try {
      return !!document.querySelector('webview');
    } catch { return false; }
  }).catch(() => false);
  if (hasWebview) return 'host';

  return 'normal';
}

async function findTargetPage(browser: Browser): Promise<{ page: Page; mode: PageMode }> {
  const contexts = browser.contexts();
  console.log(`[TestCDP] 找到 ${contexts.length} 个 BrowserContext`);

  for (const ctx of contexts) {
    const pages = ctx.pages();
    console.log(`[TestCDP]   Context 有 ${pages.length} 个页面`);
    for (const page of pages) {
      const url = page.url();
      console.log(`[TestCDP]     Page: ${url}`);
    }
  }

  // 优先匹配 webview 内部页面（独立 CDP target）
  for (const ctx of contexts) {
    const pages = ctx.pages();
    for (const page of pages) {
      const mode = await detectPageMode(page);
      if (mode === 'guest') {
        console.log(`[TestCDP] 找到 webview 内部页面: ${page.url()}`);
        return { page, mode: 'guest' };
      }
    }
  }

  // 匹配包含 webview 元素的宿主页面（测试窗口）
  for (const ctx of contexts) {
    const pages = ctx.pages();
    for (const page of pages) {
      const mode = await detectPageMode(page);
      if (mode === 'host') {
        console.log(`[TestCDP] 找到 webview 宿主页面: ${page.url()}`);
        return { page, mode: 'host' };
      }
    }
  }

  // 匹配其他非排除的 HTTP/HTTPS 页面
  for (const ctx of contexts) {
    const pages = ctx.pages();
    for (const page of pages) {
      const url = page.url();
      if (!isExcludedUrl(url)) {
        console.log(`[TestCDP] 使用页面: ${url}`);
        return { page, mode: 'normal' };
      }
    }
  }

  // 无可用页面，尝试创建新页面
  try {
    const ctx = contexts[0] || await browser.newContext();
    const page = await ctx.newPage();
    console.log('[TestCDP] 创建了新页面');
    return { page, mode: 'normal' };
  } catch (e: any) {
    throw new Error(
      `未找到 webview 或可用页面，且创建新页面失败: ${e.message}\n` +
      '请确保 Electron 应用中已打开 webview（测试页面），或使用独立模式: set STANDALONE=1 && npx tsx scripts/test-cdp.ts'
    );
  }
}

async function navigateHostWebview(page: Page, targetUrl: string): Promise<void> {
  await page.evaluate((url) => {
    const wv = document.querySelector('webview') as any;
    if (wv && wv.loadURL) {
      wv.loadURL(url);
    } else {
      throw new Error('页面中未找到可用的 webview 元素');
    }
  }, targetUrl);

  // 等待 webview 加载完成（URL 不再为 about:blank）
  await page.waitForFunction(() => {
    const wv = document.querySelector('webview') as any;
    return wv && wv.getURL && wv.getURL() !== 'about:blank';
  }, { timeout: 30000 }).catch(() => {
    console.log('[TestCDP] 等待 webview 加载超时，继续...');
  });
}

async function getHostWebviewInfo(page: Page): Promise<{ title: string; url: string }> {
  const info = await page.evaluate(() => {
    const wv = document.querySelector('webview') as any;
    return {
      title: wv?.getTitle?.() || document.title,
      url: wv?.getURL?.() || window.location.href,
    };
  });
  return info;
}

async function main() {
  const targetUrl = process.argv[2] || 'https://www.baidu.com';
  console.log(`[TestCDP] 目标 URL: ${targetUrl}`);
  console.log(`[TestCDP] 模式: ${STANDALONE_MODE ? '独立浏览器' : `CDP (端口 ${CDP_PORT})`}`);

  let browser: Browser;
  let page: Page;
  let pageMode: PageMode = 'normal';

  if (STANDALONE_MODE) {
    const result = await launchStandalone();
    browser = result.browser;
    page = result.page;
  } else {
    try {
      browser = await connectCDP(CDP_PORT);
      const found = await findTargetPage(browser);
      page = found.page;
      pageMode = found.mode;
    } catch (e: any) {
      console.error(`[TestCDP] 错误: ${e.message}`);
      if (e.message?.includes('未找到 webview') || e.message?.includes('创建新页面失败')) {
        process.exit(1);
      }
      await diagnoseCDP(CDP_PORT);
      process.exit(1);
    }
  }

  console.log(`[TestCDP] 使用页面: ${page.url()} (mode: ${pageMode})`);
  console.log(`[TestCDP] 导航到: ${targetUrl} ...`);

  if (pageMode === 'host') {
    await navigateHostWebview(page, targetUrl);
  } else {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }

  let title: string;
  let finalUrl: string;
  if (pageMode === 'host') {
    const info = await getHostWebviewInfo(page);
    title = info.title;
    finalUrl = info.url;
  } else {
    title = await page.title();
    finalUrl = page.url();
  }

  console.log(`[TestCDP] 页面标题: ${title}`);
  console.log(`[TestCDP] 当前 URL: ${finalUrl}`);

  const screenshotPath = '.txcode/test-cdp-screenshot.png';
  await page.screenshot({ path: screenshotPath, type: 'png', fullPage: false });
  console.log(`[TestCDP] 截图已保存: ${screenshotPath}`);

  console.log('[TestCDP] 测试成功!');

  if (STANDALONE_MODE) {
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
    console.log('[TestCDP] 独立浏览器已关闭');
  } else {
    await browser.close();
    console.log('[TestCDP] CDP 连接已关闭');
  }
}

main().catch((e) => {
  console.error('[TestCDP] 测试失败:', e.message);
  process.exit(1);
});
