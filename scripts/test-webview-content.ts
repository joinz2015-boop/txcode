import { chromium, type Browser, type Page, type BrowserContext } from 'playwright';
import * as net from 'net';

const CDP_PORT = parseInt(process.env.CDP_PORT || '9222', 10);
const STANDALONE_MODE = process.env.STANDALONE === '1';

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

interface PageEntry {
  page: Page;
  contextIndex: number;
  url: string;
  mode: PageMode;
  webviewId: number | string | null;
  hasWebviewTag: boolean;
}

interface EnumerateResult {
  allPages: PageEntry[];
  guestPages: PageEntry[];
  hostPages: PageEntry[];
  normalPages: PageEntry[];
}

async function connectCDP(port: number): Promise<Browser> {
  console.log(`  CDP 地址: http://localhost:${port}`);
  try {
    const browser = await chromium.connectOverCDP(`http://localhost:${port}`, { timeout: 5000 });
    console.log('  结果: 连接成功');
    return browser;
  } catch (e: any) {
    console.log(`  结果: 连接失败 - ${e.message}`);
    throw e;
  }
}

async function enumerateAllPages(browser: Browser): Promise<EnumerateResult> {
  const allPages: PageEntry[] = [];
  const guestPages: PageEntry[] = [];
  const hostPages: PageEntry[] = [];
  const normalPages: PageEntry[] = [];
  const contexts = browser.contexts();

  console.log(`  BrowserContext 数量: ${contexts.length}\n`);

  for (let ci = 0; ci < contexts.length; ci++) {
    const ctx = contexts[ci];
    const pages = ctx.pages();
    console.log(`  ── Context #${ci} ── (${pages.length} 个页面) ──`);

    for (let pi = 0; pi < pages.length; pi++) {
      const page = pages[pi];
      const url = page.url();
      const mode = await detectPageMode(page);

      let webviewId: number | string | null = null;
      let hasWebviewTag = false;

      try {
        webviewId = await page.evaluate(() => (window as any).__ELECTRON_WEBVIEW_ID__ ?? null);
      } catch {}

      try {
        hasWebviewTag = await page.evaluate(() => !!document.querySelector('webview'));
      } catch {}

      const entry: PageEntry = {
        page,
        contextIndex: ci,
        url,
        mode,
        webviewId,
        hasWebviewTag,
      };

      allPages.push(entry);

      if (mode === 'guest') guestPages.push(entry);
      else if (mode === 'host') hostPages.push(entry);
      else normalPages.push(entry);

      const flag = mode === 'guest' ? ' [GUEST]' : mode === 'host' ? ' [HOST]' : ' [NORMAL]';
      const wvIdStr = webviewId !== null ? ` webviewId=${webviewId}` : '';
      const wvTagStr = hasWebviewTag ? ' hasWebview' : '';
      console.log(`    Page #${pi}:${flag}${wvIdStr}${wvTagStr}`);
      console.log(`      URL: ${url}`);
    }
    console.log('');
  }

  return { allPages, guestPages, hostPages, normalPages };
}

interface AttachStep {
  step: string;
  matched: boolean;
  detail: string;
  pageUrl?: string;
}

