# 技术设计文档

## 概述

本系统采用 Node.js 技术栈，以"数据管道"模式实现从数据抓取到静态页面部署的全自动化流程。整体架构为无服务器（Serverless）设计，完全运行在 GitHub Actions 免费额度之上。

## 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                   GitHub Actions Cron                     │
│                  (UTC 23:30 = 北京 07:30)                 │
└──────────────────────────┬──────────────────────────────┘
                           │ 触发
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    主控脚本 (main.js)                      │
│  ┌──────┐  ┌──────────┐  ┌───────┐  ┌────────┐  ┌────┐ │
│  │Crawler│→│Deduplicator│→│HotDetect│→│Summarizer│→│Render│ │
│  └──────┘  └──────────┘  └───────┘  └────────┘  └────┘ │
└──────────────────────────┬──────────────────────────────┘
                           │ 输出 HTML + JSON
                           ▼
┌─────────────────────────────────────────────────────────┐
│              GitHub Pages 自动部署                         │
│              (peaceiris/actions-gh-pages)                 │
└─────────────────────────────────────────────────────────┘
```

## 数据流

```
数据源 (30+) → 原始数据 (RawItem[]) → 去重合并 (NewsItem[]) → 爆款识别 (HotItem[]) → AI 摘要 → 静态 HTML
```

## 目录结构

```
AINews/
├── .github/
│   └── workflows/
│       └── daily-build.yml          # GitHub Actions 工作流
├── src/
│   ├── main.js                      # 主控入口
│   ├── crawler/
│   │   ├── index.js                 # 爬虫调度器
│   │   ├── github-trending.js       # GitHub Trending 抓取
│   │   ├── sites.js                 # 25 精选站点抓取
│   │   ├── communities.js           # 社区热议抓取
│   │   └── china-trending.js        # 国内热搜抓取
│   ├── processor/
│   │   ├── deduplicator.js          # 去重引擎
│   │   ├── hot-detector.js          # 爆款识别器
│   │   └── summarizer.js            # AI 摘要引擎
│   ├── renderer/
│   │   └── index.js                 # HTML 渲染器
│   ├── config.js                    # 数据源配置
│   └── utils.js                     # 工具函数（fetch、重试、并发控制）
├── template/
│   └── index.html                   # Dashboard HTML 模板
├── dist/                            # 构建输出目录（部署到 GitHub Pages）
│   ├── index.html
│   └── data.json
├── package.json
└── README.md                        # 小白部署指南
```

## 数据模型

### RawItem（原始抓取条目）

```typescript
interface RawItem {
  title: string;              // 标题
  url: string;                // 原文链接
  source: string;             // 来源站点名称
  category: 'github' | 'labs' | 'papers' | 'media' | 'community' | 'china';
  publishedAt: string;        // ISO 日期字符串
  content?: string;           // 正文摘要（部分源可用）
  metadata?: {
    stars?: number;           // GitHub Star 增量
    language?: string;        // 编程语言
    score?: number;           // 热度分数
    comments?: number;        // 评论数
  };
}
```

### NewsItem（处理后条目）

```typescript
interface NewsItem {
  id: string;                 // 唯一 ID（基于 URL hash）
  title: string;
  urls: string[];             // 多源合并后的所有链接
  sources: string[];          // 所有来源名称
  category: string;
  publishedAt: string;
  summary: string;            // TL;DR 摘要（≤50字）
  tags: string[];             // 自动标签
  score: number;              // 综合热度分
  isHot: boolean;             // 是否为爆款
}
```

### DailyData（每日输出数据）

```typescript
interface DailyData {
  date: string;               // 日期 YYYY-MM-DD
  updatedAt: string;          // 更新时间 ISO
  heatIndex: number;          // 全网 AI 热度指数
  hotItems: NewsItem[];       // 今日爆款（1-3 条）
  github: NewsItem[];         // GitHub 趋势榜
  curated: NewsItem[];        // 25 源精选
  community: NewsItem[];      // 社区热搜
  stats: {
    totalSources: number;
    successSources: number;
    failedSources: string[];
  };
}
```

## 模块设计

### 1. Crawler（爬虫引擎）

**设计原则：** 并发控制 + 超时降级 + 插件化数据源

```javascript
// 并发控制：最多 5 个并行请求，间隔 ≥1s
// 超时：单源 10s 超时自动跳过
// 重试：失败后重试 1 次，间隔 2s

