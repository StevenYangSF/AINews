# 需求文档

## 简介

本系统是一个"零运维、打开即最新"的全网 AI 动态自动化聚合与智能展示系统。系统通过 GitHub Actions 定时任务每日自动执行数据抓取、AI 智能摘要生成与静态网页构建，并自动部署至 GitHub Pages。用户只需打开固定网址即可阅读经过智能去重、分类提炼的全网最新 AI 热点资讯。

## 术语表

- **Scheduler（调度器）**：GitHub Actions Cron Job 定时触发机制，负责按计划启动整个抓取与构建流程
- **Crawler（爬虫引擎）**：负责从多个数据源并发抓取原始数据的模块
- **Deduplicator（去重引擎）**：负责跨源智能去重与多源归并的处理模块
- **Summarizer（摘要引擎）**：接入大模型 API 生成 TL;DR 摘要的模块
- **HotDetector（爆款识别器）**：基于加权算法进行跨源交叉验证、识别全网爆款的模块
- **Renderer（渲染引擎）**：将处理后的数据渲染为静态 HTML 页面的模块
- **Deployer（部署器）**：将生成的静态页面自动部署至 GitHub Pages 的模块
- **Dashboard（仪表盘）**：面向用户的前端静态展示页面
- **DataSource（数据源）**：被抓取的目标网站或 API 端点
- **HotItem（爆款条目）**：经交叉验证被标记为"今日全网超级头条"的新闻条目
- **NewsItem（新闻条目）**：从数据源抓取并处理后的单条资讯数据

## 需求

### 需求 1：定时自动化调度

**用户故事：** 作为用户，我希望系统每天自动执行数据抓取与页面构建，这样我无需任何手动操作即可查看最新资讯。

#### 验收标准

1. THE Scheduler SHALL 在每天北京时间（UTC+8）07:30 自动触发整个数据抓取与构建流程
2. WHEN Scheduler 触发成功后，THE Crawler SHALL 按照预定义的数据源列表依次启动抓取任务
3. WHEN 所有数据抓取与处理完成后，THE Renderer SHALL 生成包含最新数据的静态 HTML 页面
4. WHEN 静态页面生成完成后，THE Deployer SHALL 将页面自动部署至 GitHub Pages

### 需求 2：GitHub Trending 数据抓取

**用户故事：** 作为用户，我希望每天查看全球 Star 增长最快的 AI 开源项目，这样我能及时发现有潜力的 AI 工具和框架。

#### 验收标准

1. WHEN Scheduler 触发抓取流程时，THE Crawler SHALL 从 GitHub Trending 页面抓取当天 Star 增长最快的 AI 相关开源项目
2. THE Crawler SHALL 为每个 GitHub Trending 项目提取项目名称、今日 Star 增量、主要编程语言和功能简介
3. WHEN 抓取到的项目不属于 AI/机器学习/深度学习/Agent 类别时，THE Crawler SHALL 过滤该项目不纳入结果

### 需求 3：25 个精选 AI 站点数据抓取

**用户故事：** 作为用户，我希望从全球顶尖 AI 实验室、论文平台和行业媒体获取最新动态，这样我能全面掌握 AI 领域的前沿进展。

#### 验收标准

1. WHEN Scheduler 触发抓取流程时，THE Crawler SHALL 从以下四个类别的 25 个预定义数据源抓取最新内容：官方实验室（6 源）、论文与代码（5 源）、行业媒体（10 源）、国内生态（5 源）
2. THE Crawler SHALL 为每条抓取到的内容提取标题、发布日期、来源站点名称和原文链接
3. THE Crawler SHALL 仅抓取最近 24 小时内发布或更新的内容

### 需求 4：全球技术社区热议抓取

**用户故事：** 作为用户，我希望看到全球技术社区对 AI 话题的热门讨论，这样我能了解开发者社区的关注焦点。

#### 验收标准

1. WHEN Scheduler 触发抓取流程时，THE Crawler SHALL 从 Hacker News 抓取包含 "AI"、"LLM"、"GPT"、"Claude"、"Agent" 关键词的当日热门帖子
2. WHEN Scheduler 触发抓取流程时，THE Crawler SHALL 从 Reddit r/MachineLearning 和 Product Hunt 抓取当日最热门的 AI 相关内容
3. WHEN Scheduler 触发抓取流程时，THE Crawler SHALL 从 V2EX 的 AI 和 Deep Learning 节点抓取当日热门讨论
4. THE Crawler SHALL 为每条社区热议内容提取标题、热度指标（点赞数/评论数）、来源平台和原文链接

### 需求 5：国内科技热搜抓取

**用户故事：** 作为用户，我希望看到国内主流平台上 AI 相关的热搜话题，这样我能了解国内 AI 领域的舆论动态。

#### 验收标准

1. WHEN Scheduler 触发抓取流程时，THE Crawler SHALL 从知乎热榜抓取包含"AI"、"人工智能"、"大模型"、"GPT"等关键词的热门话题
2. WHEN Scheduler 触发抓取流程时，THE Crawler SHALL 从微博热搜抓取包含"科技"、"AI"、"大模型"等标签的高热度话题
3. THE Crawler SHALL 为每条国内热搜内容提取话题标题、热度数值和原文链接

### 需求 6：智能去重与多源归并

**用户故事：** 作为用户，我希望相同事件不在不同板块重复出现，这样我的阅读体验更加高效简洁。

