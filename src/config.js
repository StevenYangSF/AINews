/**
 * 数据源配置文件
 * 定义所有抓取目标的 URL、分类和抓取策略
 */

// AI 关键词（用于过滤非 AI 内容）
export const AI_KEYWORDS = [
  'ai', 'artificial intelligence', 'machine learning', 'deep learning',
  'neural network', 'llm', 'large language model', 'gpt', 'claude',
  'transformer', 'diffusion', 'agent', 'rag', 'fine-tuning', 'embedding',
  'multimodal', 'computer vision', 'nlp', 'reinforcement learning',
  '人工智能', '大模型', '机器学习', '深度学习', '神经网络', '智能体'
];

// 自动标签分类
export const TAG_CATEGORIES = [
  '模型发布', '开源工具', 'AI Infra', '行业商业', '论文解读'
];

// 数据源分类
export const CATEGORIES = {
  GITHUB: 'github',
  LABS: 'labs',
  PAPERS: 'papers',
  MEDIA: 'media',
  COMMUNITY: 'community',
  CHINA: 'china'
};

// GitHub Trending 配置
export const GITHUB_TRENDING = {
  url: 'https://github.com/trending',
  params: '?since=daily',
  category: CATEGORIES.GITHUB
};

// 官方实验室（6 源）
export const LABS_SOURCES = [
  {
    name: 'OpenAI',
    url: 'https://openai.com/news/',
    type: 'html',
    category: CATEGORIES.LABS
  },
  {
    name: 'Anthropic Research',
    url: 'https://www.anthropic.com/research',
    type: 'html',
    category: CATEGORIES.LABS
  },
  {
    name: 'Anthropic News',
    url: 'https://www.anthropic.com/news',
    type: 'html',
    category: CATEGORIES.LABS
  },
  {
    name: 'Google DeepMind',
    url: 'https://deepmind.google/discover/blog/',
    type: 'html',
    category: CATEGORIES.LABS
  },
  {
    name: 'Meta AI',
    url: 'https://ai.meta.com/blog/',
    type: 'html',
    category: CATEGORIES.LABS
  },
  {
    name: 'Microsoft Research AI',
    url: 'https://www.microsoft.com/en-us/research/research-area/artificial-intelligence/',
    type: 'html',
    category: CATEGORIES.LABS
  },
  {
    name: 'NVIDIA Tech Blog',
    url: 'https://developer.nvidia.com/blog/',
    type: 'html',
    category: CATEGORIES.LABS
  }
];

// 论文与代码（5 源）
export const PAPERS_SOURCES = [
  {
    name: 'Hugging Face Papers',
    url: 'https://huggingface.co/papers',
    type: 'html',
    category: CATEGORIES.PAPERS
  },
  {
    name: 'arXiv cs.AI',
    url: 'https://rss.arxiv.org/rss/cs.AI',
    type: 'rss',
    category: CATEGORIES.PAPERS
  },
  {
    name: 'arXiv cs.LG',
    url: 'https://rss.arxiv.org/rss/cs.LG',
    type: 'rss',
    category: CATEGORIES.PAPERS
  },
  {
    name: 'Papers with Code',
    url: 'https://paperswithcode.com/',
    type: 'html',
    category: CATEGORIES.PAPERS
  },
  {
    name: 'Stanford HAI',
    url: 'https://hai.stanford.edu/',
    type: 'html',
    category: CATEGORIES.PAPERS
  },
  {
    name: 'Berkeley BAIR',
    url: 'https://bair.berkeley.edu/blog/',
    type: 'html',
    category: CATEGORIES.PAPERS
  }
];

