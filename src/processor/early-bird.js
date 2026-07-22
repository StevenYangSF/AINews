/**
 * "AI早知道" 前沿科技晨报生成模块
 * 从去重后数据中筛选海外前沿动态，通过 LLM 生成极简晨报
 */

import { getTodayDate } from '../utils.js';

// 四大领域关键词
const DOMAINS = {
  llm_agent: {
    label: '🤖 海外大模型 & Agent',
    keywords: ['llm', 'gpt', 'claude', 'gemini', 'reasoning', 'open-source model', 'autonomous agent', 'multi-modal', 'openai', 'anthropic', 'mistral', 'llama', 'deepseek', 'transformer', 'foundation model']
  },
  embodied: {
    label: '🦾 具身智能 & 机器人',
    keywords: ['embodied ai', 'humanoid robot', 'unitree', 'figure', 'boston dynamics', 'tesla optimus', 'robotics', 'humanoid', 'manipulation', 'vla', '人形机器人']
  },
  chip: {
    label: '⚡ 最新 AI 芯片 & 算力',
    keywords: ['ai chip', 'nvidia', 'amd', 'tpu', 'blackwell', 'custom silicon', 'wafer', 'semiconductor', 'gpu', 'h100', 'h200', 'b200', 'groq', 'cerebras', '芯片']
  },
  space: {
    label: '🚀 太空探索 & 火箭回收',
    keywords: ['spacex', 'starship', 'falcon 9', 'rocket recovery', 'reusable rocket', 'rocket lab', 'blue origin', 'nasa', 'space exploration', 'artemis', 'starlink']
  }
};

// 排除国内源（只要海外前沿）
const CHINA_SOURCE_KEYWORDS = ['机器之心', '量子位', '智源', '新智元', '知乎', '微博', '百度', '盖世汽车', 'Hex2077', '车东西', '高工', '九章', '新出行'];

/**
 * 筛选海外前沿动态（6-12 条）
 */
export function filterEarlyBirdItems(newsItems) {
  const results = { llm_agent: [], embodied: [], chip: [], space: [] };

  for (const item of newsItems) {
    // 排除国内源
    const sourceText = (item.sources || [item.source || '']).join(' ');
    if (CHINA_SOURCE_KEYWORDS.some(kw => sourceText.includes(kw))) continue;

    const text = `${item.title} ${item.summary || ''} ${item.content || ''} ${(item.tags || []).join(' ')}`.toLowerCase();

    // 匹配领域
    for (const [domain, config] of Object.entries(DOMAINS)) {
      if (config.keywords.some(kw => text.includes(kw))) {
        results[domain].push(item);
        break; // 每条只归入一个领域
      }
    }
  }

  // 每个领域取前 3 条，总共 6-12 条
  const filtered = [];
  for (const [domain, items] of Object.entries(results)) {
    const sorted = items.sort((a, b) => (b.impactScore || b.score || 0) - (a.impactScore || a.score || 0));
    filtered.push(...sorted.slice(0, 3).map(item => ({ ...item, earlyBirdDomain: domain })));
  }

  return filtered.slice(0, 12);
}

/**
 * 生成《AI早知道》晨报内容（Markdown 格式）
 * 如果有 LLM 可用则调用，否则用模板直接生成
 */
export function generateEarlyBirdBrief(filteredItems) {
  const date = getTodayDate();
  let markdown = `## ☀️ AI早知道 | 前沿科技晨报 ${date}\n\n`;

  // 按领域分组
  const grouped = {};
  for (const item of filteredItems) {
    const domain = item.earlyBirdDomain || 'llm_agent';
    if (!grouped[domain]) grouped[domain] = [];
    grouped[domain].push(item);
  }

  // 按领域输出
  for (const [domain, config] of Object.entries(DOMAINS)) {
    const items = grouped[domain];
    if (!items || items.length === 0) continue;

    markdown += `### ${config.label}\n\n`;
    for (const item of items) {
      const url = (item.urls && item.urls[0]) || item.url || '#';
      const summary = item.summary || item.title;
      markdown += `* **${item.title}**：${summary !== item.title ? summary : '重磅动态'} [🔗 源链接](${url})\n`;
    }
    markdown += '\n';
  }

  markdown += `---\n*由 AI Daily 系统自动生成，数据来自全球 100+ AI 前沿信息源*\n`;

  return markdown;
}

/**
 * 构建 LLM Prompt 用于生成更高质量的晨报
 */
export function buildEarlyBirdPrompt(filteredItems) {
  const date = getTodayDate();
  const itemsJson = JSON.stringify(filteredItems.map(item => ({
    title: item.title,
    summary: item.summary || '',
    url: (item.urls && item.urls[0]) || item.url || '',
    source: (item.sources || [])[0] || item.source || '',
    domain: item.earlyBirdDomain
  })), null, 0);

  return `# Role
你是一位敏锐的硬科技与 AI 前沿观察员，负责撰写每日《AI早知道》极简晨报。

# Target Audience
忙碌的技术开发者、科技创投人与 AI 爱好者，要求 1 分钟内读完核心要点。

# Focus Areas
1. 海外大模型 & Agent 前沿
2. 具身智能 & 机器人
3. 最新 AI 芯片 & 算力硬件
4. 太空探索 & 可回收火箭技术

# Guidelines
1. 仅提炼输入数据中符合上述 4 个领域的重磅动态。
2. 每一条新闻格式固定为：【核心突破/新闻标题】 + 一句话说明亮点/价值 + [🔗 源链接](URL)。
3. 语言风格：专业、硬核、极简，拒绝废话与营销修饰。
4. 按领域分类排版，无对应分类动态时可自动忽略该分类。

# Input Data
${itemsJson}

# Output Format
## ☀️ AI早知道 | 前沿科技晨报 ${date}

### 🤖 海外大模型 & Agent
* **[新闻标题]**：一句话说明核心突破。[🔗 源链接](URL)

### 🦾 具身智能 & 机器人
* **[新闻标题]**：一句话说明亮点。[🔗 源链接](URL)

### ⚡ 最新 AI 芯片 & 算力
* **[新闻标题]**：一句话说明性能创新。[🔗 源链接](URL)

### 🚀 太空探索 & 火箭回收
* **[新闻标题]**：一句话说明进展。[🔗 源链接](URL)`;
}
