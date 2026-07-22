/**
 * 国内科技热搜爬虫
 * 通过 RSSHub 抓取知乎热榜、微博热搜、百度热搜
 * 避免直接访问需要登录态的接口
 */

import * as cheerio from 'cheerio';
import { safeFetchText, fetchWithTimeout } from '../utils.js';
import { CATEGORIES } from '../config.js';

const AI_KEYWORDS = ['AI', '人工智能', '大模型', 'GPT', 'ChatGPT', 'Claude', '机器学习',
  '深度学习', '智能', 'LLM', 'OpenAI', 'Anthropic', '算力', '芯片', 'NVIDIA',
  '自动驾驶', '具身智能', 'Agent', '智能体', 'Sora', 'Gemini', '机器人', '端到端'];

/**
 * 抓取 RSS XML 并过滤 AI 关键词
 */
async function fetchRSSAndFilter(url, sourceName) {
  try {
    const response = await fetchWithTimeout(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AINewsBot/1.0)' }
    }, 10000);
    if (!response.ok) return [];
    const xml = await response.text();
    if (!xml) return [];

    const $ = cheerio.load(xml, { xmlMode: true });
    const items = [];

    $('item').each((_, el) => {
      const title = $(el).find('title').text().trim();
      const link = $(el).find('link').text().trim();
      const desc = $(el).find('description').text().trim();

      if (!title) return;
      if (!AI_KEYWORDS.some(kw => title.toLowerCase().includes(kw.toLowerCase()))) return;

      items.push({
        title,
        url: link || '',
        source: sourceName,
        category: CATEGORIES.CHINA,
        publishedAt: new Date().toISOString(),
        content: desc.replace(/<[^>]*>/g, '').slice(0, 200),
        metadata: { score: 0 }
      });
    });

    return items.slice(0, 10);
  } catch {
    return [];
  }
}

/**
 * 知乎热榜（通过 RSSHub）
 */
async function crawlZhihu() {
  console.log('[China] 抓取知乎热榜...');
  const items = await fetchRSSAndFilter('https://rsshub.app/zhihu/hotlist', '知乎热榜');
  console.log(`[China] 知乎热榜: ${items.length} 条`);
  return items;
}

/**
 * 微博热搜（通过 RSSHub）
 */
async function crawlWeibo() {
  console.log('[China] 抓取微博热搜...');
  const items = await fetchRSSAndFilter('https://rsshub.app/weibo/search/hot', '微博热搜');
  console.log(`[China] 微博热搜: ${items.length} 条`);
  return items;
}

/**
 * 百度热搜（通过 RSSHub）
 */
async function crawlBaidu() {
  console.log('[China] 抓取百度热搜...');
  const items = await fetchRSSAndFilter('https://rsshub.app/baidu/topwords/0', '百度热搜');
  console.log(`[China] 百度热搜: ${items.length} 条`);
  return items;
}

/**
 * 抓取所有国内热搜
 */
export async function crawlChinaTrending() {
  console.log('[Crawler] 开始抓取国内科技热搜...');

  const [zhihu, weibo, baidu] = await Promise.all([
    crawlZhihu().catch(() => []),
    crawlWeibo().catch(() => []),
    crawlBaidu().catch(() => [])
  ]);

  const results = [...zhihu, ...weibo, ...baidu];
  console.log(`[Crawler] 国内热搜: 共获取 ${results.length} 条`);
  return results;
}