async function simulateAttachPage(browser: Browser): Promise<AttachStep[]> {
  const steps: AttachStep[] = [];
  const contexts = browser.contexts();

  // Step 1: 遍历 guest pages，匹配 __ELECTRON_WEBVIEW_ID__
  {
    let found = false;
    let detail = '';
    for (const ctx of contexts) {
      for (const page of ctx.pages()) {
        try {
          const mode = await detectPageMode(page);
          if (mode === 'guest') {
            const targetId = await page.evaluate(() => (window as any).__ELECTRON_WEBVIEW_ID__);
            found = true;
            detail = `找到 guest 页面，__ELECTRON_WEBVIEW_ID__=${targetId}, url=${page.url()}`;
            steps.push({ step: 'Step1 (guest ID 匹配)', matched: true, detail, pageUrl: page.url() });
            break;
          }
        } catch {}
      }
      if (found) break;
    }
    if (!found) {
      steps.push({ step: 'Step1 (guest ID 匹配)', matched: false, detail: '未找到任何 guest 页面' });
    }
  }

  // Step 1.5: 通过 host page 的 webview.getWebContentsId() 匹配 guest
  {
    let found = false;
    let detail = '';
    for (const ctx of contexts) {
      for (const hostPage of ctx.pages()) {
        try {
          const mode = await detectPageMode(hostPage);
          if (mode !== 'host') continue;
          const realWcId = await hostPage.evaluate(() => {
            const wv = document.querySelector('webview') as any;
            return wv?.getWebContentsId?.() ?? null;
          });
          if (realWcId === null) {
            detail = `host 页面存在但 webview.getWebContentsId() 返回 null, url=${hostPage.url()}`;
            continue;
          }
          let matchedGuest: Page | null = null;
          for (const ctx2 of contexts) {
            for (const guestPage of ctx2.pages()) {
              const guestId = await guestPage.evaluate(() => {
                return (window as any).__ELECTRON_WEBVIEW_ID__;
              }).catch(() => null);
              if (guestId === realWcId || guestId === String(realWcId)) {
                matchedGuest = guestPage;
                break;
              }
            }
            if (matchedGuest) break;
          }
          if (matchedGuest) {
            found = true;
            detail = `host.getWebContentsId()=${realWcId} 匹配到 guest(__ELECTRON_WEBVIEW_ID__=${await matchedGuest.evaluate(() => (window as any).__ELECTRON_WEBVIEW_ID__)})`;
            steps.push({ step: 'Step1.5 (host→guest 匹配)', matched: true, detail, pageUrl: matchedGuest.url() });
            break;
          } else {
            detail = `host.getWebContentsId()=${realWcId} 但未找到匹配的 guest 页面`;
          }
        } catch {}
      }
      if (found) break;
    }
    if (!found) {
      steps.push({ step: 'Step1.5 (host→guest 匹配)', matched: false, detail: detail || '无 host 页面或匹配失败' });
    }
  }

  // Step 2: 回退到 host page
  {
    let found = false;
    for (const ctx of contexts) {
      for (const page of ctx.pages()) {
        try {
          const mode = await detectPageMode(page);
          if (mode === 'host') {
            found = true;
            steps.push({ step: 'Step2 (host 回退)', matched: true, detail: `回退到 host 页面: ${page.url()}`, pageUrl: page.url() });
            break;
          }
        } catch {}
      }
      if (found) break;
    }
    if (!found) {
      steps.push({ step: 'Step2 (host 回退)', matched: false, detail: '无 host 页面可用' });
    }
  }

  // Step 3: 回退到 normal page
  {
    let found = false;
    let excludedCount = 0;
    let excludedSample = '';
    for (const ctx of contexts) {
      for (const page of ctx.pages()) {
        const url = page.url();
        if (!isExcludedUrl(url)) {
          found = true;
          steps.push({ step: 'Step3 (normal 回退)', matched: true, detail: `回退到 normal 页面: ${url}`, pageUrl: url });
          break;
        } else {
          excludedCount++;
          if (!excludedSample) excludedSample = url;
        }
      }
      if (found) break;
    }
    if (!found) {
      const extra = excludedCount > 0 ? ` (${excludedCount} 个页面被排除: ${excludedSample})` : '';
      steps.push({ step: 'Step3 (normal 回退)', matched: false, detail: `无可用 normal 页面${extra}` });
    }
  }

  return steps;
}

interface ContentResult {
  mode: PageMode;
  method: string;
  success: boolean;
  length: number;
  preview: string;
  error?: string;
  containsTargetPage?: boolean;
}

