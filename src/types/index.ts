import type { Page, Product } from 'puppeteer-core';

// 定义类型接口
export interface WalletData {
    id: string;
    [key: string]: any;  // 其他字段
}

export interface TopWalletsResponse {
    data: WalletData[];
    [key: string]: any;  // 其他字段
}

export interface ScrapedElement {
    text: string;
    html: string;
}

export interface BrowserConfig {
    product?: Product;
    executablePath: string;
    headless: 'new' | boolean;
    args: string[];
    defaultViewport?: {
        width: number;
        height: number;
    };
    ignoreHTTPSErrors?: boolean;
}

// 添加 DOM 元素类型
export interface DOMElement extends Element {
    textContent: string;
    innerHTML: string;
} 