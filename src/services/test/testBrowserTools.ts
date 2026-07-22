import type { Page } from 'playwright';
import { playwrightManager, type AttachResult } from './playwrightManager.js';

export interface BrowserToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

async function getPage(webContentsId: number): Promise<AttachResult> {
  return playwrightManager.attachPage(webContentsId);
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

export async function navigate(webContentsId: number, url: string): Promise<BrowserToolResult> {
  try {
    const { page, mode } = await getPage(webContentsId);
    if (mode === 'host') {
      await page.evaluate((u: string) => {
        const wv = document.querySelector('webview') as any;
        if (wv && wv.loadURL) {
          wv.loadURL(u);
        } else {
          throw new Error('页面中未找到可用的 webview 元素');
        }
      }, url);
      await page.waitForFunction(() => {
        const wv = document.querySelector('webview') as any;
        return wv && wv.getURL && wv.getURL() !== 'about:blank';
      }, { timeout: 30000 }).catch(() => {});
      const info = await getHostWebviewInfo(page);
      return { success: true, data: { url: info.url, title: info.title } };
    }
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    return { success: true, data: { url: page.url(), title: await page.title() } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function click(webContentsId: number, selector: string): Promise<BrowserToolResult> {
  try {
    const { page } = await getPage(webContentsId);
    await page.waitForSelector(selector, { timeout: 10000 });
    await page.click(selector);
    return { success: true, data: { selector } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function typeText(webContentsId: number, selector: string, text: string): Promise<BrowserToolResult> {
  try {
    const { page } = await getPage(webContentsId);
    await page.waitForSelector(selector, { timeout: 10000 });
    await page.fill(selector, text);
    return { success: true, data: { selector, text } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function screenshot(webContentsId: number): Promise<BrowserToolResult> {
  try {
    const { page, mode } = await getPage(webContentsId);
    let buffer: Buffer;
    if (mode === 'host') {
      const element = await page.locator('webview').elementHandle();
      if (element) {
        buffer = await element.screenshot({ type: 'png' });
      } else {
        buffer = await page.screenshot({ type: 'png', fullPage: false });
      }
    } else {
      buffer = await page.screenshot({ type: 'png', fullPage: false });
    }
    const base64 = buffer.toString('base64');
    return { success: true, data: { screenshot: base64 } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function hover(webContentsId: number, selector: string): Promise<BrowserToolResult> {
  try {
    const { page } = await getPage(webContentsId);
    await page.waitForSelector(selector, { timeout: 10000 });
    await page.hover(selector);
    return { success: true, data: { selector } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function selectOption(webContentsId: number, selector: string, value: string): Promise<BrowserToolResult> {
  try {
    const { page } = await getPage(webContentsId);
    await page.waitForSelector(selector, { timeout: 10000 });
    await page.selectOption(selector, value);
    return { success: true, data: { selector, value } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function waitFor(webContentsId: number, target: string): Promise<BrowserToolResult> {
  try {
    const { page } = await getPage(webContentsId);
    const ms = parseInt(target, 10);
    if (!isNaN(ms) && ms > 0) {
      await page.waitForTimeout(ms);
      return { success: true, data: { waitedMs: ms } };
    }
    await page.waitForSelector(target, { timeout: 15000 });
    return { success: true, data: { selector: target } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getContent(webContentsId: number): Promise<BrowserToolResult> {
  try {
    const { page } = await getPage(webContentsId);
    const html = await page.content();
    let summary = html;
    if (html.length > 50000) {
      summary = html.substring(0, 50000) + `\n\n... (截断，全文共 ${html.length} 字符)`;
    }
    return { success: true, data: { content: summary } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function assertElement(webContentsId: number, selector: string): Promise<BrowserToolResult> {
  try {
    const { page } = await getPage(webContentsId);
    const count = await page.locator(selector).count();
    if (count > 0) {
      return { success: true, data: { selector, count } };
    }
    return { success: false, error: `元素不存在: ${selector}` };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function assertText(webContentsId: number, text: string): Promise<BrowserToolResult> {
  try {
    const { page } = await getPage(webContentsId);
    const visible = await page.getByText(text).first().isVisible();
    if (visible) {
      return { success: true, data: { text } };
    }
    return { success: false, error: `页面上未找到文本: ${text}` };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getPageUrl(webContentsId: number): Promise<BrowserToolResult> {
  try {
    const { page, mode } = await getPage(webContentsId);
    if (mode === 'host') {
      const info = await getHostWebviewInfo(page);
      return { success: true, data: { url: info.url, title: info.title } };
    }
    return { success: true, data: { url: page.url(), title: await page.title() } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export const testBrowserTools = {
  navigate,
  click,
  type: typeText,
  screenshot,
  hover,
  select: selectOption,
  wait: waitFor,
  getContent,
  assertElement,
  assertText,
  getPageUrl,
};
