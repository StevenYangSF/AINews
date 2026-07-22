/**
 * 精选 AI 站点爬虫
 * 覆盖官方实验室、论文与代码、行业媒体、Hex2077、国内生态
 */

import * as cheerio from 'cheerio';
import RssParser from 'rss-parser';
import { safeFetchText, safeFetchJSON, isWithin24Hours } from '../utils.js';
import { LABS_SOURCES, PAPERS_SOURCES, MEDIA_SOURCES, HEX2077_SOURCES, EMBODIED_SOURCES, AUTO_AI_SOURCES, TESTING_SOURCES, CHINA_SOURCES, CATEGORIES } from '../config.js';

const rssParser = new RssParser({
  timeout: 15000,
  headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
});

// ===== 工具函数 =====

/**
 * 从 URL 提取主页地址
 */
function getHomepageUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}/`;
  } catch {
    return null;
  }
}

/**
 * 使用 Jina Reader API 抓取页面（免费、AI 友好）
 * 自动去除页眉页脚广告，返回干净文本
 * API: https://r.jina.ai/URL
 */
async function crawlWithJinaReader(source) {
  const jinaUrl = `https://r.jina.ai/${source.url}`;
  const text = await safeFetchText(jinaUrl);
  if (!text || text.length < 50) return [];

  // Jina 返回 Markdown 格式，提取标题行作为文章列表
  const items = [];
  const lines = text.split('\n');

  for (const line of lines) {
    // 匹配 Markdown 链接: [title](url)
    const match = line.match(/\[([^\]]{5,})\]\((https?:\/\/[^\)]+)\)/);
    if (match) {
      const [, title, url] = match;
      if (items.some(i => i.url === url || i.title === title)) continue;
      items.push({
        title: title.slice(0, 150),
        url,
        source: source.name,
        category: source.category,
        publishedAt: new Date().toISOString(),
        content: ''
      });
    }

    // 匹配 Markdown 标题行后面跟着的文本
    const headerMatch = line.match(/^#{1,3}\s+(.{10,})/);
    if (headerMatch && !items.some(i => i.title === headerMatch[1])) {
      items.push({
        title: headerMatch[1].slice(0, 150),
        url: source.url,
        source: source.name,
        category: source.category,
        publishedAt: new Date().toISOString(),
        content: ''
      });
    }

    if (items.length >= 10) break;
  }

  return items;
}

// ===== 通用抓取器 =====

async function crawlRSS(source) {
  try {
    const feed = await rssParser.parseURL(source.url);
    return (feed.items || [])
      .slice(0, 15)
      .map(item => ({
        title: item.title || '',
        url: item.link || '',
        source: source.name,
        category: source.category,
        publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
        content: item.contentSnippet || item.content || ''
      }));
  } catch (error) {
    console.warn(`[Sites] RSS 抓取失败 ${source.name}: ${error.message}`);
    // RSS 失败时回退到用 HTML 方式抓主页
    const homepage = getHomepageUrl(source.url);
    if (homepage) {
      console.log(`[Sites] ${source.name}: RSS 失败，回退 HTML 抓取 ${homepage}`);
      try {
        return await crawlHTML({ ...source, url: homepage });
      } catch { /* ignore */ }
    }
    return [];
  }
}

