import type { Browser, BrowserContext, Page } from 'playwright';

let playwrightModule: typeof import('playwright') | null = null;

async function getPlaywright(): Promise<typeof import('playwright')> {
  if (!playwrightModule) {
    try {
      playwrightModule = await import('playwright');
    } catch {
      throw new Error('playwright 未安装，请运行: npm install playwright');
    }
  }
  return playwrightModule;
}

export type PageMode = 'guest' | 'host' | 'normal';

export interface AttachResult {
  page: Page;
  mode: PageMode;
}

export function isExcludedUrl(url: string): boolean {
  return url === 'about:blank'
    || url.startsWith('chrome://')
    || url.startsWith('devtools://')
    || url.startsWith('file://')
    || url.startsWith('chrome-extension://');
}

export async function detectPageMode(page: Page): Promise<PageMode> {
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

class PlaywrightManager {
  private browser: Browser | null = null;
  private pageMap: Map<number, Page> = new Map();
  private sessionPageMap: Map<string, number> = new Map();
  private connected: boolean = false;

  registerSession(sessionId: string, webContentsId: number): void {
    this.sessionPageMap.set(sessionId, webContentsId);
    console.log(`[PlaywrightManager] Registered session ${sessionId} -> webContentsId ${webContentsId}`);
  }

  unregisterSession(sessionId: string): void {
    const wcId = this.sessionPageMap.get(sessionId);
    if (wcId) {
      this.releasePage(wcId);
    }
    this.sessionPageMap.delete(sessionId);
  }

  getWebContentsIdBySession(sessionId: string): number | undefined {
    return this.sessionPageMap.get(sessionId);
  }

  async connect(): Promise<void> {
    if (this.connected && this.browser) return;

    try {
      const pw = await getPlaywright();
      this.browser = await pw.chromium.connectOverCDP('http://localhost:9222');
      this.connected = true;
      console.log('[PlaywrightManager] Connected to Electron CDP');
    } catch (e: any) {
      console.error('[PlaywrightManager] CDP connection failed:', e.message);
      throw new Error(`无法连接到 Electron 调试端口 (9222): ${e.message}`);
    }
  }

  async reconnect(): Promise<void> {
    this.pageMap.clear();
    if (this.browser) {
      try { await this.browser.close(); } catch {}
      this.browser = null;
    }
    this.connected = false;
    await this.connect();
  }

  async attachPage(webContentsId: number): Promise<AttachResult> {
    if (!this.browser || !this.connected) {
      await this.connect();
    }

    const existing = this.pageMap.get(webContentsId);
    if (existing) {
      try {
        await existing.evaluate('1');
        const mode = await detectPageMode(existing);
        return { page: existing, mode };
      } catch {
        this.pageMap.delete(webContentsId);
      }
    }

    const contexts = this.browser!.contexts();

    // Step 1: find guest page (webview internal) matching webContentsId
    for (const context of contexts) {
      const pages = context.pages();
      for (const page of pages) {
        try {
          const mode = await detectPageMode(page);
          if (mode === 'guest') {
            const targetId = await page.evaluate(() => {
              return (window as any).__ELECTRON_WEBVIEW_ID__;
            });
            if (targetId === webContentsId || targetId === String(webContentsId)) {
              this.pageMap.set(webContentsId, page);
              console.log(`[PlaywrightManager] Attached guest page for webContentsId=${webContentsId}`);
              return { page, mode };
            }
          }
        } catch {}
      }
    }

    // Step 1.5: try to find guest page via host page's webview getWebContentsId
    for (const context of contexts) {
      const pages = context.pages();
      for (const hostPage of pages) {
        try {
          const mode = await detectPageMode(hostPage);
          if (mode !== 'host') continue;
          const realWcId = await hostPage.evaluate(() => {
            const wv = document.querySelector('webview') as any;
            return wv?.getWebContentsId?.() ?? null;
          });
          if (realWcId === null) continue;
          for (const ctx of contexts) {
            for (const guestPage of ctx.pages()) {
              const guestId = await guestPage.evaluate(() => {
                return (window as any).__ELECTRON_WEBVIEW_ID__;
              }).catch(() => null);
              if (guestId === realWcId || guestId === String(realWcId)) {
                this.pageMap.set(webContentsId, guestPage);
                console.log(`[PlaywrightManager] Attached guest page for webContentsId=${webContentsId} via Step1.5 (realWcId=${realWcId})`);
                return { page: guestPage, mode: 'guest' };
              }
            }
          }
        } catch {}
      }
    }

    // Step 2: fallback - find host page (has webview element)
    for (const context of contexts) {
      const pages = context.pages();
      for (const page of pages) {
        try {
          const mode = await detectPageMode(page);
          if (mode === 'host') {
            this.pageMap.set(webContentsId, page);
            console.log(`[PlaywrightManager] Attached host page for webContentsId=${webContentsId} via fallback`);
            return { page, mode };
          }
        } catch {}
      }
    }

    // Step 3: last resort - find any non-excluded normal page
    for (const context of contexts) {
      const pages = context.pages();
      for (const page of pages) {
        try {
          const url = page.url();
          if (!isExcludedUrl(url)) {
            this.pageMap.set(webContentsId, page);
            console.log(`[PlaywrightManager] Attached normal page for webContentsId=${webContentsId} via last-resort`);
            return { page, mode: 'normal' };
          }
        } catch {}
      }
    }

    // Step 4: no existing page found, try creating a new one
    try {
      const ctx = contexts[0] || await this.browser!.newContext();
      const page = await ctx.newPage();
      this.pageMap.set(webContentsId, page);
      console.log(`[PlaywrightManager] Created new page for webContentsId=${webContentsId}`);
      return { page, mode: 'normal' };
    } catch (e: any) {
      throw new Error(`找不到 webContentsId=${webContentsId} 对应的 Page，且创建新页面失败: ${e.message}`);
    }
  }

  getPage(webContentsId: number): Page | undefined {
    return this.pageMap.get(webContentsId);
  }

  releasePage(webContentsId: number): void {
    this.pageMap.delete(webContentsId);
    console.log(`[PlaywrightManager] Released page for webContentsId=${webContentsId}`);
  }

  async disconnect(): Promise<void> {
    this.pageMap.clear();
    if (this.browser) {
      try {
        await this.browser.close();
      } catch {}
      this.browser = null;
    }
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const playwrightManager = new PlaywrightManager();
