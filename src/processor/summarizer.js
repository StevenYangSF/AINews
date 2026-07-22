/**
 * AI 摘要引擎（v3）
 * 
 * 架构：
 * 1. 异步任务队列：Fetcher 与 Processor 解耦，并发处理
 * 2. 指数退避重试：超时/429 自动重试 3 次（2s, 4s, 8s）
 * 3. 多级降级链：主模型 → 低成本模型 → 本地正则提取
 * 
 * 支持提供商：Gemini > Kimi > xAI > OpenAI
 */

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SUMMARIZER_CONFIG, TAG_CATEGORIES } from '../config.js';
import { sleep, truncate } from '../utils.js';

// ===== 指数退避重试 =====

/**
 * 带指数退避的重试执行器
 * @param {Function} fn - 异步函数
 * @param {number} maxRetries - 最大重试次数
 * @param {number} baseDelay - 基础延迟（ms）
 * @returns {Promise<any>}
 */
async function withExponentialBackoff(fn, maxRetries = 3, baseDelay = 2000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const msg = error.message || '';
      // 只对 429 限流和 503 过载重试；网络不通/超时/配额耗尽不重试
      const isRetryable = (error.status === 429 || error.status === 503 ||
                          msg.includes('429') || msg.includes('rate'));
      
      // 网络层失败直接抛出
      if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED') || 
          msg.includes('ENOTFOUND') || msg.includes('insufficient_quota') ||
          msg.includes('suspended')) {
        throw error;
      }

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt); // 2s, 4s, 8s
      console.log(`[Retry] 第 ${attempt + 1} 次重试，等待 ${delay / 1000}s...`);
      await sleep(delay);
    }
  }
}

// ===== 异步任务队列 =====

class AsyncQueue {
  constructor(concurrency = 3) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  async push(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this._drain();
    });
  }

  async _drain() {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const { task, resolve, reject } = this.queue.shift();
      this.running++;
      task()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          this.running--;
          this._drain();
        });
    }
  }
}

// ===== Summarizer 主类 =====

export class Summarizer {
  constructor() {
    this.openaiKey = process.env.OPENAI_API_KEY || '';
    this.geminiKey = process.env.GEMINI_API_KEY || '';
    this.xaiKey = process.env.XAI_API_KEY || '';
    this.kimiKey = process.env.KIMI_API_KEY || '';
    this.provider = null;
    this.openaiClient = null;
    this.geminiModel = null;
    this.requestCount = 0;
    this.lastRequestTime = 0;
    this.quotaExhausted = false;
    this.consecutiveFailures = 0;
    this.taskQueue = new AsyncQueue(3); // 并发 3 个 AI 调用

    // 优先级: xAI (免费,美国IP可达) > Kimi > Gemini > OpenAI
    if (this.xaiKey) {
      this.openaiClient = new OpenAI({ apiKey: this.xaiKey, baseURL: 'https://api.x.ai/v1' });
      this.provider = 'xai';
      console.log('[Summarizer] ✅ xAI API 已配置 (grok-3-mini-fast)');
    } else if (this.kimiKey) {
      this.openaiClient = new OpenAI({ apiKey: this.kimiKey, baseURL: 'https://api.moonshot.cn/v1' });
      this.provider = 'kimi';
      console.log('[Summarizer] ✅ Kimi API 已配置 (moonshot-v1-8k)');
    } else if (this.geminiKey) {
      const genAI = new GoogleGenerativeAI(this.geminiKey);
      this.geminiModel = genAI.getGenerativeModel({ model: SUMMARIZER_CONFIG.model });
      this.provider = 'gemini';
      console.log('[Summarizer] ✅ Gemini API 已配置 (gemini-2.0-flash)');
    } else if (this.openaiKey) {
      this.openaiClient = new OpenAI({ apiKey: this.openaiKey });
      this.provider = 'openai';
      console.log('[Summarizer] ✅ OpenAI API 已配置 (gpt-4o-mini)');
    } else {
      console.warn('[Summarizer] ⚠️ 未配置任何 AI API Key，使用本地提取');
    }
  }