#### 验收标准

1. WHEN 多个 DataSource 报道同一事件时，THE Deduplicator SHALL 将相关条目合并为一条 NewsItem
2. WHEN 多条内容被合并为一条 NewsItem 时，THE Deduplicator SHALL 在该条目底部附上所有原始来源链接
3. THE Deduplicator SHALL 基于标题语义相似度和关键实体匹配进行去重判断，相似度阈值不低于 0.8

### 需求 7：全网爆款识别

**用户故事：** 作为用户，我希望能一眼看到当天全网最火的 AI 事件，这样我不会错过重大新闻。

#### 验收标准

1. WHEN 某条内容同时出现在 3 个及以上不同类别的 DataSource 中时，THE HotDetector SHALL 将该条目标记为 HotItem
2. THE HotDetector SHALL 使用加权算法对 HotItem 进行排序，权重因素包括：出现源数量、各源热度指标、时效性
3. THE HotDetector SHALL 每日识别并输出 1 至 3 条 HotItem 作为"今日全网超级头条"

### 需求 8：AI 智能摘要生成

**用户故事：** 作为用户，我希望每条资讯都有一句话核心要点，这样我能快速了解内容大意而无需逐一阅读原文。

#### 验收标准

1. WHEN NewsItem 的原始内容超过 200 字时，THE Summarizer SHALL 调用 Google Gemini API（免费层）生成不超过 50 字的 TL;DR 摘要
2. THE Summarizer SHALL 为每条 NewsItem 自动生成 1 至 3 个分类标签，标签范围包括：模型发布、开源工具、AI Infra、行业商业、论文解读
3. IF 大模型 API 调用失败或未配置 API Key，THEN THE Summarizer SHALL 回退至使用内容的前 100 字作为摘要替代
4. THE Summarizer SHALL 默认使用 Google Gemini API 免费层（每分钟 15 次请求、每日 1500 次请求的免费额度），不产生任何费用

### 需求 9：前端 Dashboard 展示

**用户故事：** 作为用户，我希望在一个简洁美观的页面上浏览所有聚合后的 AI 资讯，这样我的阅读体验舒适且高效。

#### 验收标准

1. THE Dashboard SHALL 在页面顶部 Header 区域显示当前日期、上次数据更新时间和全网 AI 热度指数
2. THE Dashboard SHALL 在 Header 下方以醒目的 Top Banner 形式置顶展示 1 至 3 条 HotItem
3. THE Dashboard SHALL 以 Tab 或卡片布局展示三个数据板块：GitHub 趋势榜、25 源精选速览、社区与热搜
4. THE Dashboard SHALL 支持暗黑模式与明亮模式之间的切换，默认跟随用户系统偏好设置
5. THE Dashboard SHALL 适配移动端（宽度小于 768px）和桌面端（宽度大于等于 768px）的屏幕布局
6. THE Dashboard SHALL 采用极简现代的苹果风（Apple-like）设计风格，以高信噪比和阅读体验为优先

### 需求 10：容错与降级机制

**用户故事：** 作为用户，我希望即使部分数据源不可用，系统也能正常完成构建并展示可用数据，这样系统稳定可靠。

#### 验收标准

1. IF 单个 DataSource 请求超时超过 10 秒，THEN THE Crawler SHALL 跳过该数据源并记录警告日志，继续处理其余数据源
2. IF 单个 DataSource 返回反爬错误（HTTP 403/429），THEN THE Crawler SHALL 跳过该数据源并记录警告日志，继续处理其余数据源
3. IF 所有数据源均抓取失败，THEN THE Renderer SHALL 生成一个包含错误提示信息的页面，而非中断整个工作流
4. THE Crawler SHALL 设置并发请求上限为 5 个同时进行的请求，且每个请求之间保持不少于 1 秒的间隔

### 需求 11：零成本运行约束

**用户故事：** 作为用户，我希望整个系统完全运行在免费服务之上，这样我无需承担任何基础设施费用。

#### 验收标准

1. THE Scheduler SHALL 完全基于 GitHub Actions 免费额度运行，单次工作流执行时间不超过 10 分钟
2. THE Deployer SHALL 完全基于 GitHub Pages 免费服务进行静态页面托管
3. THE Summarizer SHALL 默认使用 Google Gemini API 免费层，用户无需付费；同时支持配置 OpenAI API Key 作为备选方案

### 需求 12：一键部署与小白级配置

**用户故事：** 作为零基础用户，我希望部署过程尽可能简单，只需 Fork 仓库并配置少量密钥即可完成全部部署，这样我无需学习复杂的服务器运维知识。

#### 验收标准

1. THE Deployer SHALL 支持用户通过 Fork GitHub 仓库并开启 GitHub Pages 即完成全部部署，无需额外服务器或第三方平台
2. THE Deployer SHALL 在仓库根目录提供 README 部署指南，指南步骤不超过 5 步
3. WHEN 用户将大模型 API Key 配置到 GitHub Repository Secrets 后，THE Scheduler SHALL 在下一次定时触发时自动使用该密钥调用 AI 摘要服务
4. THE Deployer SHALL 通过 GitHub Actions 的 `github-pages` 部署方式自动发布静态页面，用户无需手动执行任何构建或发布命令
5. IF 用户未配置大模型 API Key，THEN THE Summarizer SHALL 跳过 AI 摘要生成步骤，使用原文前 100 字作为替代摘要，系统其余功能正常运行
