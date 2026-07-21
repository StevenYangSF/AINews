/**
 * AI 摘要引擎
 * 使用 Google Gemini API 生成 TL;DR 摘要和自动标签
 * 含降级逻辑：无 API Key 或调用失败时使用截断文本
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { SUMMARIZER_CONFIG, TAG_CATEGORIES } from '../config.js';
import { sleep, truncate } from '../utils.js';

export class Summarizer {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.model = null;
    this.requestCount = 0;
    this.lastRequestTime = 0;
    this.quotaExhausted = false;  // 配额耗尽标记
    this.consecutiveFailures = 0; // 连续失败计数

    if (this.apiKey) {
      const genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = genAI.getGenerativeModel({ model: SUMMARIZER_CONFIG.model });
      console.log('[Summarizer] Gemini API 已配置');
    } else {
      console.warn('[Summarizer] 未配置 GEMINI_API_KEY，将使用截断文本作为摘要');
    }
  }

  /**
   * 限流控制：确保不超过每分钟 15 次请求
   */
  async _rateLimit() {
    this.requestCount++;
    if (this.requestCount >= SUMMARIZER_CONFIG.maxRequestsPerMinute) {
      const elapsed = Date.now() - this.lastRequestTime;
      if (elapsed < 60000) {
        const waitTime = 60000 - elapsed + 1000;
        console.log(`[Summarizer] 限流等待 ${(waitTime / 1000).toFixed(0)}s...`);
        await sleep(waitTime);
      }
      this.requestCount = 0;
      this.lastRequestTime = Date.now();
    }
  }

  /**
   * 调用 Gemini API 生成摘要和标签
   * @param {string} title - 标题
   * @param {string} content - 内容
   * @returns {Promise<{summary: string, tags: string[]}>}
   */
  async _callGemini(title, content) {
    if (!this.model || this.quotaExhausted) {
      return this._fallback(title, content);
    }

    await this._rateLimit();

    const prompt = `你是一个 AI 新闻摘要助手。请根据以下标题和内容，完成两个任务：

1. 用中文生成一句话核心摘要（TL;DR），不超过50字
2. 从以下标签中选择 1-3 个最匹配的分类标签：${TAG_CATEGORIES.join('、')}

标题：${title}
内容：${content ? content.slice(0, 500) : '无详细内容'}

请用以下 JSON 格式回复（不要加 markdown 标记）：
{"summary": "一句话摘要", "tags": ["标签1", "标签2"]}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text().trim();

      // 解析 JSON 响应
      const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      // 成功：重置连续失败计数
      this.consecutiveFailures = 0;

      return {
        summary: truncate(parsed.summary || '', SUMMARIZER_CONFIG.maxSummaryLength),
        tags: (parsed.tags || []).filter(tag => TAG_CATEGORIES.includes(tag))
      };
    } catch (error) {
      this.consecutiveFailures++;

      // 检测配额耗尽：连续失败 3 次或明确 429 错误，立即切换全局降级
      if (this.consecutiveFailures >= 3 || error.message.includes('429')) {
        if (!this.quotaExhausted) {
          this.quotaExhausted = true;
          console.warn('[Summarizer] ⚠️ Gemini API 配额耗尽，切换为全局降级模式（截断文本替代）');
        }
      } else {
        console.warn(`[Summarizer] Gemini 调用失败 (${this.consecutiveFailures}/3): ${error.message.slice(0, 100)}`);
      }

      return this._fallback(title, content);
    }
  }

  /**
   * 降级方案：截断文本 + 基于关键词的标签匹配
   */
  _fallback(title, content) {
    const text = content || title || '';
    const summary = truncate(text, SUMMARIZER_CONFIG.fallbackLength);

    // 简单关键词标签匹配
    const fullText = `${title} ${content}`.toLowerCase();
    const tags = [];

    if (fullText.match(/发布|release|launch|announce/)) tags.push('模型发布');
    if (fullText.match(/开源|open.?source|github|repo/)) tags.push('开源工具');
    if (fullText.match(/infra|基础设施|gpu|芯片|训练|推理|部署/)) tags.push('AI Infra');
    if (fullText.match(/融资|商业|企业|收购|市场|产品/)) tags.push('行业商业');
    if (fullText.match(/论文|paper|研究|arxiv|实验/)) tags.push('论文解读');

    if (tags.length === 0) tags.push('行业商业'); // 默认标签

    return { summary, tags: tags.slice(0, 3) };
  }

  /**
   * 批量生成摘要
   * @param {Array} newsItems - NewsItem 数组
   * @returns {Promise<Array>} 带摘要的 NewsItem 数组
   */
  async summarize(newsItems) {
    if (!newsItems || newsItems.length === 0) return [];

    console.log(`[Summarizer] 开始生成摘要: ${newsItems.length} 条`);
    this.lastRequestTime = Date.now();
    this.requestCount = 0;

    const results = [];

    for (const item of newsItems) {
      // 内容不足 200 字、无 model、或配额耗尽时使用降级
      const contentLength = (item.content || '').length + (item.title || '').length;

      let summaryData;
      if (contentLength < SUMMARIZER_CONFIG.contentThreshold || !this.model || this.quotaExhausted) {
        summaryData = this._fallback(item.title, item.content);
      } else {
        summaryData = await this._callGemini(item.title, item.content);
      }

      results.push({
        ...item,
        summary: summaryData.summary || truncate(item.title, 50),
        tags: summaryData.tags || []
      });
    }

    console.log(`[Summarizer] 摘要生成完成: ${results.length} 条`);
    return results;
  }
}
