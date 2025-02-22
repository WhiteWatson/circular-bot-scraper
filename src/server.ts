import express from 'express';
import { WebScraper } from './services/scraper';
import { MintSearchService } from './services/MintSearchService';
import { logger } from './utils/logger';
import { config } from './config/config';
import { getLatestWalletIds } from './utils/dataProcessor';
import { TransactionAnalysisService } from './services/TransactionAnalysisService';

export class Server {
  private static instance: Server;
  private app: express.Application;
  private port: number;
  private mintSearchService: MintSearchService;
  private transactionAnalysisService: TransactionAnalysisService;

  private constructor() {
    this.app = express();
    this.port = config.server.port;

    // 使用配置文件中的 RPC 端点
    this.mintSearchService = new MintSearchService(config.rpc.endpoint);
    this.transactionAnalysisService = new TransactionAnalysisService(config.rpc.endpoint);

    // 添加中间件
    this.app.use(express.json());

    this.setupRoutes();
  }

  public static getInstance(): Server {
    if (!Server.instance) {
      Server.instance = new Server();
    }
    return Server.instance;
  }

  private setupRoutes(): void {
    // 健康检查接口
    this.app.get('/health', (_, res) => {
      res.json({ status: 'ok' });
    });

    // 手动触发抓取接口
    this.app.post('/api/scrape', async (_, res) => {
      try {
        const scraper = WebScraper.getInstance();
        const result = await scraper.scrape();
        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        logger.error('手动触发抓取失败：', error);
        res.status(500).json({
          success: false,
          error: 'Scraping failed'
        });
      }
    });

    // Mint 搜索接口
    this.app.post('/api/mint-search', async (req, res) => {
      try {
        const { walletAddress, filterFailed = false, maxTxCount = 100 } = req.body;
        logger.info('Mint搜索请求参数:', { walletAddress, filterFailed, maxTxCount });

        if (!walletAddress) {
          return res.status(400).json({
            success: false,
            error: 'Wallet address is required'
          });
        }

        const result = await this.mintSearchService.getRecentMintTransactions(
          walletAddress,
          filterFailed,
          maxTxCount
        );

        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        logger.error('Mint搜索失败：', error);
        res.status(500).json({
          success: false,
          error: 'Mint search failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // 获取最新数据接口
    this.app.get('/api/latest', (_, res) => {
      try {
        // TODO: 实现获取最新数据的逻辑
        res.json({
          success: true,
          data: 'Not implemented yet'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to get latest data'
        });
      }
    });

    // 获取最新 Mints 列表接口
    this.app.get('/api/latest-mintslist', async (req, res) => {
      try {
        // 从查询参数中获取要处理的钱包数量，默认为 1
        const walletCount = parseInt(req.query.walletCount as string) || 1;

        // 获取最新的钱包ID列表
        const walletIds = await getLatestWalletIds(1);
        logger.info(`获取到 ${walletIds.length} 个唯一钱包地址，将处理前 ${walletCount} 个钱包`);

        // 并行执行指定数量钱包的 mint 搜索
        const mintResults = await Promise.all(
          walletIds.slice(0, walletCount).map(async walletId => {
            try {
              const result = await this.mintSearchService.getRecentMintTransactions(
                walletId,
                false,
                100
              );
              // 从返回的数据结构中正确提取 mintAddress
              return result.data.map(item => item.mintAddress);
            } catch (error) {
              logger.error(`处理钱包 ${walletId} 失败:`, error);
              return [];
            }
          })
        );

        // 合并所有结果并去重
        const allMints = Array.from(new Set(
          mintResults.flat()
        ));

        // 打印结果到控制台
        logger.info('Mint 搜索结果:', JSON.stringify(allMints, null, 2));

        // 返回结果
        res.json(allMints);
      } catch (error) {
        logger.error('获取最新 Mints 列表失败：', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get latest mints list',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // 钱包交易分析接口
    this.app.post('/api/analyze-transactions', async (req, res) => {
      try {
        const { walletAddress, timeframeHours } = req.body;

        if (!walletAddress) {
          return res.status(400).json({
            success: false,
            error: 'Wallet address is required'
          });
        }

        if (!timeframeHours || timeframeHours <= 0) {
          return res.status(400).json({
            success: false,
            error: 'Valid timeframe in hours is required'
          });
        }

        const analysis = await this.transactionAnalysisService.analyzeWalletTransactions(
          walletAddress,
          timeframeHours
        );

        res.json({
          success: true,
          data: analysis
        });
      } catch (error) {
        logger.error('交易分析失败：', error);
        res.status(500).json({
          success: false,
          error: 'Transaction analysis failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  public start(): void {
    this.app.listen(this.port, () => {
      logger.info(`服务器已启动，监听端口 ${this.port}`);
    });
  }
}