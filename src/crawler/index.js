/**
 * 爬虫调度器
 * 协调所有爬虫模块的执行，统一容错与并发控制
 */

import { crawlGitHubTrending } from './github-trending.js';
import { crawlSites } from './sites.js';
import { crawlCommunities } from './communities.js';
import { crawlChinaTrending } from './china-trending.js';

/**
 * CrawlerScheduler - 爬虫调度器
 * 并发执行所有爬虫模块，汇总结果和错误
 */
export class CrawlerScheduler {
  constructor() {
    this.results = [];
    this.errors = [];
  }

  /**
   * 执行所有爬虫任务
   * @returns {Promise<{results: Array, errors: Array<string>}>}
   */
  async crawlAll() {
    console.log('='.repeat(50));
    console.log('[Scheduler] 开始全网数据抓取...');
    console.log('='.repeat(50));

    const startTime = Date.now();

    // 四大板块并发执行
    const tasks = [
      { name: 'GitHub Trending', fn: crawlGitHubTrending },
      { name: '25 精选站点', fn: crawlSites },
      { name: '全球技术社区', fn: crawlCommunities },
      { name: '国内科技热搜', fn: crawlChinaTrending }
    ];

    const taskResults = await Promise.allSettled(
      tasks.map(async (task) => {
        try {
          const items = await task.fn();
          console.log(`[Scheduler] ✅ ${task.name}: ${items.length} 条`);
          return { name: task.name, items };
        } catch (error) {
          console.error(`[Scheduler] ❌ ${task.name}: ${error.message}`);
          this.errors.push(`${task.name}: ${error.message}`);
          return { name: task.name, items: [] };
        }
      })
    );

    // 汇总结果
    for (const result of taskResults) {
      if (result.status === 'fulfilled' && result.value.items) {
        this.results.push(...result.value.items);
      } else if (result.status === 'rejected') {
        this.errors.push(result.reason?.message || 'Unknown error');
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('='.repeat(50));
    console.log(`[Scheduler] 抓取完成: ${this.results.length} 条数据, ${this.errors.length} 个错误, 耗时 ${elapsed}s`);
    console.log('='.repeat(50));

    return {
      results: this.results,
      errors: this.errors
    };
  }
}
