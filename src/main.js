/**
 * 主控脚本
 * 串联 Crawler → Deduplicator → HotDetector → Summarizer → Renderer 完整管道
 */

import { CrawlerScheduler } from './crawler/index.js';
import { Deduplicator } from './processor/deduplicator.js';
import { HotDetector } from './processor/hot-detector.js';
import { Summarizer } from './processor/summarizer.js';
import { Renderer } from './renderer/index.js';
import { getTodayDate } from './utils.js';
import { CATEGORIES } from './config.js';

async function main() {
  const startTime = Date.now();
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║      AI Daily - 全网 AI 动态自动化聚合系统       ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`[Main] 启动时间: ${new Date().toISOString()}`);
  console.log('');

  const renderer = new Renderer();

  try {
    // ===== 阶段 1: 数据抓取 =====
    console.log('[Main] === 阶段 1/4: 数据抓取 ===');
    const crawler = new CrawlerScheduler();
    const { results: rawItems, errors: crawlErrors } = await crawler.crawlAll();

    if (rawItems.length === 0) {
      console.error('[Main] ❌ 所有数据源均抓取失败');
      renderer.renderError(crawlErrors);
      process.exit(0); // 不以失败退出，避免中断工作流
    }

    // ===== 阶段 2: 智能去重 =====
    console.log('');
    console.log('[Main] === 阶段 2/4: 智能去重 ===');
    const deduplicator = new Deduplicator();
    const dedupItems = deduplicator.deduplicate(rawItems);

    // ===== 阶段 3: 爆款识别 + AI 摘要 =====
    console.log('');
    console.log('[Main] === 阶段 3/4: 爆款识别 & AI 摘要 ===');
    const hotDetector = new HotDetector();
    const scoredItems = hotDetector.detect(dedupItems);

    const summarizer = new Summarizer();
    const summarizedItems = await summarizer.summarize(scoredItems);

    // ===== 阶段 4: 渲染输出 =====
    console.log('');
    console.log('[Main] === 阶段 4/4: 页面渲染 ===');

    // 分类整理
    const hotItems = summarizedItems.filter(i => i.isHot).slice(0, 3);
    const githubItems = summarizedItems.filter(i => i.category === CATEGORIES.GITHUB);
    const curatedItems = summarizedItems.filter(i =>
      [CATEGORIES.LABS, CATEGORIES.PAPERS, CATEGORIES.MEDIA].includes(i.category)
    );
    const communityItems = summarizedItems.filter(i =>
      [CATEGORIES.COMMUNITY, CATEGORIES.CHINA].includes(i.category)
    );

    // 计算热度指数（基于总数据量和爆款数）
    const heatIndex = Math.min(99, Math.round(
      (summarizedItems.length * 0.5) + (hotItems.length * 20) + (githubItems.length * 2)
    ));

    // 构建 DailyData
    const dailyData = {
      date: getTodayDate(),
      updatedAt: new Date().toISOString(),
      heatIndex,
      hotItems,
      github: githubItems.slice(0, 20),
      curated: curatedItems.slice(0, 30),
      community: communityItems.slice(0, 20),
      stats: {
        totalSources: 30,
        successSources: 30 - crawlErrors.length,
        failedSources: crawlErrors
      }
    };

    renderer.render(dailyData);

    // ===== 完成 =====
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log(`║  ✅ 构建完成! 耗时 ${elapsed}s`);
    console.log(`║  📊 数据: ${summarizedItems.length} 条 | 🔥 爆款: ${hotItems.length} 条`);
    console.log(`║  📁 输出: dist/index.html + dist/data.json`);
    console.log('╚══════════════════════════════════════════════════╝');

  } catch (error) {
    console.error(`[Main] ❌ 致命错误: ${error.message}`);
    console.error(error.stack);
    renderer.renderError([error.message]);
    process.exit(0); // 不以失败退出
  }
}

main();