// 行业媒体（10 源）
export const MEDIA_SOURCES = [
  {
    name: 'TechCrunch AI',
    url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    type: 'rss',
    category: CATEGORIES.MEDIA
  },
  {
    name: 'MIT Technology Review',
    url: 'https://www.technologyreview.com/topic/artificial-intelligence/',
    type: 'html',
    category: CATEGORIES.MEDIA
  },
  {
    name: 'The Verge AI',
    url: 'https://www.theverge.com/ai-artificial-intelligence',
    type: 'html',
    category: CATEGORIES.MEDIA
  },
  {
    name: 'Ars Technica AI',
    url: 'https://arstechnica.com/tag/artificial-intelligence/',
    type: 'html',
    category: CATEGORIES.MEDIA
  },
  {
    name: 'VentureBeat AI',
    url: 'https://venturebeat.com/category/ai/',
    type: 'html',
    category: CATEGORIES.MEDIA
  },
  {
    name: 'The Batch',
    url: 'https://www.deeplearning.ai/the-batch/',
    type: 'html',
    category: CATEGORIES.MEDIA
  },
  {
    name: 'Latent Space',
    url: 'https://www.latent.space/',
    type: 'html',
    category: CATEGORIES.MEDIA
  },
  {
    name: 'SemiAnalysis',
    url: 'https://www.semianalysis.com/',
    type: 'html',
    category: CATEGORIES.MEDIA
  },
  {
    name: 'The Information',
    url: 'https://www.theinformation.com/',
    type: 'html',
    category: CATEGORIES.MEDIA
  }
];

// 全球社区
export const COMMUNITY_SOURCES = [
  {
    name: 'Hacker News',
    url: 'https://hn.algolia.com/api/v1/search?tags=story&query=AI+LLM+GPT',
    type: 'api',
    category: CATEGORIES.COMMUNITY
  },
  {
    name: 'Reddit r/MachineLearning',
    url: 'https://www.reddit.com/r/MachineLearning/hot.json?limit=20',
    type: 'api',
    category: CATEGORIES.COMMUNITY
  },
  {
    name: 'Product Hunt',
    url: 'https://www.producthunt.com/topics/artificial-intelligence',
    type: 'html',
    category: CATEGORIES.COMMUNITY
  },
  {
    name: 'V2EX',
    url: 'https://www.v2ex.com/api/topics/hot.json',
    type: 'api',
    category: CATEGORIES.COMMUNITY
  }
];

// 国内生态（5 源）+ 国内热搜
export const CHINA_SOURCES = [
  {
    name: '机器之心',
    url: 'https://www.jiqizhixin.com/',
    type: 'html',
    category: CATEGORIES.CHINA
  },
  {
    name: '量子位',
    url: 'https://www.qbitai.com/',
    type: 'html',
    category: CATEGORIES.CHINA
  },
  {
    name: '智源社区',
    url: 'https://hub.baai.ac.cn/',
    type: 'html',
    category: CATEGORIES.CHINA
  },
  {
    name: '中国人工智能学会',
    url: 'https://www.caai.cn/',
    type: 'html',
    category: CATEGORIES.CHINA
  },
  {
    name: '新智元',
    url: 'https://aiera.com.cn/',
    type: 'html',
    category: CATEGORIES.CHINA
  }
];

// 国内热搜
export const CHINA_TRENDING_SOURCES = [
  {
    name: '知乎热榜',
    url: 'https://www.zhihu.com/hot',
    type: 'html',
    keywords: ['AI', '人工智能', '大模型', 'GPT', 'ChatGPT', '机器学习'],
    category: CATEGORIES.CHINA
  },
  {
    name: '微博热搜',
    url: 'https://weibo.com/ajax/side/hotSearch',
    type: 'api',
    keywords: ['科技', 'AI', '大模型', '人工智能', '智能'],
    category: CATEGORIES.CHINA
  }
];

// 汇总所有数据源
export const ALL_SOURCES = [
  ...LABS_SOURCES,
  ...PAPERS_SOURCES,
  ...MEDIA_SOURCES,
  ...COMMUNITY_SOURCES,
  ...CHINA_SOURCES,
  ...CHINA_TRENDING_SOURCES
];

// 爬虫配置
export const CRAWLER_CONFIG = {
  concurrency: 5,        // 最大并发数
  timeout: 10000,        // 单源超时 10 秒
  retries: 1,            // 重试次数
  retryDelay: 2000,      // 重试间隔 2 秒
  requestDelay: 1000,    // 请求间隔 1 秒
  userAgent: 'Mozilla/5.0 (compatible; AINewsBot/1.0; +https://github.com/ai-news-aggregator)'
};

// Gemini API 配置
export const SUMMARIZER_CONFIG = {
  model: 'gemini-2.0-flash',
  maxRequestsPerMinute: 15,
  maxSummaryLength: 50,     // 摘要最大字数
  fallbackLength: 100,      // 降级截断字数
  contentThreshold: 200     // 触发摘要的内容长度阈值
};
