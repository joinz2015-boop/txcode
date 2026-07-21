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

  async attachPage(webContentsId: number): Promise<Page> {
    if (!this.browser || !this.connected) {
      await this.connect();
    }

    const existing = this.pageMap.get(webContentsId);
    if (existing) {
      try {
        await existing.evaluate('1');
        return existing;
      } catch {
        this.pageMap.delete(webContentsId);
      }
    }

    const contexts = this.browser!.contexts();
    for (const context of contexts) {
      const pages = context.pages();
      for (const page of pages) {
        try {
          const url = page.url();
          if (url === 'about:blank' || url.startsWith('chrome://')) continue;

          const targetId = await page.evaluate(() => {
            return (window as any).__ELECTRON_WEBVIEW_ID__;
          }).catch(() => null);

          if (targetId === webContentsId || targetId === String(webContentsId)) {
            this.pageMap.set(webContentsId, page);
            console.log(`[PlaywrightManager] Attached page for webContentsId=${webContentsId}`);
            return page;
          }
        } catch {
          // page may not be accessible
        }
      }
    }

    // Fallback: try each page and match by evaluating a marker
    for (const context of contexts) {
      const pages = context.pages();
      for (const page of pages) {
        try {
          const targetType = await page.evaluate(() => {
            try {
              const wv = document.querySelector('webview');
              return wv ? 'webview' : 'normal';
            } catch { return 'unknown'; }
          }).catch(() => 'unknown');

          if (targetType === 'webview') {
            this.pageMap.set(webContentsId, page);
            console.log(`[PlaywrightManager] Attached page for webContentsId=${webContentsId} via fallback`);
            return page;
          }
        } catch {
          // skip inaccessible pages
        }
      }
    }

    // Last resort: find any non-blank page
    for (const context of contexts) {
      const pages = context.pages();
      if (pages.length > 0) {
        const lastPage = pages[pages.length - 1];
        this.pageMap.set(webContentsId, lastPage);
        console.log(`[PlaywrightManager] Attached page for webContentsId=${webContentsId} via last-resort`);
        return lastPage;
      }
    }

    throw new Error(`找不到 webContentsId=${webContentsId} 对应的 Page，请确保 webview 已加载页面`);
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
      } catch {
        // ignore
      }
      this.browser = null;
    }
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const playwrightManager = new PlaywrightManager();
