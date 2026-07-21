# 🤖 AI Daily — 全网 AI 动态自动化聚合系统

> 零运维、打开即最新。每天自动抓取全网 30+ AI 信息源，智能去重摘要，生成精美阅读页面。

## ✨ 特性

- 🕐 **每日自动更新** — GitHub Actions 每天北京时间 7:30 自动运行
- 🌐 **30+ 数据源** — 覆盖 GitHub Trending、顶级 AI 实验室、论文平台、行业媒体、社区热议
- 🤖 **AI 智能摘要** — Gemini API 一句话提炼核心要点
- 🔥 **爆款识别** — 跨源交叉验证，自动标记全网超级头条
- 🎨 **极简设计** — Apple 风格，暗黑模式，手机适配
- 💰 **完全免费** — 运行在 GitHub Actions + Pages 免费额度之上

## 🚀 5 步部署指南

### 第 1 步：Fork 本仓库

点击右上角 **Fork** 按钮，将本仓库复制到你的 GitHub 账号下。

### 第 2 步：配置 API Key（可选）

> 不配置也能运行！只是摘要会使用文本截断代替 AI 生成。

1. 进入你 Fork 的仓库 → **Settings** → **Secrets and variables** → **Actions**
2. 点击 **New repository secret**
3. 名称填：`GEMINI_API_KEY`
4. 值填：你的 [Google AI Studio](https://aistudio.google.com/apikey) 免费 API Key

### 第 3 步：开启 GitHub Pages

1. 进入仓库 → **Settings** → **Pages**
2. **Source** 选择 **GitHub Actions**
3. 保存

### 第 4 步：手动触发第一次构建

1. 进入仓库 → **Actions** → 左侧选 **Daily AI News Build**
2. 点击 **Run workflow** → **Run workflow**
3. 等待 2-5 分钟构建完成

### 第 5 步：访问你的网站 🎉

打开 `https://你的用户名.github.io/AINews/` 即可查看！

---

## 📁 项目结构

```
AINews/
├── .github/workflows/daily-build.yml  # 自动化工作流
├── src/
│   ├── main.js                        # 主控入口
│   ├── config.js                      # 数据源配置
│   ├── utils.js                       # 工具函数
│   ├── crawler/                       # 爬虫引擎
│   │   ├── index.js                   # 调度器
│   │   ├── github-trending.js         # GitHub Trending
│   │   ├── sites.js                   # 25 精选站点
│   │   ├── communities.js             # 社区热议
│   │   └── china-trending.js          # 国内热搜
│   ├── processor/                     # 数据处理
│   │   ├── deduplicator.js            # 去重引擎
│   │   ├── hot-detector.js            # 爆款识别
│   │   └── summarizer.js              # AI 摘要
│   └── renderer/
│       └── index.js                   # HTML 渲染
├── template/
│   └── index.html                     # Dashboard 模板
├── dist/                              # 构建输出（自动生成）
└── package.json
```

## ⚙️ 本地开发

```bash
# 安装依赖
npm install

# 运行构建（可选配置环境变量）
GEMINI_API_KEY=your_key node src/main.js

# 查看结果
open dist/index.html
```

## 📝 License

MIT
# AINews
