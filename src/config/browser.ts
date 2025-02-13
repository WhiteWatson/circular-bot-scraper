import os from 'os';
import chromium from '@sparticuz/chromium';
import { BrowserConfig } from '../types';

export async function getBrowserConfig(): Promise<BrowserConfig> {
    const platform = os.platform();
    console.log('当前操作系统：', platform);

    switch (platform) {
        case 'darwin':
            return {
                product: 'chrome',
                executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                headless: 'new',
                args: ['--no-sandbox']
            };

        case 'win32':
            return {
                product: 'chrome',
                executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                headless: 'new',
                args: ['--no-sandbox']
            };

        default:
            return {
                executablePath: await chromium.executablePath(),
                headless: 'new',
                args: [
                    ...chromium.args,
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu'
                ],
                defaultViewport: chromium.defaultViewport,
                ignoreHTTPSErrors: true
            };
    }
} 