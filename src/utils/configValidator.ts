import { Config } from '../types/config';

export function validateConfig(config: Config): void {
    if (!config.rpc.endpoint) {
        throw new Error('RPC endpoint is required in config');
    }

    if (!config.rpc.endpoint.startsWith('http')) {
        throw new Error('Invalid RPC endpoint URL format');
    }

    if (!config.server.port || config.server.port < 0 || config.server.port > 65535) {
        throw new Error('Invalid server port in config');
    }

    // 验证 cron 表达式
    const cronRegex = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|(\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9]))) (\*|([0-9]|1[0-9]|2[0-3])|(\*\/([0-9]|1[0-9]|2[0-3]))) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|(\*\/([1-9]|1[0-9]|2[0-9]|3[0-1]))) (\*|([1-9]|1[0-2])|(\*\/([1-9]|1[0-2]))) (\*|([0-6])|(\*\/([0-6])))$/;
    if (!cronRegex.test(config.scraper.interval)) {
        throw new Error('Invalid cron expression in config');
    }
} 