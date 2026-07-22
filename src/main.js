/**
 * 主控脚本
 * 串联 Crawler → Deduplicator → HotDetector → Summarizer → Renderer 完整管道
 */

import { CrawlerScheduler } from './crawler/index.js';
import { Deduplicator } from './processor/deduplicator.js';
import { HotDetector } from './processor/hot-detector.js';
import { Summarizer } from './processor/summarizer.js';
import { filterEarlyBirdItems, generateEarlyBirdBrief } from './processor/early-bird.js';
import { sendEarlyBirdEmail } from './mailer.js';
import { Renderer } from './renderer/index.js';
import { getTodayDate } from './utils.js';
import { CATEGORIES, ALL_SOURCES } from './config.js';

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

    // 选取今日超级头条（6 条）：侧重 AI 大模型/Agent 发展最新消息
    // 优先从 labs/media 中选取大模型&Agent相关，再补充其他热点
    const aiModelKeywords = ['gpt', 'claude', 'gemini', 'llama', 'qwen', '通义', 'deepseek', 'kimi', 'grok', '大模型', 'llm', 'agent', '智能体', 'model', '模型', 'release', '发布', 'launch', 'foundation', 'frontier', 'reasoning', '推理', 'multimodal', '多模态', 'openai', 'anthropic', 'google', 'meta ai', '字节', 'mistral'];
    const headlineCategories = [CATEGORIES.LABS, CATEGORIES.MEDIA, CATEGORIES.CHINA, CATEGORIES.EMBODIED, CATEGORIES.AUTO_AI];

    // 第一优先级：AI大模型/Agent相关的重磅新闻（按 impactScore 排序）
    const aiModelItems = summarizedItems
      .filter(i => {
        const text = `${i.title} ${i.content || ''} ${(i.tags || []).join(' ')}`.toLowerCase();
        return aiModelKeywords.some(kw => text.includes(kw));
      })
      .sort((a, b) => (b.impactScore || 0) - (a.impactScore || 0) || (b.hotScore || b.score || 0) - (a.hotScore || a.score || 0));

    // 第二优先级：其他分类的热门头条
    const otherHotItems = summarizedItems
      .filter(i => headlineCategories.includes(i.category) && !aiModelItems.includes(i))
      .sort((a, b) => (b.hotScore || b.score || 0) - (a.hotScore || a.score || 0));

    // 取前4条AI大模型/Agent + 2条其他热点 = 6条
    let hotItems = [
      ...aiModelItems.slice(0, 4),
      ...otherHotItems.slice(0, 2)
    ].slice(0, 6);

    // 对头条强制调用 AI 生成摘要（即使配额紧张也优先保障头条质量）
    if (summarizer.provider && !summarizer.quotaExhausted) {
      console.log('[Main] 为 6 条头条强制生成 AI 摘要...');
      for (let i = 0; i < hotItems.length; i++) {
        if (!hotItems[i].summary || hotItems[i].summary.length < 20) {
          const result = await summarizer._callAI(hotItems[i].title, hotItems[i].content || '');
          hotItems[i].summary = result.summary || hotItems[i].summary;
          hotItems[i].tags = result.tags.length > 0 ? result.tags : hotItems[i].tags;
        }
      }
    }
    hotItems.forEach(i => { i.isHot = true; });
    const githubItems = summarizedItems.filter(i => i.category === CATEGORIES.GITHUB);
    const labsItems = summarizedItems.filter(i => i.category === CATEGORIES.LABS);
    const papersItems = summarizedItems.filter(i => i.category === CATEGORIES.PAPERS);
    const mediaItems = summarizedItems.filter(i => i.category === CATEGORIES.MEDIA);
    const embodiedItems = summarizedItems.filter(i => i.category === CATEGORIES.EMBODIED);
    const autoAiAllItems = summarizedItems.filter(i => i.category === CATEGORIES.AUTO_AI);

    // 汽车AI：国内外各一半均衡展示
    const chinaAutoKeywords = ['华为', '百度', '小鹏', '蔚来', '理想', '比亚迪', '小马智行', '文远知行', 'Momenta', '地平线', '卓驭', '盖世', '九章', '车东西', '高工', '新出行', '萝卜快跑', '智加', 'Apollo', 'gasgoo', 'cn.gasgoo', 'csdn', 'zhihu', 'deepshare', 'autobit', 'gg-ai'];
    const chinaAutoItems = autoAiAllItems.filter(i => {
      const text = `${i.title} ${i.source} ${(i.urls || []).join(' ')} ${i.url || ''}`.toLowerCase();
      return chinaAutoKeywords.some(kw => text.includes(kw.toLowerCase()));
    });
    const globalAutoItems = autoAiAllItems.filter(i => !chinaAutoItems.includes(i));

    // 各取一半，最多 30 条
    const halfLimit = 15;
    const autoAiItems = [
      ...chinaAutoItems.slice(0, halfLimit),
      ...globalAutoItems.slice(0, halfLimit)
    ];

    const testingItems = summarizedItems.filter(i => i.category === CATEGORIES.TESTING);
    const weeklyItems = summarizedItems.filter(i => i.category === CATEGORIES.WEEKLY);
    const communityItems = summarizedItems.filter(i => i.category === CATEGORIES.COMMUNITY);
    const chinaItems = summarizedItems.filter(i => i.category === CATEGORIES.CHINA);

    // 计算热度指数
    const heatIndex = Math.min(99, Math.round(
      (summarizedItems.length * 0.4) + (hotItems.length * 20) + (githubItems.length * 2) + (embodiedItems.length * 2) + (autoAiItems.length * 2)
    ));

    // ===== AI早知道：筛选海外前沿 + 生成晨报 =====
    console.log('[Main] 生成《AI早知道》前沿科技晨报...');
    const earlyBirdItems = filterEarlyBirdItems(summarizedItems);
    const earlyBirdMarkdown = generateEarlyBirdBrief(earlyBirdItems);
    console.log(`[Main] 《AI早知道》: ${earlyBirdItems.length} 条前沿动态`);

    // 构建 DailyData
    const dailyData = {
      date: getTodayDate(),
      updatedAt: new Date().toISOString(),
      heatIndex,
      hotItems,
      earlyBird: { items: earlyBirdItems, markdown: earlyBirdMarkdown },
      github: githubItems.slice(0, 20),
      labs: labsItems.slice(0, 15),
      papers: papersItems.slice(0, 15),
      media: mediaItems.slice(0, 30),
      embodied: embodiedItems.slice(0, 15),
      autoAi: autoAiItems,
      testing: testingItems.slice(0, 15),
      weekly: weeklyItems.slice(0, 10),
      community: communityItems.slice(0, 20),
      china: chinaItems.slice(0, 15),
      stats: {
        totalSources: ALL_SOURCES.length,
        successSources: ALL_SOURCES.length - crawlErrors.length,
        failedSources: crawlErrors
      }
    };

    renderer.render(dailyData);

    // ===== 发送《AI早知道》邮件 =====
    if (earlyBirdItems.length > 0) {
      await sendEarlyBirdEmail(earlyBirdMarkdown);
    }

    // ===== 完成 =====
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log(`║  ✅ 构建完成! 耗时 ${elapsed}s`);
    console.log(`║  📊 数据: ${summarizedItems.length} 条 | 🔥 爆款: ${hotItems.length} 条`);
    console.log(`║  📁 输出: dist/index.html + dist/data.json`);
    console.log('╚══════════════════════════════════════════════════╝');

    // 强制退出，避免未关闭的异步连接导致进程挂起
    process.exit(0);

  } catch (error) {
    console.error(`[Main] ❌ 致命错误: ${error.message}`);
    console.error(error.stack);
    renderer.renderError([error.message]);
    process.exit(0);
  }
}

main();
