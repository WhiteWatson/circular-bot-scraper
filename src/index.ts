import cron from 'node-cron';
import { WebScraper } from './services/scraper';
import { Server } from './server';
import { CRON_SCHEDULE } from './constants';
import { logger } from './utils/logger';
import { config } from './config/config';
import { validateConfig } from './utils/configValidator';

async function runTasks() {
    try {
        const scraper = WebScraper.getInstance();
        const result = await scraper.scrape();
        logger.info('任务执行完成', result);
    } catch (error) {
        logger.error('任务执行失败：', error);
    }
}

// 启动前验证配置
try {
    validateConfig(config);
} catch (error) {
    logger.error('配置验证失败：', error);
    process.exit(1);
}

// 启动服务器
const server = Server.getInstance();
server.start();

// 设置定时任务
cron.schedule(CRON_SCHEDULE, runTasks);

// 立即执行一次
runTasks();

logger.info('爬虫程序和服务器已启动，将每30分钟执行所有任务...'); 