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
  'robotics', 'embodied', 'humanoid', 'autonomous driving', 'self-driving',
  'vla', 'manipulation', 'fsd', 'waymo',
  'test automation', 'playwright', 'selenium', 'cypress', 'appium',
  'robot framework', 'self-healing', 'visual testing', 'ocr', 'opencv',
  'property-based', 'mutation testing', 'sikulix', 'hypothesis',
  '人工智能', '大模型', '机器学习', '深度学习', '神经网络', '智能体',
  '具身智能', '人形机器人', '自动驾驶', '智能驾驶', '端到端',
  '自动化测试', '智能测试', '视觉测试', '自愈定位'
];

// 自动标签分类（扩展到 12 个）
export const TAG_CATEGORIES = [
  '模型发布', '开源工具', 'AI Infra', '行业商业', '论文解读',
  'AI 安全', '智能体', '产品应用',
  '具身智能', '人形机器人', '自动驾驶', '端到端智驾',
  'AI测试', '自动化测试'
];

// 数据源分类（10 个 Tab）
export const CATEGORIES = {
  GITHUB: 'github',
  LABS: 'labs',
  PAPERS: 'papers',
  MEDIA: 'media',
  EMBODIED: 'embodied',
  AUTO_AI: 'auto_ai',
  TESTING: 'testing',      // 新增：AI自动化测试
  WEEKLY: 'weekly',
  COMMUNITY: 'community',
  CHINA: 'china'
};

// GitHub Trending 配置
export const GITHUB_TRENDING = {
  url: 'https://github.com/trending',
  params: '?since=daily',
  category: CATEGORIES.GITHUB
};

// 官方实验室（7 源）
export const LABS_SOURCES = [
  { name: 'OpenAI', url: 'https://openai.com/news/', type: 'html', category: CATEGORIES.LABS },
  { name: 'Anthropic Research', url: 'https://www.anthropic.com/research', type: 'html', category: CATEGORIES.LABS },
  { name: 'Anthropic News', url: 'https://www.anthropic.com/news', type: 'html', category: CATEGORIES.LABS },
  { name: 'Google DeepMind', url: 'https://deepmind.google/discover/blog/', type: 'html', category: CATEGORIES.LABS },
  { name: 'Meta AI', url: 'https://ai.meta.com/blog/', type: 'html', category: CATEGORIES.LABS },
  { name: 'Microsoft Research AI', url: 'https://www.microsoft.com/en-us/research/research-area/artificial-intelligence/', type: 'html', category: CATEGORIES.LABS },
  { name: 'NVIDIA Tech Blog', url: 'https://developer.nvidia.com/blog/', type: 'html', category: CATEGORIES.LABS }
];

// 论文与代码（6 源）
export const PAPERS_SOURCES = [
  { name: 'Hugging Face Papers', url: 'https://huggingface.co/papers', type: 'html', category: CATEGORIES.PAPERS },
  { name: 'arXiv cs.AI', url: 'https://rss.arxiv.org/rss/cs.AI', type: 'rss', category: CATEGORIES.PAPERS },
  { name: 'arXiv cs.LG', url: 'https://rss.arxiv.org/rss/cs.LG', type: 'rss', category: CATEGORIES.PAPERS },
  { name: 'Papers with Code', url: 'https://paperswithcode.com/', type: 'html', category: CATEGORIES.PAPERS },
  { name: 'Stanford HAI', url: 'https://hai.stanford.edu/', type: 'html', category: CATEGORIES.PAPERS },
  { name: 'Berkeley BAIR', url: 'https://bair.berkeley.edu/blog/', type: 'html', category: CATEGORIES.PAPERS }
];