async function testGetContent(entry: PageEntry, targetDomain?: string): Promise<ContentResult[]> {
  const results: ContentResult[] = [];
  const page = entry.page;

  // 测试 page.content()
  try {
    const content = await page.content();
    const preview = content.substring(0, 500);
    const containsTarget = targetDomain ? content.includes(targetDomain) : undefined;
    results.push({
      mode: entry.mode,
      method: 'page.content()',
      success: true,
      length: content.length,
      preview,
      containsTargetPage: containsTarget,
    });
  } catch (e: any) {
    results.push({
      mode: entry.mode,
      method: 'page.content()',
      success: false,
      length: 0,
      preview: '',
      error: e.message,
    });
  }

  // 如果是 host 模式，额外测试 webview.executeJavaScript
  if (entry.mode === 'host') {
    try {
      const innerHTML = await page.evaluate(() => {
        const wv = document.querySelector('webview') as any;
        if (!wv || typeof wv.executeJavaScript !== 'function') {
          return { error: 'webview 不存在或 executeJavaScript 不可用' };
        }
        return wv.executeJavaScript('document.documentElement.outerHTML');
      }) as string | { error: string };

      if (typeof innerHTML === 'object' && innerHTML !== null && 'error' in innerHTML) {
        results.push({
          mode: 'host',
          method: 'webview.executeJavaScript()',
          success: false,
          length: 0,
          preview: '',
          error: (innerHTML as { error: string }).error,
        });
      } else {
        const html = innerHTML as string;
        const preview = html.substring(0, 500);
        const containsTarget = targetDomain ? html.includes(targetDomain) : undefined;
        results.push({
          mode: 'host',
          method: 'webview.executeJavaScript()',
          success: true,
          length: html.length,
          preview,
          containsTargetPage: containsTarget,
        });
      }
    } catch (e: any) {
      results.push({
        mode: 'host',
        method: 'webview.executeJavaScript()',
        success: false,
        length: 0,
        preview: '',
        error: e.message,
      });
    }
  }

  return results;
}

interface NavigateResult {
  success: boolean;
  url: string;
  title: string;
  detail: string;
  error?: string;
  bodyPreview?: string;
}

