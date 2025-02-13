import fs from 'fs';
import path from 'path';
import { logger } from './logger';
import { PATHS } from '../constants';

interface WalletFile {
    timestamp: string;
    walletIds: string[];
    rawData: any;
}

export async function getLatestWalletIds(maxFiles: number = 10): Promise<string[]> {
    try {
        // 确保目录存在
        if (!fs.existsSync(PATHS.WALLETS_DIR)) {
            throw new Error('Wallets directory not found');
        }

        // 读取目录中的所有文件
        const files = await fs.promises.readdir(PATHS.WALLETS_DIR);
        const jsonFiles = files.filter(file => file.endsWith('.json'));

        if (jsonFiles.length === 0) {
            throw new Error('No wallet files found');
        }

        // 按文件名（包含时间戳）排序，获取最新的文件
        const sortedFiles = jsonFiles.sort().reverse().slice(0, maxFiles);

        // 读取文件内容并提取 walletIds
        const walletsData = await Promise.all(
            sortedFiles.map(async file => {
                const filePath = path.join(PATHS.WALLETS_DIR, file);
                const content = await fs.promises.readFile(filePath, 'utf8');
                return JSON.parse(content) as WalletFile;
            })
        );

        // 提取并去重 walletIds
        const uniqueWalletIds = new Set<string>();
        walletsData.forEach(data => {
            data.walletIds.forEach(id => uniqueWalletIds.add(id));
        });

        return Array.from(uniqueWalletIds);
    } catch (error) {
        logger.error('获取最新钱包ID列表失败：', error);
        throw error;
    }
} 