async function crawlHTML(source) {
  const html = await safeFetchText(source.url);
  if (!html) return [];

  const $ = cheerio.load(html);
  const items = [];

  // 多种选择器策略
  const selectors = [
    'article a[href]', 'a.post-link', '.post-title a', 'h2 a[href]',
    'h3 a[href]', '.article-title a', '.entry-title a', '.card a[href]',
    'a.stretched-link', '.post-card a', '.article-card a', 'a[href*="/blog/"]',
    'a[href*="/post/"]', 'a[href*="/article/"]', 'a[href*="/news/"]'
  ];

  for (const selector of selectors) {
    $(selector).each((_, el) => {
      const $a = $(el);
      let href = $a.attr('href') || '';
      const title = $a.text().trim();

      if (!title || title.length < 5 || title.length > 200) return;

      if (href.startsWith('/')) {
        const baseUrl = new URL(source.url);
        href = `${baseUrl.origin}${href}`;
      }
      if (!href.startsWith('http')) return;
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

    if (items.length >= 8) break;
  }

  return items.slice(0, 15);
}

// ===== Hex2077 专用抓取器 =====

/**
 * Hex2077 日报页面（/docs/）
 * 抓取每日 AI 资讯日报列表
 */
async function crawlHex2077Docs() {
  const html = await safeFetchText('https://hex2077.dev/docs/');
  if (!html) return [];

  const $ = cheerio.load(html);
  const items = [];

  $('a[href*="/docs/"]').each((_, el) => {
    const $a = $(el);
    let href = $a.attr('href') || '';
    if (href === '/docs' || href === '/docs/') return;

    const title = $a.find('h3').text().trim()
      || $a.find('.font-bold').first().text().trim()
      || $a.text().trim().slice(0, 100);

    if (!title || title.length < 5) return;
    if (href.startsWith('/')) href = `https://hex2077.dev${href}`;
    if (items.some(i => i.url === href)) return;

    const desc = $a.find('p').text().trim() || '';

    items.push({
      title,
      url: href,
      source: 'Hex2077 日报',
      category: CATEGORIES.MEDIA,
      publishedAt: new Date().toISOString(),
      content: desc.slice(0, 300)
    });
  });

  console.log(`[Hex2077] 日报: ${items.length} 条`);
  return items.slice(0, 10);
}

/**
 * Hex2077 周报页面（/blog/?category=weekly）
 */
async function crawlHex2077Weekly() {
  const html = await safeFetchText('https://hex2077.dev/blog/?category=weekly');
  if (!html) {
    // 备用：从 /blog/ 页面过滤 weekly
    return crawlHex2077BlogFiltered('weekly');
  }

  const $ = cheerio.load(html);
  const items = [];

  $('a[href*="/blog/weekly/"]').each((_, el) => {
    const $a = $(el);
    let href = $a.attr('href') || '';
    const title = $a.find('h3').text().trim()
      || $a.find('.font-bold').first().text().trim()
      || $a.text().trim().slice(0, 100);

    if (!title || title.length < 5) return;
    if (href.startsWith('/')) href = `https://hex2077.dev${href}`;
    if (items.some(i => i.url === href)) return;

    const desc = $a.find('p').text().trim() || '';

    items.push({
      title,
      url: href,
      source: 'Hex2077 周报',
      category: CATEGORIES.WEEKLY,
      publishedAt: new Date().toISOString(),
      content: desc.slice(0, 300)
    });
  });

  console.log(`[Hex2077] 周报: ${items.length} 条`);
  return items.slice(0, 8);
}

/**
 * Hex2077 博客页面（/blog/）
 */
async function crawlHex2077Blog() {
  const html = await safeFetchText('https://hex2077.dev/blog/');
  if (!html) return [];

  const $ = cheerio.load(html);
  const items = [];

  $('a[href*="/blog/"]').each((_, el) => {
    const $a = $(el);
    let href = $a.attr('href') || '';
    if (href === '/blog' || href === '/blog/' || href.includes('?category')) return;

    const title = $a.find('h3').text().trim()
      || $a.find('.font-bold').first().text().trim()
      || $a.text().trim().slice(0, 100);

    if (!title || title.length < 5) return;
    if (href.startsWith('/')) href = `https://hex2077.dev${href}`;
    if (items.some(i => i.url === href)) return;

    const desc = $a.find('p').text().trim() || '';

    items.push({
      title,
      url: href,
      source: 'Hex2077 博客',
      category: CATEGORIES.MEDIA,
      publishedAt: new Date().toISOString(),
      content: desc.slice(0, 300)
    });
  });

  console.log(`[Hex2077] 博客: ${items.length} 条`);
  return items.slice(0, 10);
}

/**
 * 备用：从 /blog/ 过滤 weekly 类型
 */
async function crawlHex2077BlogFiltered(filter) {
  const html = await safeFetchText('https://hex2077.dev/blog/');
  if (!html) return [];

  const $ = cheerio.load(html);
  const items = [];

  $(`a[href*="/blog/${filter}/"]`).each((_, el) => {
    const $a = $(el);
    let href = $a.attr('href') || '';
    const title = $a.find('h3').text().trim() || $a.text().trim().slice(0, 100);
    if (!title || title.length < 5) return;
    if (href.startsWith('/')) href = `https://hex2077.dev${href}`;
    if (items.some(i => i.url === href)) return;
    const desc = $a.find('p').text().trim() || '';
    items.push({ title, url: href, source: `Hex2077 ${filter}`, category: CATEGORIES.WEEKLY, publishedAt: new Date().toISOString(), content: desc.slice(0, 300) });
  });

  return items.slice(0, 8);
}

/**
 * Hex2077 导航站（nav.hex2077.dev）— 抓取 AI 工具推荐
 */
async function crawlHex2077Nav() {
  const html = await safeFetchText('https://nav.hex2077.dev/');
  if (!html) return [];

  const $ = cheerio.load(html);
  const items = [];

  // 导航站通常有卡片链接
  $('a[href^="http"]').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href') || '';
    const title = $a.text().trim() || $a.attr('title') || '';

    if (!title || title.length < 3 || title.length > 100) return;
    if (href.includes('nav.hex2077.dev')) return; // 跳过自身链接
    if (href.includes('github.com/justlovemaki')) return; // 跳过源码链接
    if (items.some(i => i.url === href)) return;

    items.push({
      title,
      url: href,
      source: 'Hex2077 导航',
      category: CATEGORIES.COMMUNITY,
      publishedAt: new Date().toISOString(),
      content: ''
    });
  });

  console.log(`[Hex2077] 导航: ${items.length} 条`);
  return items.slice(0, 15);
}