async function testNavigateAndInteract(
  hostEntry: PageEntry,
  targetUrl: string,
): Promise<{ navigate: NavigateResult; type: { success: boolean; error?: string }; click: { success: boolean; error?: string }; searchResult: { success: boolean; text?: string; error?: string } }> {
  const page = hostEntry.page;

  const navigate: NavigateResult = {
    success: false,
    url: targetUrl,
    title: '',
    detail: '',
  };

  // 导航
  try {
    await page.evaluate((url) => {
      const wv = document.querySelector('webview') as any;
      if (!wv || typeof wv.loadURL !== 'function') throw new Error('webview 不可用');
      wv.loadURL(url);
    }, targetUrl);

    // 等待加载
    await page.waitForFunction(() => {
      const wv = document.querySelector('webview') as any;
      return wv && wv.getURL && wv.getURL() !== 'about:blank';
    }, { timeout: 30000 });

    const info = await page.evaluate(() => {
      const wv = document.querySelector('webview') as any;
      return {
        url: wv?.getURL?.() || '',
        title: wv?.getTitle?.() || '',
      };
    });

    navigate.success = true;
    navigate.url = info.url;
    navigate.title = info.title;
    navigate.detail = `导航成功: ${info.url}`;

    // 获取 webview 内部 body 预览
    try {
      const bodyPreview = await page.evaluate(() => {
        const wv = document.querySelector('webview') as any;
        return wv.executeJavaScript('document.body.innerText.substring(0, 300)');
      });
      navigate.bodyPreview = bodyPreview as string;
    } catch {}
  } catch (e: any) {
    navigate.detail = `导航失败: ${e.message}`;
    navigate.error = e.message;
  }

  // 输入
  const typeResult = { success: false, error: '' as string | undefined };
  if (navigate.success) {
    try {
      await page.evaluate(() => {
        const wv = document.querySelector('webview') as any;
        return wv.executeJavaScript(`
          (function() {
            var input = document.querySelector('#kw');
            if (!input) return 'ERROR: #kw 未找到';
            input.value = 'txcode';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            return 'OK';
          })();
        `);
      });

      // 验证输入
      const value = await page.evaluate(() => {
        const wv = document.querySelector('webview') as any;
        return wv.executeJavaScript('document.querySelector("#kw")?.value || ""');
      });
      if ((value as string) === 'txcode') {
        typeResult.success = true;
      } else {
        typeResult.error = `输入验证失败，期望 txcode，实际: ${value}`;
      }
    } catch (e: any) {
      typeResult.error = e.message;
    }
  } else {
    typeResult.error = '导航未成功，跳过输入测试';
  }

  // 点击
  const clickResult = { success: false, error: '' as string | undefined };
  if (navigate.success) {
    try {
      await page.evaluate(() => {
        const wv = document.querySelector('webview') as any;
        return wv.executeJavaScript(`
          (function() {
            var btn = document.querySelector('#su');
            if (!btn) return 'ERROR: #su 未找到';
            btn.click();
            return 'OK';
          })();
        `);
      });
      clickResult.success = true;
    } catch (e: any) {
      clickResult.error = e.message;
    }
  } else {
    clickResult.error = '导航未成功，跳过点击测试';
  }

  // 等待搜索结果
  const searchResult = { success: false, text: '' as string | undefined, error: '' as string | undefined };
  if (clickResult.success) {
    try {
      // 等待搜索结果出现
      await page.waitForFunction(() => {
        const wv = document.querySelector('webview') as any;
        return wv.executeJavaScript('!!document.querySelector("#content_left")');
      }, { timeout: 15000 });

      const text = await page.evaluate(() => {
        const wv = document.querySelector('webview') as any;
        return wv.executeJavaScript('document.querySelector("#content_left")?.innerText?.substring(0, 300) || ""');
      });
      searchResult.success = true;
      searchResult.text = text as string;
    } catch (e: any) {
      searchResult.error = e.message;
    }
  } else {
    searchResult.error = '点击未成功，跳过搜索结果验证';
  }

  return { navigate, type: typeResult, click: clickResult, searchResult };
}

interface TestExecuteJavaScriptResult {
  success: boolean;
  result: string | null;
  error?: string;
}

async function testExecuteJavaScript(hostEntry: PageEntry): Promise<TestExecuteJavaScriptResult[]> {
  const results: TestExecuteJavaScriptResult[] = [];
  const page = hostEntry.page;

  // 测试1: 简单表达式
  try {
    const result = await page.evaluate(() => {
      const wv = document.querySelector('webview') as any;
      if (!wv || typeof wv.executeJavaScript !== 'function') return { error: 'executeJavaScript 不可用' };
      return wv.executeJavaScript('1 + 1');
    });
    if (typeof result === 'object' && result !== null && 'error' in result) {
      results.push({ success: false, result: null, error: (result as any).error });
    } else {
      results.push({ success: true, result: String(result) });
    }
  } catch (e: any) {
    results.push({ success: false, result: null, error: e.message });
  }

  // 测试2: document.title
  try {
    const result = await page.evaluate(() => {
      const wv = document.querySelector('webview') as any;
      if (!wv || typeof wv.executeJavaScript !== 'function') return { error: 'executeJavaScript 不可用' };
      return wv.executeJavaScript('document.title');
    });
    if (typeof result === 'object' && result !== null && 'error' in result) {
      results.push({ success: false, result: null, error: (result as any).error });
    } else {
      results.push({ success: true, result: String(result) });
    }
  } catch (e: any) {
    results.push({ success: false, result: null, error: e.message });
  }

  // 测试3: document.querySelector
  try {
    const result = await page.evaluate(() => {
      const wv = document.querySelector('webview') as any;
      if (!wv || typeof wv.executeJavaScript !== 'function') return { error: 'executeJavaScript 不可用' };
      return wv.executeJavaScript('document.querySelector("body")?.tagName || "null"');
    });
    if (typeof result === 'object' && result !== null && 'error' in result) {
      results.push({ success: false, result: null, error: (result as any).error });
    } else {
      results.push({ success: true, result: String(result) });
    }
  } catch (e: any) {
    results.push({ success: false, result: null, error: e.message });
  }

  return results;
}

