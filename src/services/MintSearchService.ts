import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';

export class MintSearchService {
  private connection: Connection;

  constructor(rpcEndpoint: string) {
    this.connection = new Connection(rpcEndpoint);
  }

  /**
   * 获取钱包地址的mint信息
   * @param walletAddress 钱包地址
   * @param filterFailed 是否过滤失败的交易
   * @returns mint地址列表及其相关信息
   */
  async getRecentMintTransactions(
    walletAddress: string,
    filterFailed: boolean = false,
    maxTxCount: number
  ) {
    try {
      const pubKey = new PublicKey(walletAddress);
      const transactions: ParsedTransactionWithMeta[] = [];
      let before: string | undefined;
      let pageCount = 1; // 添加页码计数器
      
      // 分页获取交易记录,直到达到最大数量或没有更多数据
      while (transactions.length < maxTxCount) {
        console.log(`正在获取 ${walletAddress} - 第 ${pageCount} 页交易记录...`);
        const signatures = await this.connection.getSignaturesForAddress(
          pubKey,
          { 
            before,
            limit: Math.min(20, maxTxCount - transactions.length) // 动态调整请求数量
          }
        );

        if (signatures.length === 0) break;

        // 添加延时函数
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms 延时

        const txs = await Promise.all(
          signatures.map(sig => 
            this.connection.getParsedTransaction(sig.signature, {
              maxSupportedTransactionVersion: 0
            })
          )
        );

        transactions.push(...txs.filter((tx): tx is ParsedTransactionWithMeta => tx !== null));
        
        // 更新before用于下一次查询
        before = signatures[signatures.length - 1].signature;
        pageCount++;

        // 如果已经获取到足够的交易数量，就停止请求
        if (transactions.length >= maxTxCount) {
          console.log(`已达到最大请求数量: ${maxTxCount}`);
          break;
        }
      }

      // 分析交易中的mint信息
      const mintInfo = this.analyzeMintTransactions(transactions, filterFailed, walletAddress);
      
      return {
        data: mintInfo
      };
    } catch (error) {
      console.error('获取交易记录失败:', error);
      throw error;
    }
  }

  private analyzeMintTransactions(
    transactions: ParsedTransactionWithMeta[],
    filterFailed: boolean,
    targetAddress: string
  ) {
    const mintAddresses = new Map<string, {
      totalCount: number,
      successCount: number,
      failedCount: number,
      lastTxTime: number,
      type: string
    }>();

    transactions.forEach(tx => {
      if (!tx?.meta || !tx.blockTime) return;
      const isSuccess = tx.meta.err === null;

      // 只分析与目标地址相关的 token balances
      const allBalances = [
        ...(tx.meta.preTokenBalances || []),
        ...(tx.meta.postTokenBalances || [])
      ].filter(balance => balance.owner === targetAddress);  // 只保留目标地址的余额变化

      const uniqueMints = new Set(allBalances.map(balance => balance.mint));
      
      uniqueMints.forEach(mintAddress => {
        if (!mintAddress) return;
        
        const currentInfo = mintAddresses.get(mintAddress) || {
          totalCount: 0,
          successCount: 0,
          failedCount: 0,
          lastTxTime: 0,
          type: 'unknown'
        };

        mintAddresses.set(mintAddress, {
          totalCount: currentInfo.totalCount + 1,
          successCount: currentInfo.successCount + (isSuccess ? 1 : 0),
          failedCount: currentInfo.failedCount + (isSuccess ? 0 : 1),
          lastTxTime: Math.max(currentInfo.lastTxTime, tx.blockTime || 0),
          type: this.getTokenType(tx, mintAddress)
        });
      });
    });

    return Array.from(mintAddresses.entries())
      .filter(([_, info]) => !filterFailed || info.successCount > 0)
      .map(([address, info]) => ({
        mintAddress: address,
        totalCount: info.totalCount,
        successCount: info.successCount,
        failedCount: info.failedCount,
        lastTransactionTime: new Date(info.lastTxTime * 1000),
        type: info.type
      }));
  }

  private getTokenType(tx: ParsedTransactionWithMeta, mintAddress: string): string {
    return 'TOKEN'; // 默认返回
  }
}
