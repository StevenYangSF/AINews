/**
 * GitHub Trending 爬虫
 * 抓取当天 Star 增长最快的 AI 相关项目
 */

import * as cheerio from 'cheerio';
import { safeFetchText } from '../utils.js';
import { GITHUB_TRENDING, AI_KEYWORDS, CATEGORIES } from '../config.js';

// AI 相关关键词（用于过滤项目）
const AI_FILTER_KEYWORDS = [
  'ai', 'artificial-intelligence', 'machine-learning', 'deep-learning',
  'neural-network', 'llm', 'language-model', 'gpt', 'transformer',
  'diffusion', 'agent', 'rag', 'embedding', 'nlp', 'computer-vision',
  'reinforcement-learning', 'generative', 'chatbot', 'fine-tune',
  'multimodal', 'stable-diffusion', 'langchain', 'vector-database',
  'huggingface', 'openai', 'anthropic', 'ollama', 'vllm'
];

/**
 * 判断项目是否属于 AI 类别
 */
function isAIProject(name, description) {
  const text = `${name} ${description}`.toLowerCase();
  return AI_FILTER_KEYWORDS.some(kw => text.includes(kw));
}

/**
 * 解析 Star 增量文本
 * @param {string} text - 如 "1,234 stars today"
 * @returns {number}
 */
function parseStarCount(text) {
  if (!text) return 0;
  const match = text.replace(/,/g, '').match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * 抓取 GitHub Trending
 * @returns {Promise<Array>} RawItem 数组
 */
export async function crawlGitHubTrending() {
  const url = `${GITHUB_TRENDING.url}${GITHUB_TRENDING.params}`;
  console.log('[Crawler] Fetching GitHub Trending...');

  const html = await safeFetchText(url);
  if (!html) {
    console.warn('[Crawler] GitHub Trending: 抓取失败');
    return [];
  }

  const $ = cheerio.load(html);
  const items = [];

  $('article.Box-row').each((_, el) => {
    const $el = $(el);

    // 项目名（如 owner/repo）
    const repoLink = $el.find('h2 a').attr('href') || '';
    const name = repoLink.replace(/^\//, '').trim();

    // 功能简介
    const description = $el.find('p').text().trim();

    // 编程语言
    const language = $el.find('[itemprop="programmingLanguage"]').text().trim() || 'Unknown';

    // 今日 Star 增量
    const starText = $el.find('.d-inline-block.float-sm-right').text().trim();
    const starsToday = parseStarCount(starText);

    // AI 类别过滤
    if (!isAIProject(name, description)) {
      return; // 跳过非 AI 项目
    }

    items.push({
      title: name,
      url: `https://github.com/${name}`,
      source: 'GitHub Trending',
      category: CATEGORIES.GITHUB,
      publishedAt: new Date().toISOString(),
      content: description,
      metadata: {
        stars: starsToday,
        language: language
      }
    });
  });

  console.log(`[Crawler] GitHub Trending: 获取 ${items.length} 个 AI 项目`);
  return items;
}
