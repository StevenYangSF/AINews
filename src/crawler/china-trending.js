/**
 * 国内科技热搜爬虫
 * 覆盖知乎热榜、微博热搜、百度热搜
 * 使用完整 Headers 伪装绕过反爬
 */

import * as cheerio from 'cheerio';
import { safeFetchText, safeFetchJSON, fetchWithTimeout } from '../utils.js';
import { CATEGORIES } from '../config.js';

const AI_KEYWORDS = ['AI', '人工智能', '大模型', 'GPT', 'ChatGPT', 'Claude', '机器学习',
  '深度学习', '智能', 'LLM', 'OpenAI', 'Anthropic', '算力', '芯片', 'NVIDIA',
  '自动驾驶', '具身智能', 'Agent', '智能体', 'Sora', 'Gemini', '机器人', '端到端'];

// 国内站点专用 Headers（模拟浏览器完整请求头）
const CHINA_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate',
  'Connection': 'keep-alive',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none'
};

/**
 * 国内站点专用 fetch（带完整 Headers）
 */
async function chinaFetch(url) {
  try {
    const response = await fetchWithTimeout(url, { headers: CHINA_HEADERS }, 12000);
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

async function chinaFetchJSON(url) {
  try {
    const response = await fetchWithTimeout(url, {
      headers: { ...CHINA_HEADERS, 'Accept': 'application/json' }
    }, 12000);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * 抓取知乎热榜中的 AI 相关话题
 */
async function crawlZhihu() {
  console.log('[China] 抓取知乎热榜...');

  const html = await chinaFetch('https://www.zhihu.com/hot');
  if (!html) {
    // 备用：通过 API
    const apiData = await chinaFetchJSON('https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=50');
    if (!apiData || !apiData.data) return [];

    return apiData.data
      .filter(item => {
        const title = item.target?.title || '';
        return AI_KEYWORDS.some(kw => title.includes(kw));
      })
      .map(item => ({
        title: item.target?.title || '',
        url: `https://www.zhihu.com/question/${item.target?.id}`,
        source: '知乎热榜',
        category: CATEGORIES.CHINA,
        publishedAt: new Date().toISOString(),
        content: item.target?.excerpt || '',
        metadata: {
          score: item.detail_text ? parseInt(item.detail_text.replace(/\D/g, '')) || 0 : 0
        }
      }))
      .slice(0, 10);
  }

  const $ = cheerio.load(html);
  const items = [];

  // 知乎热榜条目选择器
  $('.HotList-item, .HotItem').each((_, el) => {
    const $el = $(el);
    const title = $el.find('.HotList-itemTitle, .HotItem-title').text().trim()
      || $el.find('h2').text().trim();
    const link = $el.find('a').attr('href') || '';
    const metrics = $el.find('.HotList-itemMetrics, .HotItem-metrics').text().trim();

    if (!title) return;

    // AI 关键词过滤
    if (!AI_KEYWORDS.some(kw => title.toLowerCase().includes(kw.toLowerCase()))) return;

    const url = link.startsWith('http') ? link : `https://www.zhihu.com${link}`;
    const score = parseInt(metrics.replace(/\D/g, '')) || 0;

    items.push({
      title,
      url,
      source: '知乎热榜',
      category: CATEGORIES.CHINA,
      publishedAt: new Date().toISOString(),
      content: '',
      metadata: { score }
    });
  });

  console.log(`[China] 知乎热榜: ${items.length} 条 AI 相关`);
  return items.slice(0, 10);
}

/**
 * 抓取微博热搜中的 AI/科技相关话题
 */
async function crawlWeibo() {
  console.log('[China] 抓取微博热搜...');

  const data = await chinaFetchJSON('https://weibo.com/ajax/side/hotSearch');
  if (!data || !data.data || !data.data.realtime) {
    // 备用方案：抓取页面
    const html = await chinaFetch('https://s.weibo.com/top/summary');
    if (!html) return [];

    const $ = cheerio.load(html);
    const items = [];

    $('td.td-02 a').each((_, el) => {
      const title = $(el).text().trim();
      const href = $(el).attr('href') || '';

      if (!title) return;
      if (!AI_KEYWORDS.some(kw => title.toLowerCase().includes(kw.toLowerCase()))) return;

      items.push({
        title,
        url: href.startsWith('http') ? href : `https://s.weibo.com${href}`,
        source: '微博热搜',
        category: CATEGORIES.CHINA,
        publishedAt: new Date().toISOString(),
        content: '',
        metadata: { score: 0 }
      });
    });

    return items.slice(0, 10);
  }

  // 使用 API 数据
  const items = data.data.realtime
    .filter(item => {
      const text = `${item.word || ''} ${item.note || ''}`;
      return AI_KEYWORDS.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
    })
    .map(item => ({
      title: item.word || item.note || '',
      url: `https://s.weibo.com/weibo?q=%23${encodeURIComponent(item.word || '')}%23`,
      source: '微博热搜',
      category: CATEGORIES.CHINA,
      publishedAt: new Date().toISOString(),
      content: item.note || '',
      metadata: {
        score: item.raw_hot || item.num || 0
      }
    }))
    .slice(0, 10);

  console.log(`[China] 微博热搜: ${items.length} 条 AI 相关`);
  return items;
}

/**
 * 抓取百度热搜榜中的 AI/科技相关话题
 */
async function crawlBaidu() {
  console.log('[China] 抓取百度热搜...');

  // 百度热搜 API
  const data = await chinaFetchJSON('https://top.baidu.com/api/board?platform=wise&tab=realtime');
  if (data && data.data && data.data.cards && data.data.cards[0]) {
    const items = data.data.cards[0].content
      .filter(item => {
        const text = `${item.word || ''} ${item.desc || ''}`;
        return AI_KEYWORDS.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
      })
      .map(item => ({
        title: item.word || '',
        url: item.url || `https://www.baidu.com/s?wd=${encodeURIComponent(item.word || '')}`,
        source: '百度热搜',
        category: CATEGORIES.CHINA,
        publishedAt: new Date().toISOString(),
        content: item.desc || '',
        metadata: { score: item.hotScore || 0 }
      }))
      .slice(0, 10);

    console.log(`[China] 百度热搜: ${items.length} 条 AI 相关`);
    return items;
  }

  // 备用：抓取百度热搜页面
  const html = await chinaFetch('https://top.baidu.com/board?tab=realtime');
  if (!html) return [];

  const $ = cheerio.load(html);
  const items = [];

  $('a[href*="baidu.com/s"],.category-wrap_iQLoo a').each((_, el) => {
    const $a = $(el);
    const title = $a.text().trim();
    const href = $a.attr('href') || '';

    if (!title || title.length < 4) return;
    if (!AI_KEYWORDS.some(kw => title.toLowerCase().includes(kw.toLowerCase()))) return;
    if (items.some(i => i.title === title)) return;

    items.push({
      title,
      url: href.startsWith('http') ? href : `https://www.baidu.com/s?wd=${encodeURIComponent(title)}`,
      source: '百度热搜',
      category: CATEGORIES.CHINA,
      publishedAt: new Date().toISOString(),
      content: '',
      metadata: { score: 0 }
    });
  });

  console.log(`[China] 百度热搜: ${items.length} 条 AI 相关`);
  return items.slice(0, 10);
}

/**
 * 抓取所有国内热搜
 * @returns {Promise<Array>} RawItem 数组
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
