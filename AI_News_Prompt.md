# 角色与目标

你是一个名为 Kiro 的全智能自动化助理兼高级全栈开发专家。你的核心任务是：**设计并实现一个“零运维、打开即最新”的全网 AI 动态与实战技巧自动化聚合展示系统**。

我不需要管理任何服务器，也不需要每天手动运行脚本。我只需要在浏览器中打开一个固定的主页网址（GitHub Pages 或 Vercel），就能直接阅读**每天自动抓取、智能去重、分类提炼好的全网最新 AI 爆款热点、GitHub 趋势榜、最新 AI Agents 动态、AI 实用 Skill/技巧以及 25 个核心源的极简总结**。

---

## 核心任务拆解

请帮我编写完整的自动化脚本（Node.js 或 Python）、GitHub Actions 配置文件、前端单页（Dashboard）代码，以及一份小白级部署指南。系统需涵盖以下 5 个阶段：

### 1. 零运维自动化与“打开即最新”机制
* **定时自动构建**：使用 GitHub Actions 配置 Cron Job，设定每天 UTC+8 北京时间早上 7:30 自动在云端触发抓取、AI 总结与网页构建任务。
* **无缝静态部署**：脚本运行完毕后，自动将最新生成的静态页面（HTML）与 JSON 数据自动部署至 GitHub Pages，保证我每天打开该网址永远呈现最新内容。
* **技术栈建议**：优先使用 Node.js（配合 Playwright / Cheerio / RSS 解析）或 Python 进行并发抓取，确保轻量稳定。

---

### 2. 多维度全网数据抓取源

请编写稳定且带超时重试机制的抓取逻辑，数据源需覆盖以下 **5 大板块**：

#### 板块一：GitHub 全球 AI 趋势榜
* **GitHub Trending**：抓取当天 Star 增长最快的开源 AI 库、**AI Agent 框架**（如 CrewAI, AutoGen, LangChain 等）和 AI 工具（包含项目名、今日 Star 增量、主要语言、功能简介）。

#### 板块二：25 个高质量精选 AI 站点（核心信息源）
1. **官方实验室（事实锚点）**：
   * OpenAI News (`https://openai.com/news/`)
   * Anthropic Research/News (`https://www.anthropic.com/research`, `https://www.anthropic.com/news`)
   * Google DeepMind Blog (`https://deepmind.google/discover/blog/`)
   * Meta AI Blog (`https://ai.meta.com/blog/`)
   * Microsoft Research AI (`https://www.microsoft.com/en-us/research/research-area/artificial-intelligence/`)
   * NVIDIA Technical Blog (`https://developer.nvidia.com/blog/`)
2. **论文与代码（技术趋势）**：
   * Hugging Face Papers (`https://huggingface.co/papers`)
   * arXiv (cs.AI / cs.LG / cs.CL / cs.CV) (`https://arxiv.org/list/cs.AI/recent`)
   * Papers with Code (`https://paperswithcode.com/`)
   * Stanford HAI / AI Index (`https://hai.stanford.edu/`)
   * Berkeley BAIR Blog (`https://bair.berkeley.edu/blog/`)
3. **行业媒体/Newsletter（商业与应用）**：
   * The Information (`https://www.theinformation.com/`)
   * TechCrunch AI (`https://techcrunch.com/category/artificial-intelligence/`)
   * MIT Technology Review: AI (`https://www.technologyreview.com/topic/artificial-intelligence/`)
   * The Verge: AI (`https://www.theverge.com/ai-artificial-intelligence`)
   * Ars Technica: AI (`https://arstechnica.com/tag/artificial-intelligence/`)
   * VentureBeat AI (`https://venturebeat.com/category/ai/`)
   * The Batch by DeepLearning.AI (`https://www.deeplearning.ai/the-batch/`)
   * Latent Space (`https://www.latent.space/`)
   * SemiAnalysis (`https://www.semianalysis.com/`)
4. **国内权威生态（国内大模型与产业）**：
   * 机器之心 (`https://www.jiqizhixin.com/`)
   * 量子位 (`https://www.qbitai.com/`)
   * 智源社区 (`https://hub.baai.ac.cn/`)
   * 中国人工智能学会 (`https://www.caai.cn/`)
   * 新智元 (`https://aiera.com.cn/`)

