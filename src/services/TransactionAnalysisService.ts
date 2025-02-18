import { Connection, PublicKey, ParsedTransactionWithMeta, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { logger } from '../utils/logger';

interface TransactionAnalysis {
    totalTransactions: number;      // 总交易数量（包括成功和失败的交易）
    successfulTransactions: number; // 成功执行的交易数量
    failedTransactions: number;     // 执行失败的交易数量
    transactionFrequency: number;   // 每小时平均交易频率
    totalVolume: number;            // 总交易量（SOL），包括收入和支出的总和
    averageVolume: number;          // 平均每笔交易的金额（SOL）
    firstTransactionTime: Date;     // 分析时间范围内的第一笔交易时间
    lastTransactionTime: Date;      // 分析时间范围内的最后一笔交易时间
    incomingVolume: number;         // 总收入金额（SOL）
    outgoingVolume: number;         // 总支出金额（SOL）
    incomingCount: number;          // 收入类交易的次数
    outgoingCount: number;          // 支出类交易的次数
    additionalMetrics?: {           // 附加指标，包含更多详细分析数据
        averageIncoming: number;    // 平均每笔收入金额（SOL）
        averageOutgoing: number;    // 平均每笔支出金额（SOL）
        netBalance: number;         // 净余额变化（收入总额 - 支出总额）（SOL）
        [key: string]: any;         // 为未来扩展预留的其他指标
    };
}

export class TransactionAnalysisService {
    private connection: Connection;
    private readonly DELAY_MS = 300; // 增加延迟到0.3秒
    private readonly MAX_RETRIES = 3;  // 最大重试次数
    private readonly BATCH_SIZE = 5;   // 并发请求数量

    constructor(rpcEndpoint: string) {
        this.connection = new Connection(rpcEndpoint, {
            commitment: 'confirmed',
            confirmTransactionInitialTimeout: 60000
        });
    }

    private async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async retryWithBackoff<T>(
        operation: () => Promise<T>,
        retries: number = this.MAX_RETRIES
    ): Promise<T> {
        for (let i = 0; i < retries; i++) {
            try {
                return await operation();
            } catch (error) {
                if (i === retries - 1) throw error;
                const delay = Math.min(1000 * Math.pow(2, i), 10000);
                logger.warn(`操作失败，${delay}ms 后重试...`, error);
                await this.sleep(delay);
            }
        }
        throw new Error('重试次数超过最大限制');
    }

    async analyzeWalletTransactions(
        walletAddress: string,
        timeframeHours: number
    ): Promise<TransactionAnalysis> {
        try {
            logger.info(`开始分析钱包 ${walletAddress} 最近 ${timeframeHours} 小时的交易`);

            const pubKey = new PublicKey(walletAddress);
            const currentTime = Math.floor(Date.now() / 1000);
            const startTime = currentTime - (timeframeHours * 3600);

            logger.info(`分析时间范围: ${new Date(startTime * 1000).toISOString()} 至 ${new Date(currentTime * 1000).toISOString()}`);

            const transactions: ParsedTransactionWithMeta[] = [];
            let before: string | undefined;
            let pageCount = 1;

            // 分页获取交易记录
            while (true) {
                logger.info(`正在获取第 ${pageCount} 页交易签名...`);

                const signatures = await this.retryWithBackoff(() =>
                    this.connection.getSignaturesForAddress(pubKey, { before })
                );

                logger.info(`获取到 ${signatures.length} 条交易签名`);

                if (signatures.length === 0) {
                    logger.info('没有更多交易签名，结束获取');
                    break;
                }

                const firstTxTime = signatures[0].blockTime;
                const lastTxTime = signatures[signatures.length - 1].blockTime;

                // 添加时间段日志
                logger.info(`当前批次时间范围: ${firstTxTime ? new Date(firstTxTime * 1000).toISOString() : 'unknown'
                    } 至 ${lastTxTime ? new Date(lastTxTime * 1000).toISOString() : 'unknown'
                    }`);

                // 检查是否所有交易都已超出时间范围
                if (firstTxTime && firstTxTime < startTime) {
                    logger.info('所有交易都已超出查询时间范围，结束获取');
                    break;
                }

                // 过滤掉超出时间范围的签名
                const validSignatures = signatures.filter(
                    sig => sig.blockTime && sig.blockTime >= startTime
                );

                if (validSignatures.length === 0) {
                    logger.info('当前批次没有在时间范围内的有效签名，结束获取');
                    break;
                }

                // 批量处理交易，限制并发数
                let batchCount = 1;
                for (let i = 0; i < validSignatures.length; i += this.BATCH_SIZE) {
                    const batch = validSignatures.slice(i, i + this.BATCH_SIZE);

                    // 处理一批交易
                    const batchTxs = await Promise.all(
                        batch.map(sig =>
                            this.retryWithBackoff(() =>
                                this.connection.getParsedTransaction(sig.signature, {
                                    maxSupportedTransactionVersion: 0
                                })
                            )
                        )
                    );

                    const validTxs = batchTxs.filter((tx): tx is ParsedTransactionWithMeta =>
                        tx !== null &&
                        typeof tx.blockTime === 'number' &&
                        tx.blockTime >= startTime
                    );

                    logger.info(`处理第 ${pageCount} 页的第 ${batchCount} 批交易，批次大小: ${batch.length}, 本批次获取到 ${batchTxs.length} 笔交易，其中有效交易 ${validTxs.length} 笔`);

                    transactions.push(...validTxs);

                    // 批次间延迟
                    await this.sleep(this.DELAY_MS);
                    batchCount++;
                }

                if (signatures.length < 1000) {
                    logger.info('当前页签名数量小于1000，无需继续获取');
                    break;
                }

                // 更新before值为最后一个有效签名
                before = signatures[signatures.length - 1].signature;

                // 添加最大页数限制，防止极端情况下的死循环
                if (pageCount >= 50) {
                    logger.warn('达到最大页数限制(50页)，停止获取更多交易');
                    break;
                }

                pageCount++;
            }

            logger.info(`交易数据获取完成，共获取到 ${transactions.length} 笔有效交易，开始分析...`);
            const analysis = this.analyzeTransactions(transactions, timeframeHours);
            logger.info('交易分析完成', {
                totalTransactions: analysis.totalTransactions,
                successfulTransactions: analysis.successfulTransactions,
                failedTransactions: analysis.failedTransactions,
                transactionFrequency: analysis.transactionFrequency,
                totalVolume: analysis.totalVolume,
                timeRange: `${analysis.firstTransactionTime} 至 ${analysis.lastTransactionTime}`
            });

            return analysis;

        } catch (error) {
            logger.error('分析钱包交易失败:', error);
            throw error;
        }
    }

    private analyzeTransactions(
        transactions: ParsedTransactionWithMeta[],
        timeframeHours: number
    ): TransactionAnalysis {
        let totalVolume = 0;
        let successfulTxs = 0;
        let firstTxTime = Date.now();
        let lastTxTime = 0;
        // 添加收支统计
        let incomingVolume = 0;
        let outgoingVolume = 0;
        let incomingCount = 0;
        let outgoingCount = 0;

        transactions.forEach(tx => {
            if (!tx.meta || !tx.blockTime) return;

            // 更新交易时间范围
            const txTime = tx.blockTime * 1000;
            firstTxTime = Math.min(firstTxTime, txTime);
            lastTxTime = Math.max(lastTxTime, txTime);

            // 统计成功交易
            if (tx.meta.err === null) {
                successfulTxs++;

                // 计算交易金额（SOL）
                const preBalance = tx.meta.preBalances[0] || 0;
                const postBalance = tx.meta.postBalances[0] || 0;
                const balanceChange = postBalance - preBalance;
                const volumeInSol = Math.abs(balanceChange) / LAMPORTS_PER_SOL;
                totalVolume += volumeInSol;

                // 判断收支类型
                if (balanceChange > 0) {
                    incomingVolume += volumeInSol;
                    incomingCount++;
                    logger.info(`检测到收入交易: ${volumeInSol} SOL, 签名: ${tx.transaction.signatures[0]}`);
                } else if (balanceChange < 0) {
                    outgoingVolume += volumeInSol;
                    outgoingCount++;
                    logger.info(`检测到支出交易: ${volumeInSol} SOL, 签名: ${tx.transaction.signatures[0]}`);
                }
            }
        });

        const totalTxs = transactions.length;
        const failedTxs = totalTxs - successfulTxs;
        const txFrequency = totalTxs / timeframeHours;

        return {
            totalTransactions: totalTxs,
            successfulTransactions: successfulTxs,
            failedTransactions: failedTxs,
            transactionFrequency: parseFloat(txFrequency.toFixed(2)),
            totalVolume: parseFloat(totalVolume.toFixed(4)),
            averageVolume: parseFloat((totalVolume / successfulTxs || 0).toFixed(4)),
            firstTransactionTime: new Date(firstTxTime),
            lastTransactionTime: new Date(lastTxTime),
            // 添加收支分析结果
            incomingVolume: parseFloat(incomingVolume.toFixed(4)),
            outgoingVolume: parseFloat(outgoingVolume.toFixed(4)),
            incomingCount,
            outgoingCount,
            additionalMetrics: {
                // 添加一些额外的收支指标
                averageIncoming: parseFloat((incomingVolume / incomingCount || 0).toFixed(4)),
                averageOutgoing: parseFloat((outgoingVolume / outgoingCount || 0).toFixed(4)),
                netBalance: parseFloat((incomingVolume - outgoingVolume).toFixed(4))
            }
        };
    }
}