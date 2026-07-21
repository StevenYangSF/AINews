/**
 * 全球技术社区爬虫
 * 覆盖 Hacker News、Reddit、Product Hunt、V2EX
 */

import * as cheerio from 'cheerio';
import { safeFetchJSON, safeFetchText } from '../utils.js';
import { CATEGORIES, AI_KEYWORDS } from '../config.js';

/**
 * 抓取 Hacker News（通过 Algolia API）
 * 过滤包含 AI 关键词的热帖
 */
async function crawlHackerNews() {
  console.log('[Community] 抓取 Hacker News...');

  const queries = ['AI', 'LLM', 'GPT', 'Claude', 'Agent'];
  const allItems = [];

  for (const query of queries) {
    const url = `https://hn.algolia.com/api/v1/search?tags=story&query=${query}&hitsPerPage=10`;
    const data = await safeFetchJSON(url);
    if (!data || !data.hits) continue;

    for (const hit of data.hits) {
      // 去重
      if (allItems.some(i => i.url === hit.url || i.title === hit.title)) continue;

      allItems.push({
        title: hit.title || '',
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        source: 'Hacker News',
        category: CATEGORIES.COMMUNITY,
        publishedAt: hit.created_at || new Date().toISOString(),
        content: '',
        metadata: {
          score: hit.points || 0,
          comments: hit.num_comments || 0
        }
      });
    }
  }

  // 按热度排序，取 Top 20
  allItems.sort((a, b) => (b.metadata?.score || 0) - (a.metadata?.score || 0));
  const results = allItems.slice(0, 20);
  console.log(`[Community] Hacker News: ${results.length} 条`);
  return results;
}

/**
 * 抓取 Reddit r/MachineLearning
 */
async function crawlReddit() {
  console.log('[Community] 抓取 Reddit...');

  const url = 'https://www.reddit.com/r/MachineLearning/hot.json?limit=20';
  const data = await safeFetchJSON(url);

  if (!data || !data.data || !data.data.children) {
    console.warn('[Community] Reddit 抓取失败');
    return [];
  }

  const items = data.data.children
    .filter(post => post.data && !post.data.stickied)
    .map(post => ({
      title: post.data.title || '',
      url: `https://reddit.com${post.data.permalink}`,
      source: 'Reddit r/MachineLearning',
      category: CATEGORIES.COMMUNITY,
      publishedAt: new Date(post.data.created_utc * 1000).toISOString(),
      content: post.data.selftext ? post.data.selftext.slice(0, 200) : '',
      metadata: {
        score: post.data.score || 0,
        comments: post.data.num_comments || 0
      }
    }));

  console.log(`[Community] Reddit: ${items.length} 条`);
  return items;
}

/**
 * 抓取 Product Hunt AI 相关产品
 */
async function crawlProductHunt() {
  console.log('[Community] 抓取 Product Hunt...');

  const html = await safeFetchText('https://www.producthunt.com/topics/artificial-intelligence');
  if (!html) return [];

  const $ = cheerio.load(html);
  const items = [];

  $('a[href*="/posts/"]').each((_, el) => {
    const $a = $(el);
    let href = $a.attr('href') || '';
    const title = $a.text().trim();

    if (!title || title.length < 5) return;

    if (href.startsWith('/')) {
      href = `https://www.producthunt.com${href}`;
    }

    if (items.some(i => i.url === href)) return;

    items.push({
      title,
      url: href,
      source: 'Product Hunt',
      category: CATEGORIES.COMMUNITY,
      publishedAt: new Date().toISOString(),
      content: '',
      metadata: { score: 0 }
    });
  });

  const results = items.slice(0, 10);
  console.log(`[Community] Product Hunt: ${results.length} 条`);
  return results;
}

/**
 * 抓取 V2EX AI/Deep Learning 节点
 */
async function crawlV2EX() {
  console.log('[Community] 抓取 V2EX...');

  const data = await safeFetchJSON('https://www.v2ex.com/api/topics/hot.json');
  if (!data || !Array.isArray(data)) return [];

  // 过滤 AI 相关话题
  const aiKeywords = ['ai', '人工智能', '大模型', 'gpt', 'llm', 'chatgpt', 'claude', 'agent', '机器学习', '深度学习'];

  const items = data
    .filter(topic => {
      const text = `${topic.title} ${topic.node?.title || ''}`.toLowerCase();
      return aiKeywords.some(kw => text.includes(kw));
    })
    .map(topic => ({
      title: topic.title || '',
      url: `https://www.v2ex.com/t/${topic.id}`,
      source: 'V2EX',
      category: CATEGORIES.COMMUNITY,
      publishedAt: new Date(topic.created * 1000).toISOString(),
      content: topic.content ? topic.content.slice(0, 200) : '',
      metadata: {
        score: topic.replies || 0,
        comments: topic.replies || 0
      }
    }));

  console.log(`[Community] V2EX: ${items.length} 条`);
  return items;
}

/**
 * 抓取所有社区源
 * @returns {Promise<Array>} RawItem 数组
 */
export async function crawlCommunities() {
  console.log('[Crawler] 开始抓取全球技术社区...');

  const [hn, reddit, ph, v2ex] = await Promise.all([
    crawlHackerNews().catch(() => []),
    crawlReddit().catch(() => []),
    crawlProductHunt().catch(() => []),
    crawlV2EX().catch(() => [])
  ]);

  const results = [...hn, ...reddit, ...ph, ...v2ex];
  console.log(`[Crawler] 全球社区: 共获取 ${results.length} 条`);
  return results;
}
