import path from 'path';
import puppeteer, {
    Page,
    HTTPRequest,
    HTTPResponse
} from 'puppeteer-core';
import { getBrowserConfig } from '../config/browser';
import { TopWalletsResponse } from '../types';
import { URLS } from '../constants';
import { logger } from '../utils/logger';
import { saveToJson } from '../utils/file';

export class WebScraper {
    private static instance: WebScraper;
    private readonly dataDir: string;

    private constructor() {
        this.dataDir = path.join(process.cwd(), 'data', 'wallets');
    }

    public static getInstance(): WebScraper {
        if (!WebScraper.instance) {
            WebScraper.instance = new WebScraper();
        }
        return WebScraper.instance;
    }

    public async scrape(): Promise<{
        topWallets: TopWalletsResponse | null
    }> {
        try {
            logger.info('开始抓取数据...');

            const browserConfig = await getBrowserConfig();
            logger.info('浏览器配置：', browserConfig);

            const browser = await puppeteer.launch(browserConfig);
            const page = await browser.newPage();
            let topWalletsData: TopWalletsResponse | null = null;

            // 设置网络请求监听
            await this.setupNetworkInterception(page, (data) => {
                topWalletsData = data;
            });

            // 设置视窗大小
            await page.setViewport({ width: 1280, height: 800 });

            // 访问网站
            await page.goto(URLS.MAIN_PAGE, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            // 等待API数据
            await page.waitForTimeout(5000);

            await browser.close();

            return {
                topWallets: topWalletsData
            };

        } catch (error) {
            logger.error('抓取过程中出现错误：', error);
            throw error;
        }
    }

    private async setupNetworkInterception(
        page: Page,
        callback: (data: TopWalletsResponse) => void
    ): Promise<void> {
        await page.setRequestInterception(true);

        page.on('request', (request: HTTPRequest) => {
            request.continue();
        });

        page.on('response', async (response: HTTPResponse) => {
            const url = response.url();
            if (url.includes('/api/cluster/top-wallets')) {
                try {
                    const responseData = await response.json() as TopWalletsResponse;
                    logger.info('捕获到top-wallets接口返回数据');
                    if (responseData?.data) {
                        const walletIds = responseData.data.map(item => item.id);
                        logger.info('获取到的钱包ID列表：', walletIds);

                        // 保存到文件
                        try {
                            const filePath = await saveToJson(
                                {
                                    timestamp: new Date().toISOString(),
                                    walletIds,
                                    rawData: responseData
                                },
                                this.dataDir,
                                'wallets'
                            );
                            logger.info(`数据已保存到文件: ${filePath}`);
                        } catch (error) {
                            logger.error('保存文件时出错：', error);
                        }

                        callback(responseData);
                    }
                } catch (error) {
                    logger.error('解析接口数据时出错：', error);
                }
            }
        });
    }
} 