// 行业媒体（9 源）
export const MEDIA_SOURCES = [
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', type: 'rss', category: CATEGORIES.MEDIA },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/topic/artificial-intelligence/', type: 'html', category: CATEGORIES.MEDIA },
  { name: 'The Verge AI', url: 'https://www.theverge.com/ai-artificial-intelligence', type: 'html', category: CATEGORIES.MEDIA },
  { name: 'Ars Technica AI', url: 'https://arstechnica.com/tag/artificial-intelligence/', type: 'html', category: CATEGORIES.MEDIA },
  { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/', type: 'html', category: CATEGORIES.MEDIA },
  { name: 'The Batch', url: 'https://www.deeplearning.ai/the-batch/', type: 'html', category: CATEGORIES.MEDIA },
  { name: 'Latent Space', url: 'https://www.latent.space/', type: 'html', category: CATEGORIES.MEDIA },
  { name: 'SemiAnalysis', url: 'https://www.semianalysis.com/', type: 'html', category: CATEGORIES.MEDIA },
  { name: 'The Information', url: 'https://www.theinformation.com/', type: 'html', category: CATEGORIES.MEDIA }
];

// Hex2077 专属源 + 深度周报
export const HEX2077_SOURCES = [
  { name: 'Hex2077 日报', url: 'https://hex2077.dev/docs/', type: 'custom-hex2077-docs', category: CATEGORIES.MEDIA },
  { name: 'Hex2077 周报', url: 'https://hex2077.dev/blog/?category=weekly', type: 'custom-hex2077-weekly', category: CATEGORIES.WEEKLY },
  { name: 'Hex2077 博客', url: 'https://hex2077.dev/blog/', type: 'custom-hex2077-blog', category: CATEGORIES.MEDIA },
  { name: 'Hex2077 导航', url: 'https://nav.hex2077.dev/', type: 'custom-hex2077-nav', category: CATEGORIES.COMMUNITY },
  { name: 'AI Hot Daily', url: 'https://aihot.virxact.com/daily', type: 'html', category: CATEGORIES.WEEKLY }
];

// ===== 新增板块：具身智能（Embodied AI & 人形机器人）=====
export const EMBODIED_SOURCES = [
  // 学术实验室与论文
  { name: 'arXiv cs.RO', url: 'https://rss.arxiv.org/rss/cs.RO', type: 'rss', category: CATEGORIES.EMBODIED },
  { name: 'NVIDIA Isaac', url: 'https://developer.nvidia.com/isaac', type: 'html', category: CATEGORIES.EMBODIED },
  { name: 'Papers with Code Robotics', url: 'https://paperswithcode.com/area/robots', type: 'html', category: CATEGORIES.EMBODIED },
  { name: 'Berkeley BAIR Robotics', url: 'https://bair.berkeley.edu/blog/', type: 'html', category: CATEGORIES.EMBODIED },
  { name: 'Hugging Face Robotics', url: 'https://huggingface.co/models?pipeline_tag=robotics', type: 'html', category: CATEGORIES.EMBODIED },
  // 海外前沿厂商
  { name: 'Figure AI', url: 'https://www.figure.ai/', type: 'html', category: CATEGORIES.EMBODIED },
  { name: 'Covariant', url: 'https://covariant.ai/', type: 'html', category: CATEGORIES.EMBODIED },
  // 国内具身智能领军
  { name: '宇树科技 Unitree', url: 'https://www.unitree.com/', type: 'html', category: CATEGORIES.EMBODIED },
  { name: '智元机器人 AgiBot', url: 'https://www.agibot.com/', type: 'html', category: CATEGORIES.EMBODIED },
  { name: '傅利叶智能', url: 'https://www.fourier-ai.com/', type: 'html', category: CATEGORIES.EMBODIED },
  { name: '银河通用 Galbot', url: 'https://www.galbot.com/', type: 'html', category: CATEGORIES.EMBODIED },
  { name: '星尘智能', url: 'https://www.stardust-ai.com/', type: 'html', category: CATEGORIES.EMBODIED },
  { name: '穹彻智能', url: 'https://www.noomvision.com/', type: 'html', category: CATEGORIES.EMBODIED },
  { name: '自变量机器人', url: 'https://www.xsquare.ai/', type: 'html', category: CATEGORIES.EMBODIED },
  // 社区与媒体
  { name: '机器人大讲堂', url: 'http://www.rsrobot.net/', type: 'html', category: CATEGORIES.EMBODIED },
  { name: '上海AI Lab具身智能', url: 'https://www.shlab.org.cn/', type: 'html', category: CATEGORIES.EMBODIED },
  { name: '古月居', url: 'https://www.guyuehome.com/', type: 'html', category: CATEGORIES.EMBODIED }
];