class CrawlerScheduler {
  constructor(options = { concurrency: 5, timeout: 10000, retries: 1 })
  async crawlAll(): Promise<{ results: RawItem[], errors: string[] }>
}
```

**各数据源抓取策略：**

| 数据源 | 方式 | 解析方法 |
|--------|------|----------|
| GitHub Trending | HTTP GET | Cheerio HTML 解析 |
| OpenAI/Anthropic/DeepMind 等官方博客 | HTTP GET / RSS | RSS 解析 / Cheerio |
| Hugging Face Papers | HTTP GET | JSON API |
| arXiv | RSS Feed | XML 解析 |
| Hacker News | Algolia API | JSON |
| Reddit | JSON API (.json 后缀) | JSON |
| V2EX | API | JSON |
| 知乎/微博 | HTTP GET | Cheerio |
| TechCrunch/Verge 等 | RSS Feed | XML 解析 |

### 2. Deduplicator（去重引擎）

**算法：** 基于标题相似度的轻量去重（无需外部 NLP 服务）

```javascript
class Deduplicator {
  // 1. 标题预处理：小写化、去标点、分词
  // 2. 基于 Jaccard 相似度计算（词集合交集/并集）
  // 3. 阈值 ≥ 0.6 判定为同一事件（标题较短，阈值适当降低）
  // 4. 合并策略：保留最长标题，聚合所有 URL 和 sources
  deduplicate(items: RawItem[]): NewsItem[]
}
```

### 3. HotDetector（爆款识别器）

**加权算法：**

```javascript
class HotDetector {
  // 热度分 = 出现源数量 × 3 + 跨类别数 × 5 + 热度指标归一化分 × 2
  // 爆款条件：跨 ≥3 个不同类别的数据源
  // 输出：取 Top 1~3 作为 HotItem
  detect(items: NewsItem[]): NewsItem[]
}
```

### 4. Summarizer（摘要引擎）

**设计：** 优先 Gemini API 免费层，降级使用截断

```javascript
class Summarizer {
  // API: Google Gemini 2.0 Flash (免费层)
  // Prompt: "用中文一句话总结以下内容的核心要点（不超过50字），并给出1-3个标签"
  // 降级: 无 API Key 或调用失败 → 取 content 前 100 字
  // 限流: 每分钟最多 15 次请求，批量处理时加延迟
  async summarize(items: NewsItem[]): Promise<NewsItem[]>
}
```

### 5. Renderer（渲染引擎）

**设计：** 基于模板字符串生成静态 HTML

```javascript
class Renderer {
  // 读取 template/index.html 模板
  // 注入 DailyData 为 JSON（内嵌 <script> 标签）
  // 前端 JS 读取数据动态渲染各板块
  // 同时输出 dist/data.json 供调试使用
  render(data: DailyData): string
}
```

### 6. 前端 Dashboard

**技术选型：** 纯静态 HTML + Tailwind CSS CDN + 原生 JavaScript

**页面结构：**
```html
<!-- Header: 日期 + 更新时间 + 热度指数 -->
<!-- Top Banner: HotItems 轮播/列表 -->
<!-- Tabs: GitHub趋势 | 精选速览 | 社区热搜 -->
<!-- 每个 Tab 内为卡片列表 -->
<!-- Footer: 数据源状态统计 -->
```

**交互功能：**
- 暗黑/明亮模式切换（`prefers-color-scheme` + 手动切换按钮）
- Tab 切换展示不同板块
- 响应式布局（Tailwind 断点：md:768px）
- 卡片组件展示标题、摘要、标签、来源链接

## GitHub Actions 工作流设计

```yaml
name: Daily AI News Build
on:
  schedule:
    - cron: '30 23 * * *'  # UTC 23:30 = 北京时间 07:30
  workflow_dispatch: {}       # 支持手动触发

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: node src/main.js
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## 容错设计

| 场景 | 处理策略 |
|------|----------|
| 单源超时（>10s） | 跳过 + 记录 warning |
| 单源 HTTP 403/429 | 跳过 + 记录 warning |
| Gemini API 失败 | 使用前 100 字替代摘要 |
| 未配置 API Key | 跳过摘要步骤，使用截断文本 |
| 全部数据源失败 | 渲染错误提示页面 |
| 工作流超时 | GitHub Actions 10 分钟硬限制 |

## 依赖清单

```json
{
  "dependencies": {
    "cheerio": "^1.0.0",
    "rss-parser": "^3.13.0",
    "@google/generative-ai": "^0.21.0"
  }
}
```

使用 Node.js 内置 `fetch`（Node 20+），不需要额外 HTTP 库。

## 需求追溯

| 需求 | 对应设计模块 |
|------|-------------|
| 需求 1: 定时调度 | GitHub Actions workflow + main.js |
| 需求 2: GitHub Trending | crawler/github-trending.js |
| 需求 3: 25 精选站点 | crawler/sites.js |
| 需求 4: 全球社区 | crawler/communities.js |
| 需求 5: 国内热搜 | crawler/china-trending.js |
| 需求 6: 智能去重 | processor/deduplicator.js |
| 需求 7: 爆款识别 | processor/hot-detector.js |
| 需求 8: AI 摘要 | processor/summarizer.js |
| 需求 9: 前端展示 | template/index.html + renderer |
| 需求 10: 容错降级 | utils.js + CrawlerScheduler |
| 需求 11: 零成本 | GitHub Actions + Pages + Gemini 免费层 |
| 需求 12: 一键部署 | README.md + workflow 配置 |