interface DiagnosticReport {
  cdpConnection: { reachable: boolean; error?: string };
  pages: EnumerateResult;
  attachSteps: AttachStep[];
  contentResults: ContentResult[];
  executeJsResults: TestExecuteJavaScriptResult[];
  navigateResult: NavigateResult;
  typeResult: { success: boolean; error?: string };
  clickResult: { success: boolean; error?: string };
  searchResult: { success: boolean; text?: string; error?: string };
}

function printReport(report: DiagnosticReport): void {
  const indent = (s: string) => s.split('\n').map(line => '  ' + line).join('\n');

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║     Webview 内容访问诊断报告        ║');
  console.log('╚══════════════════════════════════════╝');

  // F1: CDP 连接
  console.log('\n┌── F1: CDP 连接诊断 ──────────────────');
  const f1Pass = report.cdpConnection.reachable;
  console.log(`│  状态: ${f1Pass ? 'PASS' : 'FAIL'}`);
  if (!f1Pass) console.log(`│  错误: ${report.cdpConnection.error}`);
  console.log('└──────────────────────────────────────');

  // F2: 全量 Page 枚举
  console.log('\n┌── F2: 全量 Page 枚举 ────────────────');
  const f2Pass = report.pages.allPages.length > 0;
  console.log(`│  状态: ${f2Pass ? 'PASS' : 'FAIL'}`);
  console.log(`│  总页面: ${report.pages.allPages.length}`);
  console.log(`│  guest: ${report.pages.guestPages.length}`);
  console.log(`│  host:  ${report.pages.hostPages.length}`);
  console.log(`│  normal: ${report.pages.normalPages.length}`);
  report.pages.allPages.forEach((entry, i) => {
    console.log(`│  [${i}] ${entry.mode.toUpperCase()} | ${entry.url}`);
    if (entry.webviewId !== null) console.log(`│       __ELECTRON_WEBVIEW_ID__ = ${entry.webviewId}`);
    if (entry.hasWebviewTag) console.log(`│       has <webview> tag`);
  });
  console.log('└──────────────────────────────────────');

  // F3: attachPage 行为验证
  console.log('\n┌── F3: attachPage 行为验证 ───────────');
  const f3Step1 = report.attachSteps.find(s => s.step.startsWith('Step1 '));
  const f3Pass = f3Step1?.matched || report.attachSteps.find(s => s.step.startsWith('Step1.5'))?.matched;
  console.log(`│  状态: ${f3Pass ? 'PASS (找到 guest)' : 'WARN (未找到 guest，回退到 host/normal)'}`);
  report.attachSteps.forEach(s => {
    const icon = s.matched ? '✓' : '✗';
    console.log(`│  ${icon} ${s.step}: ${s.detail}`);
  });
  console.log('└──────────────────────────────────────');

  // F4: guest 页面 ID 匹配
  console.log('\n┌── F4: guest 页面 ID 匹配 ────────────');
  const f4Pass = report.attachSteps.find(s => s.step.startsWith('Step1.5') && s.matched);
  if (report.pages.guestPages.length > 0) {
    console.log(`│  状态: PASS (guest 页面在 CDP 中可见)`);
    report.pages.guestPages.forEach(g => {
      console.log(`│  guest: __ELECTRON_WEBVIEW_ID__=${g.webviewId} url=${g.url}`);
    });
    if (report.pages.hostPages.length > 0) {
      console.log(`│  host 页面数: ${report.pages.hostPages.length}`);
    }
  } else if (f4Pass) {
    console.log('│  状态: PASS (通过 host→guest 间接匹配)');
  } else {
    console.log('│  状态: FAIL (guest 页面在 CDP 中不可见)');
  }
  console.log('└──────────────────────────────────────');

  // F5: getContent 验证
  console.log('\n┌── F5: getContent 验证 ───────────────');
  report.contentResults.forEach(r => {
    const icon = r.success ? '✓' : '✗';
    const target = r.containsTargetPage !== undefined ? ` containsTarget=${r.containsTargetPage}` : '';
    console.log(`│  ${icon} [${r.mode}] ${r.method}: length=${r.length}${target}`);
    if (r.error) console.log(`│     error: ${r.error}`);
    if (r.preview) console.log(`│     preview: ${r.preview.substring(0, 120)}...`);
  });
  const f5Pass = report.contentResults.some(r => r.success && r.containsTargetPage === true);
  console.log(`│  综合判定: content 是否返回 webview 内部 DOM: ${f5Pass ? 'YES' : 'NO'}`);
  console.log('└──────────────────────────────────────');

  // F6: 导航验证
  console.log('\n┌── F6: 导航验证 ──────────────────────');
  const f6Pass = report.navigateResult.success;
  console.log(`│  状态: ${f6Pass ? 'PASS' : 'FAIL'}`);
  console.log(`│  ${report.navigateResult.detail}`);
  if (report.navigateResult.error) console.log(`│  错误: ${report.navigateResult.error}`);
  if (report.navigateResult.bodyPreview) {
    console.log(`│  页面内容预览: ${(report.navigateResult.bodyPreview || '').substring(0, 120)}...`);
  }
  console.log('└──────────────────────────────────────');

  // F7: 输入 + 点击验证
  console.log('\n┌── F7: 输入 + 点击验证 ──────────────');
  const f7TypePass = report.typeResult.success;
  const f7ClickPass = report.clickResult.success;
  console.log(`│  输入(#kw): ${f7TypePass ? 'PASS' : 'FAIL'}${report.typeResult.error ? ' - ' + report.typeResult.error : ''}`);
  console.log(`│  点击(#su): ${f7ClickPass ? 'PASS' : 'FAIL'}${report.clickResult.error ? ' - ' + report.clickResult.error : ''}`);
  const f7Pass = f7TypePass && f7ClickPass;
  console.log(`│  状态: ${f7Pass ? 'PASS' : 'FAIL'}`);
  console.log('└──────────────────────────────────────');

  // F8: executeJavaScript 可行性
  console.log('\n┌── F8: executeJavaScript 可行性 ──────');
  if (report.executeJsResults.length === 0) {
    console.log('│  状态: N/A (无 host 页面)');
  } else {
    report.executeJsResults.forEach(r => {
      const icon = r.success ? '✓' : '✗';
      console.log(`│  ${icon} result=${r.result}${r.error ? ' error=' + r.error : ''}`);
    });
    const f8Pass = report.executeJsResults.every(r => r.success);
    console.log(`│  状态: ${f8Pass ? 'PASS' : 'FAIL'}`);
  }
  console.log('└──────────────────────────────────────');

  // F9: 搜索结果
  console.log('\n┌── 搜索结果验证 ──────────────────────');
  const f9Pass = report.searchResult.success;
  console.log(`│  状态: ${f9Pass ? 'PASS' : 'FAIL'}`);
  if (report.searchResult.text) {
    console.log(`│  搜索结果: ${(report.searchResult.text || '').substring(0, 200)}`);
  }
  if (report.searchResult.error) console.log(`│  错误: ${report.searchResult.error}`);
  console.log('└──────────────────────────────────────');

  // 综合结论
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║           诊断结论                   ║');
  console.log('╚══════════════════════════════════════╝');

  const guestVisible = report.pages.guestPages.length > 0;
  const executeJsWorks = report.executeJsResults.length > 0 && report.executeJsResults.every(r => r.success);
  const contentViaGuest = report.contentResults.some(r => r.mode === 'guest' && r.success);
  const contentViaHostJs = report.contentResults.some(r => r.mode === 'host' && r.method === 'webview.executeJavaScript()' && r.success);

  console.log('');
  if (guestVisible && contentViaGuest) {
    console.log('  场景: guest 页面可见，page.content() 返回 webview 内部 DOM');
    console.log('  结论: CDP 正常暴露 webview 内部页面');
    console.log('  建议: 确保 attachPage 返回 guest page 而非 host page');
  } else if (guestVisible && !contentViaGuest) {
    console.log('  场景: guest 页面可见但 page.content() 异常');
    console.log('  结论: guest 页面存在但内容获取失败，可能为跨域限制');
    console.log('  建议: 优先使用 host 模式 executeJavaScript 回退');
  } else if (!guestVisible && executeJsWorks) {
    console.log('  场景: guest 页面不可见，但 executeJavaScript 可用');
    console.log('  结论: CDP 未暴露 webview 内部页面，需通过 host page 操作');
    console.log('  建议: 为所有 testBrowserTools 添加 host 模式 executeJavaScript 回退');
  } else if (!guestVisible && !executeJsWorks) {
    console.log('  场景: guest 页面不可见，executeJavaScript 也不可用');
    console.log('  结论: 需要排查 Electron webview 的 CDP 调试配置');
    console.log('  建议: 检查 webview 是否设置了 contextIsolation 等属性');
  } else if (!guestVisible && contentViaHostJs) {
    console.log('  场景: guest 页面不可见，但可通过 host.executeJavaScript 获取内容');
    console.log('  结论: host 模式 executeJavaScript 是可行的替代方案');
    console.log('  建议: 在 host 模式下统一使用 executeJavaScript 进行内容操作');
  } else {
    console.log('  场景: 混合/未分类');
    console.log('  建议: 人工检查上述各测试项的详细输出');
  }

  // 关键判定表
  console.log('\n  关键判定表:');
  console.log('  ┌────────────────────────────┬────────┬──────────────────────────────┐');
  console.log('  │ 检测项                    │ 结果   │ 详情                         │');
  console.log('  ├────────────────────────────┼────────┼──────────────────────────────┤');
  console.log(`  │ CDP 连接                  │ ${f1Pass ? 'PASS' : 'FAIL'}  │ ${report.cdpConnection.reachable ? '端口可达' : (report.cdpConnection.error || '')} │`);
  console.log(`  │ guest 页面可见            │ ${guestVisible ? 'PASS' : 'FAIL'}  │ ${report.pages.guestPages.length} 个 guest           │`);
  console.log(`  │ ID 匹配 (host→guest)      │ ${f4Pass ? 'PASS' : 'N/A'}  │                              │`);
  console.log(`  │ attachPage 返回 guest     │ ${f3Step1?.matched ? 'PASS' : 'N/A'}  │                              │`);
  console.log(`  │ getContent (guest)        │ ${contentViaGuest ? 'PASS' : 'N/A'}  │                              │`);
  console.log(`  │ getContent (host execJS)  │ ${contentViaHostJs ? 'PASS' : 'N/A'}  │                              │`);
  console.log(`  │ executeJavaScript 可用    │ ${report.executeJsResults.length === 0 ? 'N/A' : (executeJsWorks ? 'PASS' : 'FAIL')}  │                              │`);
  console.log(`  │ 输入 + 点击               │ ${f7Pass ? 'PASS' : 'FAIL'}  │                              │`);
  console.log('  └────────────────────────────┴────────┴──────────────────────────────┘');
  console.log('');
}