// ===== 新增板块：汽车 AI 与自动驾驶 =====
export const AUTO_AI_SOURCES = [
  // 全球咨询研报
  { name: 'McKinsey Automotive', url: 'https://www.mckinsey.com/industries/automotive-and-assembly/our-insights', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: 'Roland Berger Auto', url: 'https://www.rolandberger.com/en/Insights/Global-Topics/Automotive/', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: 'BCG Automotive', url: 'https://www.bcg.com/industries/automotive-industry/insights', type: 'html', category: CATEGORIES.AUTO_AI },
  // === 国际头部：L4 全无人驾驶 ===
  { name: 'Waymo Blog', url: 'https://waymo.com/blog/', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: 'Tesla AI', url: 'https://www.tesla.com/AI', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: 'Tesla FSD News', url: 'https://electrek.co/guides/tesla-fsd/', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: 'Cruise', url: 'https://www.getcruise.com/news', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: 'Mobileye', url: 'https://www.mobileye.com/blog/', type: 'html', category: CATEGORIES.AUTO_AI },
  // === 中国 L4 Robotaxi 运营派 ===
  { name: '百度 Apollo 萝卜快跑', url: 'https://apollo.auto/', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: '小马智行 Pony.ai', url: 'https://www.pony.ai/zh/news', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: '文远知行 WeRide', url: 'https://www.weride.ai/news', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: '智加科技 Plus', url: 'https://plusai.com/news/', type: 'html', category: CATEGORIES.AUTO_AI },
  // === 中国量产智驾：芯片+算法生态 ===
  { name: '华为乾崑智驾', url: 'https://auto.huawei.com/', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: '华为ADS智驾', url: 'https://auto.huawei.com/cn/ads/', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: 'Momenta', url: 'https://www.momenta.ai/', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: 'Momenta中文站', url: 'https://www.momenta.cn/', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: '地平线 Horizon', url: 'https://www.horizon.auto/', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: '卓驭科技(大疆车载)', url: 'https://www.dji.com/cn/auto', type: 'html', category: CATEGORIES.AUTO_AI },
  // === 中国造车新势力（智驾动态） ===
  { name: '小鹏汽车', url: 'https://www.xpeng.com/', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: '蔚来汽车', url: 'https://www.nio.cn/news', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: '理想汽车', url: 'https://www.lixiang.com/news.html', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: '比亚迪智驾', url: 'https://www.byd.com/cn/news.html', type: 'html', category: CATEGORIES.AUTO_AI },
  // === 垂直汽车科技媒体 ===
  { name: '盖世汽车', url: 'https://auto.gasgoo.com/', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: '盖世汽车中文站', url: 'https://cn.gasgoo.com/', type: 'html', category: CATEGORIES.AUTO_AI },
  // === 中文论坛与社区 ===
  { name: '知乎自动驾驶话题', url: 'https://www.zhihu.com/topic/19630454/hot', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: 'CSDN自动驾驶专区', url: 'https://bbs.csdn.net/forums/Autonomous', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: 'Apollo开发者社区', url: 'https://developer.apollo.auto/community', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: '汽车之心', url: 'https://www.autobit.xyz/', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: '高工智能汽车研究院', url: 'https://www.gg-ai.com/', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: '深蓝学院自动驾驶', url: 'https://bbs.deepshare.net/c/ai/car', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: '九章智驾', url: 'https://www.ninethtech.com/', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: '车东西', url: 'https://chedongxi.com/', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: '高工智能汽车', url: 'https://www.gg-auto.com/', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: '新出行', url: 'https://www.xchuxing.com/', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: '自动驾驶之心', url: 'https://www.autodrivingsolutions.com/', type: 'html', category: CATEGORIES.AUTO_AI },
  { name: 'Electrek', url: 'https://electrek.co/feed/', type: 'rss', category: CATEGORIES.AUTO_AI },
  { name: 'TechCrunch Mobility', url: 'https://techcrunch.com/category/transportation/feed/', type: 'rss', category: CATEGORIES.AUTO_AI }
];

