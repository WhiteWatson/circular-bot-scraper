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
npm run dev
```

## 在后台运行脚本

```bash
pm2 start npm --name "circular-bot" -- run dev
```
