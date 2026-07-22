declare var window: any;
declare var document: any;

declare module 'playwright' {
  export interface Browser {
    contexts(): BrowserContext[];
    newContext(options?: any): Promise<BrowserContext>;
    close(): Promise<void>;
  }

  export interface BrowserContext {
    pages(): Page[];
    newPage(options?: any): Promise<Page>;
    close(): Promise<void>;
  }

  export interface Page {
    url(): string;
    title(): Promise<string>;
    content(): Promise<string>;
    evaluate(fn: any, ...args: any[]): Promise<any>;
    goto(url: string, options?: any): Promise<any>;
    click(selector: string, options?: any): Promise<void>;
    fill(selector: string, text: string, options?: any): Promise<void>;
    hover(selector: string, options?: any): Promise<void>;
    selectOption(selector: string, value: string, options?: any): Promise<void>;
    waitForSelector(selector: string, options?: any): Promise<any>;
    waitForTimeout(ms: number): Promise<void>;
    waitForFunction(fn: any, arg?: any, options?: any): Promise<any>;
    screenshot(options?: any): Promise<Buffer>;
    locator(selector: string): { count(): Promise<number>; elementHandle(): Promise<any> };
    getByText(text: string): { first(): { isVisible(): Promise<boolean> } };
    bringToFront(): Promise<void>;
    close(): Promise<void>;
  }

  export const chromium: {
    connectOverCDP(endpoint: string, options?: any): Promise<Browser>;
  };
}