async function main() {
  const targetUrl = process.argv[2] || 'http://www.baidu.com';
  const targetDomain = new URL(targetUrl).hostname;

  console.log('╔══════════════════════════════════════╗');
  console.log('║  Webview 内容访问诊断测试脚本       ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`  目标 URL: ${targetUrl}`);
  console.log(`  模式: ${STANDALONE_MODE ? '独立浏览器' : `CDP (端口 ${CDP_PORT})`}`);
  console.log('');

  const report: DiagnosticReport = {
    cdpConnection: { reachable: false },
    pages: { allPages: [], guestPages: [], hostPages: [], normalPages: [] },
    attachSteps: [],
    contentResults: [],
    executeJsResults: [],
    navigateResult: { success: false, url: '', title: '', detail: '' },
    typeResult: { success: false },
    clickResult: { success: false },
    searchResult: { success: false },
  };

  if (STANDALONE_MODE) {
    console.log('[F1] 独立浏览器模式，跳过 CDP 连接诊断...');
    report.cdpConnection = { reachable: true };
    // TODO: 独立模式下启动本地浏览器测试
    console.log('独立模式暂不支持完整诊断，请使用 CDP 模式连接 Electron 应用。');
    return;
  }

  // F1: CDP 连接诊断
  console.log('[F1] CDP 连接诊断...');

  const portResult = await probePort(CDP_PORT);
  if (!portResult.reachable) {
    report.cdpConnection = { reachable: false, error: `端口 ${CDP_PORT} 不可达: ${portResult.error}` };
    printReport(report);
    console.log('建议：请启动 Electron 应用并确保 --remote-debugging-port=9222');
    return;
  }
  console.log(`  端口 ${CDP_PORT} 可达`);

  let browser: Browser;
  try {
    browser = await connectCDP(CDP_PORT);
    report.cdpConnection = { reachable: true };
  } catch (e: any) {
    report.cdpConnection = { reachable: false, error: e.message };
    printReport(report);
    return;
  }

  try {
    // F2: 全量 Page 枚举
    console.log('\n[F2] 全量 Page 枚举...');
    report.pages = await enumerateAllPages(browser);

    if (report.pages.allPages.length === 0) {
      console.log('未找到任何页面，退出。');
      await browser.close();
      printReport(report);
      return;
    }

    // F3: 模拟 attachPage 行为
    console.log('[F3] 模拟 attachPage 行为...');
    report.attachSteps = await simulateAttachPage(browser);

    // F5: getContent 验证
    console.log('\n[F5] getContent 验证...');
    if (report.pages.guestPages.length > 0) {
      const results = await testGetContent(report.pages.guestPages[0], targetDomain);
      report.contentResults.push(...results);
    }
    if (report.pages.hostPages.length > 0) {
      const results = await testGetContent(report.pages.hostPages[0], targetDomain);
      report.contentResults.push(...results);
    }
    if (report.pages.normalPages.length > 0 && report.pages.guestPages.length === 0 && report.pages.hostPages.length === 0) {
      const results = await testGetContent(report.pages.normalPages[0], targetDomain);
      report.contentResults.push(...results);
    }

    // F8: executeJavaScript 可行性验证
    if (report.pages.hostPages.length > 0) {
      console.log('\n[F8] executeJavaScript 可行性验证...');
      report.executeJsResults = await testExecuteJavaScript(report.pages.hostPages[0]);
    }

    // F6 + F7: 导航 + 输入 + 点击验证
    if (report.pages.hostPages.length > 0) {
      console.log('\n[F6/F7] 导航 + 输入 + 点击验证...');
      const interactResults = await testNavigateAndInteract(report.pages.hostPages[0], targetUrl);
      report.navigateResult = interactResults.navigate;
      report.typeResult = interactResults.type;
      report.clickResult = interactResults.click;
      report.searchResult = interactResults.searchResult;
    } else {
      console.log('\n[F6/F7] 无 host 页面，跳过导航 + 输入 + 点击验证');
    }

    // F9: 打印报告
    printReport(report);

  } finally {
    try { await browser.close(); } catch {}
    console.log('CDP 连接已关闭');
  }
}

main().catch((e) => {
  console.error('测试脚本执行失败:', e.message);
  console.error(e.stack);
  process.exit(1);
});