// ===== 新增板块：AI 自动化测试 =====
export const TESTING_SOURCES = [
  // AI & ML 测试分析平台
  { name: 'ReportPortal', url: 'https://reportportal.io/', type: 'html', category: CATEGORIES.TESTING },
  // 计算机视觉 & 图像识别测试
  { name: 'GitHub SikuliX', url: 'https://github.com/RaiMan/SikuliX1', type: 'html', category: CATEGORIES.TESTING },
  { name: 'GitHub Airtest', url: 'https://github.com/AirtestProject/Airtest', type: 'html', category: CATEGORIES.TESTING },
  { name: 'GitHub Needle', url: 'https://github.com/python-needle/needle', type: 'html', category: CATEGORIES.TESTING },
  { name: 'GitHub image-comparison', url: 'https://github.com/romankh3/image-comparison', type: 'html', category: CATEGORIES.TESTING },
  // 智能定位 & 自愈
  { name: 'TrueAutomation.IO', url: 'https://trueautomation.io/', type: 'html', category: CATEGORIES.TESTING },
  { name: 'GitHub TestZeus', url: 'https://github.com/test-zeus-ai/testzeus-hercules', type: 'html', category: CATEGORIES.TESTING },
  // 智能生成 & 属性测试
  { name: 'GitHub Hypothesis', url: 'https://github.com/HypothesisWorks/hypothesis', type: 'html', category: CATEGORIES.TESTING },
  { name: 'GitHub Schemathesis', url: 'https://github.com/schemathesis/schemathesis', type: 'html', category: CATEGORIES.TESTING },
  { name: 'GitHub PIT Mutation', url: 'https://github.com/hcoles/pitest', type: 'html', category: CATEGORIES.TESTING },
  // 核心自动化框架
  { name: 'GitHub Playwright', url: 'https://github.com/microsoft/playwright', type: 'html', category: CATEGORIES.TESTING },
  { name: 'GitHub Selenium', url: 'https://github.com/SeleniumHQ/selenium', type: 'html', category: CATEGORIES.TESTING },
  { name: 'GitHub Robot Framework', url: 'https://github.com/robotframework/robotframework', type: 'html', category: CATEGORIES.TESTING },
  { name: 'GitHub Cypress', url: 'https://github.com/cypress-io/cypress', type: 'html', category: CATEGORIES.TESTING },
  { name: 'GitHub Appium', url: 'https://github.com/appium/appium', type: 'html', category: CATEGORIES.TESTING },
  // DeepfakeHTTP (AI mock 服务器)
  { name: 'GitHub DeepfakeHTTP', url: 'https://github.com/nicholasgasior/deepfake-http', type: 'html', category: CATEGORIES.TESTING },
  // GitHub Topics
  { name: 'GitHub AI Testing', url: 'https://github.com/topics/ai-testing', type: 'html', category: CATEGORIES.TESTING },
  { name: 'GitHub Test Automation', url: 'https://github.com/topics/test-automation', type: 'html', category: CATEGORIES.TESTING },
  { name: 'GitHub API Testing', url: 'https://github.com/topics/api-testing', type: 'html', category: CATEGORIES.TESTING },
  { name: 'GitHub Visual Testing', url: 'https://github.com/topics/visual-testing', type: 'html', category: CATEGORIES.TESTING },
  // 社区资讯
  { name: 'HN Test Automation', url: 'https://hn.algolia.com/api/v1/search?tags=story&query=test+automation+AI+playwright+selenium+self-healing', type: 'api', category: CATEGORIES.TESTING },
  { name: 'Reddit r/QualityAssurance', url: 'https://www.reddit.com/r/QualityAssurance/hot.json?limit=10', type: 'api', category: CATEGORIES.TESTING },
  // Awesome 列表
  { name: 'Awesome Test Automation Java', url: 'https://github.com/atinfo/awesome-test-automation/blob/master/java-test-automation.md', type: 'html', category: CATEGORIES.TESTING },
  { name: 'Awesome Test Automation Python', url: 'https://github.com/atinfo/awesome-test-automation/blob/master/python-test-automation.md', type: 'html', category: CATEGORIES.TESTING }
];

