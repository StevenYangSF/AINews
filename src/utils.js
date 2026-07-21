/**
 * 工具函数模块
 * 提供带超时、重试和并发控制的 HTTP 请求工具
 */

import { CRAWLER_CONFIG } from './config.js';

/**
 * 带超时的 fetch 请求
 * @param {string} url - 请求 URL
 * @param {object} options - fetch 选项
 * @param {number} timeout - 超时毫秒数
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, options = {}, timeout = CRAWLER_CONFIG.timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': CRAWLER_CONFIG.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        ...options.headers
      }
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 带重试的 fetch 请求
 * @param {string} url - 请求 URL
 * @param {object} options - fetch 选项
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, options = {}) {
  const { retries, retryDelay, timeout } = CRAWLER_CONFIG;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeout);

      if (response.status === 403 || response.status === 429) {
        throw new Error(`HTTP ${response.status}: ${url}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${url}`);
      }

      return response;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      console.warn(`[Retry ${attempt + 1}/${retries}] ${url}: ${error.message}`);
      await sleep(retryDelay);
    }
  }
}

/**
 * 并发控制器
 * 限制同时执行的异步任务数量
 */
export class ConcurrencyPool {
  constructor(limit = CRAWLER_CONFIG.concurrency) {
    this.limit = limit;
    this.running = 0;
    this.queue = [];
  }

  async run(fn) {
    while (this.running >= this.limit) {
      await new Promise(resolve => this.queue.push(resolve));
    }

    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        next();
      }
    }
  }

  /**
   * 批量执行任务，带请求间隔
   * @param {Array<Function>} tasks - 异步任务函数数组
   * @param {number} delay - 任务之间的延迟毫秒数
   * @returns {Promise<Array<{result?: any, error?: Error}>>}
   */
  async runAll(tasks, delay = CRAWLER_CONFIG.requestDelay) {
    const results = [];
    const promises = tasks.map((task, index) => {
      return this.run(async () => {
        if (index > 0) {
          await sleep(delay);
        }
        try {
          const result = await task();
          results[index] = { result };
        } catch (error) {
          results[index] = { error };
        }
      });
    });

    await Promise.all(promises);
    return results;
  }
}

/**
 * 延迟函数
 * @param {number} ms - 毫秒数
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 安全获取文本内容
 * @param {string} url
 * @returns {Promise<string|null>}
 */
export async function safeFetchText(url) {
  try {
    const response = await fetchWithRetry(url);
    return await response.text();
  } catch (error) {
    console.warn(`[Skip] ${url}: ${error.message}`);
    return null;
  }
}

/**
 * 安全获取 JSON 内容
 * @param {string} url
 * @returns {Promise<object|null>}
 */
export async function safeFetchJSON(url) {
  try {
    const response = await fetchWithRetry(url, {
      headers: { 'Accept': 'application/json' }
    });
    return await response.json();
  } catch (error) {
    console.warn(`[Skip] ${url}: ${error.message}`);
    return null;
  }
}

/**
 * 生成基于内容的唯一 ID
 * @param {string} text
 * @returns {string}
 */
export function generateId(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * 获取今日日期字符串（北京时间）
 * @returns {string} YYYY-MM-DD
 */
export function getTodayDate() {
  const now = new Date();
  // UTC+8
  const offset = 8 * 60 * 60 * 1000;
  const beijing = new Date(now.getTime() + offset);
  return beijing.toISOString().slice(0, 10);
}

/**
 * 判断日期是否在最近 24 小时内
 * @param {string|Date} date
 * @returns {boolean}
 */
export function isWithin24Hours(date) {
  if (!date) return true; // 无日期信息默认保留
  const d = new Date(date);
  if (isNaN(d.getTime())) return true;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  return diff <= 24 * 60 * 60 * 1000;
}

/**
 * 截断文本到指定长度
 * @param {string} text
 * @param {number} maxLen
 * @returns {string}
 */
export function truncate(text, maxLen) {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}
