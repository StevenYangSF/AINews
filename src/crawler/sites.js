/**
 * 25 精选 AI 站点爬虫
 * 覆盖官方实验室、论文与代码、行业媒体、国内生态
 */

import * as cheerio from 'cheerio';
import RssParser from 'rss-parser';
import { safeFetchText, safeFetchJSON, isWithin24Hours } from '../utils.js';
import { LABS_SOURCES, PAPERS_SOURCES, MEDIA_SOURCES, CHINA_SOURCES, CATEGORIES } from '../config.js';

const rssParser = new RssParser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; AINewsBot/1.0)'
  }
});

/**
 * 通用 RSS 抓取
 */
async function crawlRSS(source) {
  try {
    const feed = await rssParser.parseURL(source.url);
    const items = (feed.items || [])
      .filter(item => isWithin24Hours(item.pubDate || item.isoDate))
      .slice(0, 10)
      .map(item => ({
        title: item.title || '',
        url: item.link || '',
        source: source.name,
        category: source.category,
        publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
        content: item.contentSnippet || item.content || ''
      }));
    return items;
  } catch (error) {
    console.warn(`[Sites] RSS 抓取失败 ${source.name}: ${error.message}`);
    return [];
  }
}

/**
 * 通用 HTML 页面抓取（提取文章列表）
 */
async function crawlHTML(source) {
  const html = await safeFetchText(source.url);
  if (!html) return [];

  const $ = cheerio.load(html);
  const items = [];

  // 通用策略：查找文章链接
  const selectors = [
    'article a[href]',
    'a.post-link',
    '.post-title a',
    'h2 a[href]',
    'h3 a[href]',
    '.article-title a',
    '.entry-title a',
    '.card a[href]',
    'a.stretched-link'
  ];

  for (const selector of selectors) {
    $(selector).each((_, el) => {
      const $a = $(el);
      let href = $a.attr('href') || '';
      const title = $a.text().trim();

      if (!title || title.length < 5) return;

      // 处理相对路径
      if (href.startsWith('/')) {
        const baseUrl = new URL(source.url);
        href = `${baseUrl.origin}${href}`;
      }

      // 避免重复
      if (items.some(i => i.url === href || i.title === title)) return;

      items.push({
        title,
        url: href,
        source: source.name,
        category: source.category,
        publishedAt: new Date().toISOString(),
        content: ''
      });
    });

    if (items.length >= 5) break;
  }

  return items.slice(0, 10);
}

/**
 * Hugging Face Papers 专用抓取
 */
async function crawlHuggingFacePapers() {
  const html = await safeFetchText('https://huggingface.co/papers');
  if (!html) return [];

  const $ = cheerio.load(html);
  const items = [];

  $('article a, .paper-card a, a[href*="/papers/"]').each((_, el) => {
    const $a = $(el);
    let href = $a.attr('href') || '';
    const title = $a.text().trim();

    if (!title || title.length < 10) return;
    if (!href.includes('/papers/')) return;

    if (href.startsWith('/')) {
      href = `https://huggingface.co${href}`;
    }

    if (items.some(i => i.url === href)) return;

    items.push({
      title,
      url: href,
      source: 'Hugging Face Papers',
      category: CATEGORIES.PAPERS,
      publishedAt: new Date().toISOString(),
      content: ''
    });
  });

  return items.slice(0, 10);
}

/**
 * arXiv RSS 抓取
 */
async function crawlArxiv(source) {
  return crawlRSS(source);
}

/**
 * 抓取单个数据源
 */
async function crawlSource(source) {
  console.log(`[Sites] 抓取 ${source.name}...`);

  try {
    if (source.type === 'rss') {
      return await crawlRSS(source);
    } else {
      return await crawlHTML(source);
    }
  } catch (error) {
    console.warn(`[Sites] ${source.name} 抓取失败: ${error.message}`);
    return [];
  }
}

/**
 * 抓取所有 25 精选站点
 * @returns {Promise<Array>} RawItem 数组
 */
export async function crawlSites() {
  console.log('[Crawler] 开始抓取 25 精选站点...');

  const allSources = [...LABS_SOURCES, ...PAPERS_SOURCES, ...MEDIA_SOURCES, ...CHINA_SOURCES];
  const results = [];

  for (const source of allSources) {
    const items = await crawlSource(source);
    results.push(...items);
  }

  console.log(`[Crawler] 25 精选站点: 共获取 ${results.length} 条`);
  return results;
}