#### 板块三：全球技术社区热议与 AI Agents 动态
* **Hacker News**：含有 "AI", "LLM", "Agent", "Claude", "GPT", "Multi-Agent" 等关键词的当日 Top 热帖。
* **Reddit / Product Hunt**：r/MachineLearning, r/ArtificialInteligence 或 Product Hunt 上当日最火的 AI Agents 与 AI 新应用。
* **V2EX**：AI / Deep Learning 节点的当日热门讨论。

#### 板块四：国内科技热搜
* **知乎热榜 / 微博热搜**：带有“科技/AI/大模型”标签的当日高热度话题。

#### 板块五：AI 使用技巧与实战 Skill（新增）
* **AI 效率与 Skill 源**：抓取 X/Twitter 热门 AI 技巧总结、X/V2EX/小红书/知乎关于 **Prompt 提示词工程、Cursor 编程技巧、Claude Computer Use / Artifacts 实战用法、AI 工作流（Workflow）** 的高赞干货。

---

### 3. AI 交叉去重与爆款识别（处理模块）

* **🔥 全网爆款识别（加权算法）**：若某项动态同时出现在 GitHub 趋势榜、Hacker News 以及新闻站点中，自动将其标记为 **“今日全网超级头条”** 并给予最高显示优先级。
* **智能去重与多源归并**：若不同平台报道同一事件，自动合并为一条，并在底部附上所有来源链接。
* **智能 TL;DR 摘要**：接入大模型 API（如 Gemini API / OpenAI API），将复杂或冗长的报道提炼为 **“一句话核心要点（TL;DR）”**，如果是技巧类内容，提炼出 **“核心操作步骤/Prompt 模板”**。
* **自动标签与分类**：为内容自动打上 `#模型发布`、`#AI Agents`、`#实用Skill`、`#Prompt工程`、`#开源工具`、`#AI Infra`、`#行业商业` 等标签。

---

### 4. 前端网页与 UI 设计（展示模块）

* **设计风格**：极简、现代、苹果风（Apple-like Design）。干净优雅，高信噪比，注重阅读体验。
* **页面结构**：
  * **Header**：显示当前日期（如 `📅 2026年7月21日`）、上次更新时间及全网 AI 热度指数。
  * **今日全网爆款（Top Banner）**：置顶展示 1~3 条交叉验证的全局大事件/爆款开源项目/重磅 Agent 发布。
  * **多维数据大盘（Tab / 卡片布局）**：
    1. **🚀 GitHub 趋势榜**（开源黑马、Star 暴涨项目）
    2. **🤖 AI Agents & 前沿技术**（自主智能体、多智能体框架、Agentic API）
    3. **💡 实用 Skill & 提效技巧**（Prompt 模板、Cursor/Claude 工作流、提效黑科技）
    4. **⚡ 25 源精选速览**（按官方实验室、论文、行业大事件分类切换）
    5. **💬 社区与热搜**（Hacker News、V2EX、知乎热议）
  * **交互与体验**：原生支持暗黑/明亮模式自动切换，一键复制 Prompt/代码块，适配手机与 PC 屏幕。

---

## 容错与约束限制
1. **强容错与降级**：单个站点请求超时（>10秒）或遭遇反爬时，打印 Log 警告并跳过该源，绝不能导致整个 GitHub Actions 工作流失败中断。
2. **请求频率限制**：设置合理的并发控制与延迟间隔，对目标站点保持友善。
3. **零成本稳定运行**：全套方案需完全建立在 GitHub Actions + GitHub Pages 的免费额度之上。

---

## 你的第一次回复要求

了解上述需求后，请在你的第一次回复中向我提供：

1. **系统整体工作流架构说明**（用文字简述数据抓取 -> AI 摘要 -> HTML 渲染 -> GitHub Pages 发布的流转逻辑）。
2. **核心爬虫与数据处理脚本代码**（Node.js 或 Python）。
3. **GitHub Actions 的 `.yml` 自动化配置文件源码**。
4. **高质量极简 Dashboard 静态网页代码**（HTML + Tailwind CSS CDN，包含 Skill 与 Agents 专区展示）。
5. **小白级部署指南**：请提供一份**手把手、零基础**的部署步骤说明，告诉我如何把这些代码上传到 GitHub、如何在 GitHub Secrets 中配置 API Key，以及如何一键开启 GitHub Pages 网站服务。