/**
 * 搜索引擎爬虫
 * 通过 Google News RSS 和 Bing News 搜索关键词，自动抓取互联网上的最新相关内容
 */

import * as cheerio from 'cheerio';
import { safeFetchText, safeFetchJSON } from '../utils.js';
import { CATEGORIES } from '../config.js';

// 各分类对应的搜索关键词组
const SEARCH_QUERIES = {
  [CATEGORIES.GITHUB]: [
    'AI open source project 2026',
    'LLM framework github trending'
  ],
  [CATEGORIES.EMBODIED]: [
    'embodied AI humanoid robot 2026',
    '具身智能 人形机器人 最新进展',
    'VLA model robotics manipulation',
    'Tesla Optimus 宇树 智元机器人'
  ],
  [CATEGORIES.AUTO_AI]: [
    'autonomous driving AI 2026',
    '自动驾驶 端到端智驾 最新',
    'Tesla FSD Waymo self-driving update',
    '华为 ADS 智能驾驶 小鹏'
  ],
  [CATEGORIES.TESTING]: [
    'AI test automation 2026',
    'Playwright Selenium AI testing',
    'self-healing locators test automation',
    'visual testing AI OpenCV',
    'property-based testing Hypothesis'
  ],
  [CATEGORIES.LABS]: [
    'OpenAI GPT Claude Gemini latest release 2026'
  ],
  [CATEGORIES.MEDIA]: [
    'artificial intelligence industry news today'
  ]
};

/**
 * 通过 Google News RSS 搜索关键词
 * Google News RSS 格式: https://news.google.com/rss/search?q=KEYWORD&hl=en
 */
async function searchGoogleNews(query, category) {
  const encodedQuery = encodeURIComponent(query);
  // Google News RSS（中文用 hl=zh-CN，英文用 hl=en）
  const isChineseQuery = /[\u4e00-\u9fff]/.test(query);
  const hl = isChineseQuery ? 'zh-CN' : 'en';
  const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=${hl}&gl=US&ceid=US:en`;

  const xml = await safeFetchText(url);
  if (!xml) return [];

  const $ = cheerio.load(xml, { xmlMode: true });
  const items = [];

  $('item').each((_, el) => {
    const $item = $(el);
    const title = $item.find('title').text().trim();
    const link = $item.find('link').text().trim();
    const pubDate = $item.find('pubDate').text().trim();
    const source = $item.find('source').text().trim() || 'Google News';

    if (!title || !link) return;

    items.push({
      title,
      url: link,
      source: `🔍 ${source}`,
      category,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      content: '',
      metadata: { searchQuery: query }
    });
  });

  return items.slice(0, 5);
}

/**
 * 通过 Bing News API（免费 RSS 端点）搜索
 * 格式: https://www.bing.com/news/search?q=KEYWORD&format=rss
 */
async function searchBingNews(query, category) {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://www.bing.com/news/search?q=${encodedQuery}&format=rss`;

  const xml = await safeFetchText(url);
  if (!xml) return [];

  const $ = cheerio.load(xml, { xmlMode: true });
  const items = [];

  $('item').each((_, el) => {
    const $item = $(el);
    const title = $item.find('title').text().trim();
    const link = $item.find('link').text().trim();
    const pubDate = $item.find('pubDate').text().trim();
    const description = $item.find('description').text().trim();

    if (!title || !link) return;

    items.push({
      title,
      url: link,
      source: '🔍 Bing News',
      category,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      content: description ? description.replace(/<[^>]*>/g, '').slice(0, 200) : '',
      metadata: { searchQuery: query }
    });
  });

  return items.slice(0, 5);
}

/**
 * 通过 DuckDuckGo Lite 搜索（无需 API Key）
 */
async function searchDuckDuckGo(query, category) {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://lite.duckduckgo.com/lite/?q=${encodedQuery}`;

  const html = await safeFetchText(url);
  if (!html) return [];

  const $ = cheerio.load(html);
  const items = [];

  $('a.result-link, .result-snippet').each((_, el) => {
    // DDG lite 结果较简单
  });

  // DDG lite 结构：每个结果在 table row 中
  $('table:last-of-type tr').each((_, el) => {
    const $row = $(el);
    const $link = $row.find('a').first();
    const href = $link.attr('href') || '';
    const title = $link.text().trim();
    const snippet = $row.find('.result-snippet').text().trim();

    if (!title || !href || title.length < 5) return;
    if (href.includes('duckduckgo.com')) return;

    items.push({
      title,
      url: href,
      source: '🔍 DuckDuckGo',
      category,
      publishedAt: new Date().toISOString(),
      content: snippet.slice(0, 200),
      metadata: { searchQuery: query }
    });
  });

  return items.slice(0, 5);
}

/**
 * 执行单个关键词的多引擎搜索
 */
async function searchKeyword(query, category) {
  const results = [];

  // 优先 Google News RSS（最稳定）
  const googleResults = await searchGoogleNews(query, category);
  results.push(...googleResults);

  // 如果 Google 返回太少，补充 Bing
  if (results.length < 3) {
    const bingResults = await searchBingNews(query, category);
    results.push(...bingResults);
  }

  return results;
}

/**
 * 执行所有分类的关键词搜索
 * @returns {Promise<Array>} RawItem 数组
 */
export async function crawlSearchEngines() {
  console.log('[Crawler] 开始搜索引擎关键词抓取...');

  const allResults = [];
  const entries = Object.entries(SEARCH_QUERIES);

  for (const [category, queries] of entries) {
    for (const query of queries) {
      console.log(`[Search] 搜索: "${query}" → ${category}`);
      try {
        const items = await searchKeyword(query, category);
        allResults.push(...items);
      } catch (error) {
        console.warn(`[Search] 搜索失败 "${query}": ${error.message}`);
      }
    }
  }

  // 去除重复 URL
  const seen = new Set();
  const dedupResults = allResults.filter(item => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });

  console.log(`[Crawler] 搜索引擎: 共获取 ${dedupResults.length} 条`);
  return dedupResults;
}
