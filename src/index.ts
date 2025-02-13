import cron from 'node-cron';
import { WebScraper } from './services/scraper';
import { CRON_SCHEDULE } from './constants';
import { logger } from './utils/logger';

async function runTasks() {
    try {
        const scraper = WebScraper.getInstance();
        const result = await scraper.scrape();
        logger.info('任务执行完成', result);
    } catch (error) {
        logger.error('任务执行失败：', error);
    }
}

// 设置定时任务
cron.schedule(CRON_SCHEDULE, runTasks);

// 立即执行一次
runTasks();

logger.info('爬虫程序已启动，将每30分钟执行所有任务...'); 