  /**
   * 限流控制
   */
  async _rateLimit() {
    this.requestCount++;
    const limit = this.provider === 'openai' ? 50 : this.provider === 'gemini' ? 14 : 30;
    if (this.requestCount >= limit) {
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
   * 构建 prompt（资深 AI 科技媒体主编）
   */
  _buildPrompt(title, content) {
    const shortContent = content ? content.slice(0, 500) : '';
    return `你是一位资深的 AI 科技媒体主编与技术专家。从以下原始文本中提取高信息浓度的资讯。

规则：
- 去粗取精：忽略广告、营销废话
- 准确翻译：外文翻译为中文技术语境表达，保留专有名词(LLM/RAG/Transformer等)
- 客观评分(1.0-5.0)：5.0=划时代突破 4.0-4.9=重磅更新 3.0-3.9=常规更新 1.0-2.9=软文

输入：
标题：${title}
内容：${shortContent || '无详细内容'}

仅输出合法JSON（不要markdown标记）：
{"title":"精炼中文标题(≤20字)","tldr":"一句话核心要点(≤50字)","key_takeaways":["要点1","要点2"],"category":"从[${TAG_CATEGORIES.join(',')}]选一个","impact_score":4.0,"tags":["标签1","标签2"]}`;
  }

  /**
   * 解析 AI 响应 JSON
   */
  _parseResponse(text) {
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    const summary = parsed.tldr || parsed.summary || '';
    const tags = (parsed.tags || []).filter(tag => TAG_CATEGORIES.includes(tag));

    return {
      summary: truncate(summary, SUMMARIZER_CONFIG.maxSummaryLength),
      tags: tags.length > 0 ? tags : (parsed.category ? [parsed.category] : []),
      impactScore: parsed.impact_score || 0,
      keyTakeaways: parsed.key_takeaways || [],
      refinedTitle: parsed.title || ''
    };
  }

  /**
   * 调用 OpenAI 兼容 API（含指数退避重试 + 模型降级）
   */
  async _callOpenAI(title, content) {
    if (!this.openaiClient || this.quotaExhausted) {
      return this._fallback(title, content);
    }

    await this._rateLimit();

    // 主模型
    const primaryModel = this.provider === 'xai' ? 'grok-3-mini-fast'
      : this.provider === 'kimi' ? 'moonshot-v1-8k'
      : 'gpt-4o-mini';

    // 降级模型（低成本/高速）
    const fallbackModel = this.provider === 'openai' ? 'gpt-4o-mini' : primaryModel;

    const prompt = this._buildPrompt(title, content);

    // 第一步：用主模型 + 指数退避重试
    try {
      const result = await withExponentialBackoff(async () => {
        const response = await this.openaiClient.chat.completions.create({
          model: primaryModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 300
        });
        return response.choices[0]?.message?.content?.trim() || '';
      }, 3, 2000);

      this.consecutiveFailures = 0;
      return this._parseResponse(result);

    } catch (primaryError) {
      // 第二步：降级到低成本模型（仅 OpenAI 有不同模型可选）
      if (this.provider === 'openai' && fallbackModel !== primaryModel) {
        try {
          console.warn(`[Summarizer] 主模型失败，降级到 ${fallbackModel}`);
          const response = await this.openaiClient.chat.completions.create({
            model: fallbackModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 200
          });
          const text = response.choices[0]?.message?.content?.trim() || '';
          this.consecutiveFailures = 0;
          return this._parseResponse(text);
        } catch { /* 降级也失败，走本地 */ }
      }

      // 第三步：标记配额耗尽
      this.consecutiveFailures++;
      if (this.consecutiveFailures >= 3 || primaryError.message.includes('429') || primaryError.message.includes('insufficient_quota')) {
        if (!this.quotaExhausted) {
          this.quotaExhausted = true;
          console.warn(`[Summarizer] ⚠️ ${this.provider} API 耗尽，切换本地提取: ${primaryError.message.slice(0, 60)}`);
        }
      }

      return this._fallback(title, content);
    }
  }

  /**
   * 调用 Gemini API（含指数退避重试）
   */
  async _callGemini(title, content) {
    if (!this.geminiModel || this.quotaExhausted) {
      return this._fallback(title, content);
    }

    await this._rateLimit();

    try {
      const result = await withExponentialBackoff(async () => {
        const res = await this.geminiModel.generateContent(this._buildPrompt(title, content));
        return res.response.text().trim();
      }, 3, 2000);

      this.consecutiveFailures = 0;
      return this._parseResponse(result);

    } catch (error) {
      this.consecutiveFailures++;

      if (this.consecutiveFailures >= 3 || error.message.includes('429')) {
        if (!this.quotaExhausted) {
          this.quotaExhausted = true;
          console.warn(`[Summarizer] ⚠️ Gemini API 耗尽，切换本地提取: ${error.message.slice(0, 60)}`);
        }
      }

      return this._fallback(title, content);
    }
  }

  /**
   * 统一 AI 调用入口
   */
  async _callAI(title, content) {
    if (this.provider === 'kimi' || this.provider === 'xai' || this.provider === 'openai') {
      return this._callOpenAI(title, content);
    } else if (this.provider === 'gemini') {
      return this._callGemini(title, content);
    }
    return this._fallback(title, content);
  }

  /**
   * 本地降级：正则提取 + 关键词打标签（零 API 消耗）
   */
  _fallback(title, content) {
    const text = content || title || '';
    const summary = truncate(text, SUMMARIZER_CONFIG.fallbackLength);

    const fullText = `${title} ${content}`.toLowerCase();
    const tags = [];

    if (fullText.match(/发布|release|launch|announce/)) tags.push('模型发布');
    if (fullText.match(/开源|open.?source|github|repo/)) tags.push('开源工具');
    if (fullText.match(/infra|基础设施|gpu|芯片|训练|推理|部署/)) tags.push('AI Infra');
    if (fullText.match(/融资|商业|企业|收购|市场|产品/)) tags.push('行业商业');
    if (fullText.match(/论文|paper|研究|arxiv|实验/)) tags.push('论文解读');
    if (fullText.match(/具身|embodied|humanoid|人形|机器人|robot|vla|灵巧手|aloha|unitree|宇树|傅利叶/)) tags.push('具身智能');
    if (fullText.match(/自动驾驶|autonomous.?driv|fsd|waymo|智驾|端到端|sdv|智能汽车|tesla.*ai/)) tags.push('自动驾驶');
    if (fullText.match(/agent|智能体|crewai|autogen|multi.?agent/)) tags.push('智能体');
    if (fullText.match(/安全|safety|alignment|jailbreak|红队/)) tags.push('AI 安全');
    if (fullText.match(/test|testing|自动化测试|playwright|selenium|cypress|robot.?framework|appium|qa|质量|sikulix|airtest|ocr|tesseract|visual.?test|self.?heal|mutation.?test|property.?based|hypothesis|schemathesis/)) tags.push('AI测试');

    if (tags.length === 0) tags.push('行业商业');

    return { summary, tags: tags.slice(0, 3), impactScore: 0, keyTakeaways: [], refinedTitle: '' };
  }

  /**
   * 批量生成摘要（异步队列 + 并发控制）
   */
  async summarize(newsItems) {
    if (!newsItems || newsItems.length === 0) return [];

    console.log(`[Summarizer] 开始生成摘要: ${newsItems.length} 条 (provider: ${this.provider || 'local'})`);
    this.lastRequestTime = Date.now();
    this.requestCount = 0;

    // 只对前 50 条高优先级内容调 AI
    const AI_LIMIT = 50;
    const results = new Array(newsItems.length);

    // 并发处理 AI 摘要任务
    const promises = newsItems.map((item, i) => {
      return this.taskQueue.push(async () => {
        const contentLength = (item.content || '').length + (item.title || '').length;

        let summaryData;
        if (i >= AI_LIMIT || contentLength < SUMMARIZER_CONFIG.contentThreshold || !this.provider || this.quotaExhausted) {
          summaryData = this._fallback(item.title, item.content);
        } else {
          summaryData = await this._callAI(item.title, item.content);
        }

        results[i] = {
          ...item,
          summary: summaryData.summary || truncate(item.title, 50),
          tags: summaryData.tags || [],
          impactScore: summaryData.impactScore || 0,
          keyTakeaways: summaryData.keyTakeaways || [],
          refinedTitle: summaryData.refinedTitle || ''
        };
      });
    });

    await Promise.all(promises);

    const aiCount = Math.min(AI_LIMIT, newsItems.length);
    console.log(`[Summarizer] 摘要完成: ${results.length} 条 (AI: ~${this.quotaExhausted ? 0 : aiCount}, 本地: ${results.length - aiCount})`);
    return results;
  }
}