// ===== 调度逻辑 =====

async function crawlSource(source) {
  console.log(`[Sites] 抓取 ${source.name}...`);

  try {
    let items = [];

    switch (source.type) {
      case 'rss':
        items = await crawlRSS(source);
        break;
      case 'custom-hex2077-docs':
        items = await crawlHex2077Docs();
        break;
      case 'custom-hex2077-weekly':
        items = await crawlHex2077Weekly();
        break;
      case 'custom-hex2077-blog':
        items = await crawlHex2077Blog();
        break;
      case 'custom-hex2077-nav':
        items = await crawlHex2077Nav();
        break;
      default:
        items = await crawlHTML(source);
        break;
    }

    // 如果原始 URL 抓取结果为空，尝试 Jina Reader → 再回退到主页
    if (items.length === 0 && source.type === 'html') {
      // 第一优先回退：Jina Reader API（AI 友好，自动去噪）
      console.log(`[Sites] ${source.name}: HTML 无结果，尝试 Jina Reader...`);
      items = await crawlWithJinaReader(source);

      // 第二优先回退：主页
      if (items.length === 0) {
        const homepage = getHomepageUrl(source.url);
        if (homepage && homepage !== source.url) {
          console.log(`[Sites] ${source.name}: Jina 也无结果，回退主页 ${homepage}`);
          items = await crawlHTML({ ...source, url: homepage });
        }
      }
    }

    return items;
  } catch (error) {
    // 抓取失败时：Jina Reader → 主页回退
    console.warn(`[Sites] ${source.name} 抓取失败: ${error.message}`);

    if (source.type === 'html') {
      // 尝试 Jina Reader
      try {
        const jinaItems = await crawlWithJinaReader(source);
        if (jinaItems.length > 0) return jinaItems;
      } catch { /* ignore */ }

      // 回退主页
      const homepage = getHomepageUrl(source.url);
      if (homepage && homepage !== source.url) {
        console.log(`[Sites] ${source.name}: 尝试回退主页 ${homepage}`);
        try {
          return await crawlHTML({ ...source, url: homepage });
        } catch { /* ignore */ }
      }
    }
    return [];
  }
}

/**
 * 抓取所有精选站点
 */
export async function crawlSites() {
  console.log('[Crawler] 开始抓取精选站点...');

  const allSources = [
    ...LABS_SOURCES,
    ...PAPERS_SOURCES,
    ...MEDIA_SOURCES,
    ...HEX2077_SOURCES,
    ...EMBODIED_SOURCES,
    ...AUTO_AI_SOURCES,
    ...TESTING_SOURCES,
    ...CHINA_SOURCES
  ];

  const results = [];

  for (const source of allSources) {
    const items = await crawlSource(source);
    results.push(...items);
  }

  console.log(`[Crawler] 精选站点: 共获取 ${results.length} 条`);
  return results;
}
