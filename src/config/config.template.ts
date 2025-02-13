export const config = {
    rpc: {
        endpoint: '', // rpc节点
    },
    server: {
        port: 3000
    },
    scraper: {
        interval: '*/30 * * * *'  // 定时任务 cron 表达式
    }
} as const; 