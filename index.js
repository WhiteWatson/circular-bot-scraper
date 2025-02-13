const os = require('os');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const cron = require('node-cron');
const https = require('https');

async function getBrowserConfig() {
    const platform = os.platform();
    console.log('当前操作系统：', platform);

    switch (platform) {
        case 'darwin': // macOS
            return {
                product: 'chrome',
                executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                headless: 'new',
                args: ['--no-sandbox']
            };

        case 'win32': // Windows
            return {
                product: 'chrome',
                executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                headless: 'new',
                args: ['--no-sandbox']
            };

        default: // Linux 或其他系统
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

async function scrapeCircularBot() {
    try {
        console.log('开始抓取数据...');

        // 获取对应系统的浏览器配置
        const browserConfig = await getBrowserConfig();
        console.log('使用的浏览器配置：', browserConfig);

        // 启动浏览器
        const browser = await puppeteer.launch(browserConfig);

        // 创建新页面
        const page = await browser.newPage();

        // 监听网络请求
        let topWalletsData = null;
        await page.setRequestInterception(true);

        page.on('request', request => {
            request.continue();
        });

        page.on('response', async response => {
            const url = response.url();
            if (url.includes('/api/cluster/top-wallets')) {
                try {
                    const responseData = await response.json();
                    console.log('捕获到top-wallets接口返回数据：', responseData);
                    if (responseData && responseData.data) {
                        const walletIds = responseData.data.map(item => item.id);
                        console.log('获取到的钱包ID列表：', walletIds);
                        topWalletsData = responseData;
                    }
                } catch (error) {
                    console.error('解析接口数据时出错：', error);
                }
            }
        });

        // 设置视窗大小
        await page.setViewport({ width: 1280, height: 800 });

        // 访问网站
        await page.goto('https://www.circular.bot/', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        // 等待目标元素加载
        const selector = 'body > div.flex.h-screen.overflow-hidden > main > div > div > div > div.fixed.bottom-0.left-0.lg\\:left-72.right-0.translate-y-\\[20\\%\\].sm\\:translate-y-0.transition-transform > div > div > div.jsx-810b6accf40a29bd.w-full.overflow-x-auto.hide-scrollbar.cursor-grab.active\\:cursor-grabbing.h-\\[267px\\].sm\\:h-\\[267px\\] > div';

        await page.waitForSelector(selector);

        // 获取子元素列表
        const elements = await page.evaluate((selector) => {
            const container = document.querySelector(selector);
            const children = container.children;
            const result = [];

            for (let child of children) {
                result.push({
                    text: child.textContent,
                    html: child.innerHTML
                });
            }

            return result;
        }, selector);

        console.log('抓取到的元素数据：', elements);

        // 等待一段时间确保接口数据已经获取
        await page.waitForTimeout(5000);

        // 关闭浏览器
        await browser.close();

    } catch (error) {
        console.error('抓取过程中出现错误：', error);
    }
}

async function runAllTasks() {
    try {
        // 只需要运行网页抓取任务，因为已经包含了接口监听
        await scrapeCircularBot();
    } catch (error) {
        console.error('执行任务时出错：', error);
    }
}

// 修改定时任务，同时执行两个任务
cron.schedule('*/30 * * * *', () => {
    runAllTasks();
});

// 立即执行一次
runAllTasks();

console.log('爬虫程序已启动，将每30分钟执行所有任务...'); 