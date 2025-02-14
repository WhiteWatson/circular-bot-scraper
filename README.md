# Circular Bot Scraper

一个基于 TypeScript 的自动化网页数据采集工具，用于抓取 circular.bot 网站的数据。

## 功能特点

- 🔄 自动定时抓取网页数据
- 📊 监控并获取 API 数据
- 🌐 跨平台支持 (Windows, macOS, Linux)
- 📝 TypeScript 类型支持
- 🎯 单例模式设计
- 📦 模块化架构
- 🔍 完整的错误处理
- 📋 统一的日志管理

## 使用方法

1. 配置文件设置

```bash
# 复制配置文件模板
cp src/config/config.template.ts src/config/config.ts
```

2. 编辑配置文件，填入你的 RPC 节点，可以用免费的，没有的话跑不起来

3. 安装依赖

```bash
npm install
```

```bash
   # Linux 环境配置（如果在 Linux 服务器上运行）安装必要的系统依赖
   sudo apt-get update
   sudo apt-get install -y \
       chromium-browser \
       libnss3 \
       libatk1.0-0 \
       libatk-bridge2.0-0 \
       libcups2 \
       libdrm2 \
       libxkbcommon0 \
       libxcomposite1 \
       libxdamage1 \
       libxfixes3 \
       libxrandr2 \
       libgbm1 \
       libasound2 \
       libpango-1.0-0 \
       libcairo2 \
       libatspi2.0-0
```

4. 运行脚本

```bash
npm run start
```

如果看到日志有输出这句话，证明你的机器运行的没问题
```
[INFO] 服务器已启动，监听端口 3000
```

5. 测试一下

开一个新的ssh链接，输入

```bash
curl -X GET http://127.0.0.1:3000/api/latest-mintslist?walletCount=1 \
-H "Content-Type: application/x-www-form-urlencoded"
```

稍等一下（1分钟），如果看到输出了mints地址列表，证明测试成功

## 在后台运行脚本

上面的流程是在前台运行，关闭了ssh链接脚本就停了，如果想让脚本持续运行，可以用pm2管理器管理脚本程序运行

```bash
npm i pm2 -g
```

```bash
pm2 start npm --name "circular-bot" -- run start
```

## 与套利系统联动，全自动获取mints

推荐使用 https://github.com/SaoXuan/rust-mev-bot-shared 套利机器人，作者靠谱，社区活跃，对小白友好

如何设置联动：

**修改**Rust Solana mev套利机器人配置文件中的`load_mints_from_url`
```
load_mints_from_url: 'http://127.0.0.1:3000/api/latest-mintslist?walletCount=5'
```

**删除**Rust Solana mev套利机器人配置文件中的`birdeye_api_key` ，或者把这行配置改成空 ""

随后重新启动Rust Solana mev套利机器人
