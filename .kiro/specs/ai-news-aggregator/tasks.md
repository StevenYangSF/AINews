# Implementation Plan

## Overview

本实现计划将 AI 动态聚合系统拆分为 8 个主任务，从基础设施搭建到最终的 CI/CD 配置，按依赖顺序执行。

## Tasks

### Task 1: 项目初始化与基础设施
- [ ] 1.1 创建 package.json，配置项目元信息与依赖（cheerio, rss-parser, @google/generative-ai）
- [ ] 1.2 创建 src/config.js，定义所有 30+ 数据源 URL 配置和分类常量
- [ ] 1.3 创建 src/utils.js，实现带超时、重试和并发控制的 fetch 工具函数

### Task 2: 爬虫引擎 - GitHub Trending
- [ ] 2.1 创建 src/crawler/github-trending.js，使用 Cheerio 解析 GitHub Trending 页面，提取 AI 相关项目（名称、Star 增量、语言、简介）
- [ ] 2.2 实现 AI 类别过滤逻辑，基于关键词和 topic 标签筛选 AI/ML/DL/Agent 项目

### Task 3: 爬虫引擎 - 25 精选站点
- [ ] 3.1 创建 src/crawler/sites.js，实现官方实验室类（OpenAI、Anthropic、DeepMind、Meta AI、Microsoft Research、NVIDIA）的 RSS/HTML 抓取
- [ ] 3.2 实现论文与代码类（Hugging Face Papers、arXiv、Papers with Code、Stanford HAI、Berkeley BAIR）的抓取
- [ ] 3.3 实现行业媒体类（TechCrunch、MIT Tech Review、The Verge、Ars Technica、VentureBeat、The Batch、Latent Space、SemiAnalysis、The Information）的 RSS 抓取
- [ ] 3.4 实现国内生态类（机器之心、量子位、智源社区、中国人工智能学会、新智元）的抓取

### Task 4: 爬虫引擎 - 社区与热搜
- [ ] 4.1 创建 src/crawler/communities.js，实现 Hacker News（Algolia API）AI 关键词过滤抓取
- [ ] 4.2 实现 Reddit r/MachineLearning（JSON API）和 Product Hunt 抓取
- [ ] 4.3 实现 V2EX AI/Deep Learning 节点抓取
- [ ] 4.4 创建 src/crawler/china-trending.js，实现知乎热榜和微博热搜的 AI 话题抓取

### Task 5: 爬虫调度器
- [ ] 5.1 创建 src/crawler/index.js，实现 CrawlerScheduler 类，协调所有爬虫模块的并发执行（concurrency=5, timeout=10s, retry=1）

### Task 6: 数据处理管道
- [ ] 6.1 创建 src/processor/deduplicator.js，实现基于 Jaccard 相似度的标题去重与多源归并逻辑
- [ ] 6.2 创建 src/processor/hot-detector.js，实现加权算法的全网爆款识别器（跨类别≥3源标记为 HotItem）
- [ ] 6.3 创建 src/processor/summarizer.js，实现 Google Gemini API 调用生成 TL;DR 摘要和自动标签，含降级逻辑

### Task 7: 渲染引擎与前端 Dashboard
- [ ] 7.1 创建 template/index.html，实现 Apple 风格极简 Dashboard（Tailwind CSS CDN），含 Header、Top Banner、Tab 布局、暗黑模式、响应式设计
- [ ] 7.2 创建 src/renderer/index.js，实现将 DailyData 注入 HTML 模板并输出到 dist/ 目录的渲染逻辑

### Task 8: 主控脚本与 GitHub Actions
- [ ] 8.1 创建 src/main.js，串联 Crawler → Deduplicator → HotDetector → Summarizer → Renderer 完整管道
- [ ] 8.2 创建 .github/workflows/daily-build.yml，配置每日定时触发（cron UTC 23:30）、Node.js 环境、构建脚本执行和 GitHub Pages 部署
- [ ] 8.3 创建 README.md，编写 5 步以内的小白级部署指南（Fork → Secrets → 开启 Pages → 完成）

## Task Dependency Graph

```
Task 1 (基础设施)
├── Task 2 (GitHub Trending) ─────┐
├── Task 3 (25 精选站点) ──────────┤
├── Task 4 (社区与热搜) ──────────┤
│                                  ▼
│                          Task 5 (爬虫调度器)
│                                  │
├── Task 6 (数据处理管道) ─────────┤
├── Task 7 (渲染引擎+Dashboard) ──┤
│                                  ▼
│                          Task 8 (主控+Actions)
```

## Notes

- 所有爬虫模块（Task 2-4）可并行开发，但 Task 5 的调度器需要等它们全部完成
- Task 6 的处理管道与爬虫模块无强依赖，可并行开发
- Task 8 的主控脚本依赖 Task 5、6、7 全部完成
- 前端 Dashboard（Task 7）可独立开发，不依赖后端数据逻辑