// 全球社区
export const COMMUNITY_SOURCES = [
  { name: 'Hacker News', url: 'https://hn.algolia.com/api/v1/search?tags=story&query=AI+LLM+GPT+Agent+Robotics+VLA', type: 'api', category: CATEGORIES.COMMUNITY },
  { name: 'Reddit r/MachineLearning', url: 'https://www.reddit.com/r/MachineLearning/hot.json?limit=20', type: 'api', category: CATEGORIES.COMMUNITY },
  { name: 'Reddit r/SelfDrivingCars', url: 'https://www.reddit.com/r/SelfDrivingCars/hot.json?limit=10', type: 'api', category: CATEGORIES.AUTO_AI },
  { name: 'Reddit r/robotics', url: 'https://www.reddit.com/r/robotics/hot.json?limit=10', type: 'api', category: CATEGORIES.EMBODIED },
  { name: 'Product Hunt', url: 'https://www.producthunt.com/topics/artificial-intelligence', type: 'html', category: CATEGORIES.COMMUNITY },
  { name: 'V2EX', url: 'https://www.v2ex.com/api/topics/hot.json', type: 'api', category: CATEGORIES.COMMUNITY }
];

// 国内生态（5 源）
export const CHINA_SOURCES = [
  { name: '机器之心', url: 'https://www.jiqizhixin.com/', type: 'html', category: CATEGORIES.CHINA },
  { name: '量子位', url: 'https://www.qbitai.com/', type: 'html', category: CATEGORIES.CHINA },
  { name: '智源社区', url: 'https://hub.baai.ac.cn/', type: 'html', category: CATEGORIES.CHINA },
  { name: '中国人工智能学会', url: 'https://www.caai.cn/', type: 'html', category: CATEGORIES.CHINA },
  { name: '新智元', url: 'https://aiera.com.cn/', type: 'html', category: CATEGORIES.CHINA }
];

// 国内热搜
export const CHINA_TRENDING_SOURCES = [
  { name: '知乎热榜', url: 'https://www.zhihu.com/hot', type: 'html', keywords: ['AI', '人工智能', '大模型', 'GPT', '机器人', '自动驾驶', '智能驾驶'], category: CATEGORIES.CHINA },
  { name: '微博热搜', url: 'https://weibo.com/ajax/side/hotSearch', type: 'api', keywords: ['科技', 'AI', '大模型', '人工智能', '智能', '机器人', '自动驾驶'], category: CATEGORIES.CHINA }
];

// 汇总所有数据源
export const ALL_SOURCES = [
  ...LABS_SOURCES,
  ...PAPERS_SOURCES,
  ...MEDIA_SOURCES,
  ...HEX2077_SOURCES,
  ...EMBODIED_SOURCES,
  ...AUTO_AI_SOURCES,
  ...TESTING_SOURCES,
  ...COMMUNITY_SOURCES,
  ...CHINA_SOURCES,
  ...CHINA_TRENDING_SOURCES
];

// 爬虫配置
export const CRAWLER_CONFIG = {
  concurrency: 5,
  timeout: 15000,
  retries: 1,
  retryDelay: 2000,
  requestDelay: 800,
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// Gemini API 配置
export const SUMMARIZER_CONFIG = {
  model: 'gemini-2.0-flash',
  maxRequestsPerMinute: 15,
  maxSummaryLength: 80,
  fallbackLength: 150,
  contentThreshold: 200
};
