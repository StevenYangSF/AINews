/**
 * AI 摘要引擎
 * 支持 OpenAI API（优先）和 Google Gemini API
 * 含降级逻辑：无 API Key 或调用失败时使用截断文本
 */

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SUMMARIZER_CONFIG, TAG_CATEGORIES } from '../config.js';
import { sleep, truncate } from '../utils.js';

export class Summarizer {
  constructor() {
    this.openaiKey = process.env.OPENAI_API_KEY || '';
    this.geminiKey = process.env.GEMINI_API_KEY || '';
    this.xaiKey = process.env.XAI_API_KEY || '';
    this.provider = null; // 'xai' | 'gemini' | 'openai' | null
    this.openaiClient = null;
    this.geminiModel = null;
    this.requestCount = 0;
    this.lastRequestTime = 0;
    this.quotaExhausted = false;
    this.consecutiveFailures = 0;

    // 优先级: xAI (免费) > Gemini (免费) > OpenAI (付费)
    if (this.xaiKey) {
      this.openaiClient = new OpenAI({ apiKey: this.xaiKey, baseURL: 'https://api.x.ai/v1' });
      this.provider = 'xai';
      console.log('[Summarizer] ✅ xAI API 已配置 (grok-3-mini-fast)');
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
      console.warn('[Summarizer] ⚠️ 未配置任何 AI API Key，将使用截断文本作为摘要');
    }
  }

  /**
   * 限流控制
   */
  async _rateLimit() {
    this.requestCount++;
    const limit = this.provider === 'openai' ? 50 : SUMMARIZER_CONFIG.maxRequestsPerMinute;
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
   * 构建 prompt（精简版，减少 token 消耗）
   */
  _buildPrompt(title, content) {
    // 只取前 200 字内容，大幅减少 token 消耗
    const shortContent = content ? content.slice(0, 200) : '';
    return `根据标题和内容，1)用中文生成≤50字摘要 2)从[${TAG_CATEGORIES.join(',')}]选1-3个标签。
标题：${title}
内容：${shortContent}
回复JSON：{"summary":"摘要","tags":["标签"]}`;
  }

  /**
   * 调用 OpenAI 兼容 API（支持 OpenAI / xAI Grok）
   */
  async _callOpenAI(title, content) {
    if (!this.openaiClient || this.quotaExhausted) {
      return this._fallback(title, content);
    }

    await this._rateLimit();

    const model = this.provider === 'xai' ? 'grok-3-mini-fast' : 'gpt-4o-mini';

    try {
      const response = await this.openaiClient.chat.completions.create({
        model,
        messages: [{ role: 'user', content: this._buildPrompt(title, content) }],
        temperature: 0.3,
        max_tokens: 200
      });

      const text = response.choices[0]?.message?.content?.trim() || '';
      const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      this.consecutiveFailures = 0;

      return {
        summary: truncate(parsed.summary || '', SUMMARIZER_CONFIG.maxSummaryLength),
        tags: (parsed.tags || []).filter(tag => TAG_CATEGORIES.includes(tag))
      };
    } catch (error) {
      this.consecutiveFailures++;

      if (this.consecutiveFailures >= 3 || error.message.includes('429') || error.message.includes('insufficient_quota')) {
        if (!this.quotaExhausted) {
          this.quotaExhausted = true;
          console.warn(`[Summarizer] ⚠️ ${this.provider} API 不可用，切换降级模式: ${error.message.slice(0, 80)}`);
        }
      } else {
        console.warn(`[Summarizer] ${this.provider} 调用失败 (${this.consecutiveFailures}/3): ${error.message.slice(0, 100)}`);
      }

      return this._fallback(title, content);
    }
  }

  /**
   * 调用 Gemini API
   */
  async _callGemini(title, content) {
    if (!this.geminiModel || this.quotaExhausted) {
      return this._fallback(title, content);
    }

    await this._rateLimit();

    try {
      const result = await this.geminiModel.generateContent(this._buildPrompt(title, content));
      const text = result.response.text().trim();
      const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      this.consecutiveFailures = 0;

      return {
        summary: truncate(parsed.summary || '', SUMMARIZER_CONFIG.maxSummaryLength),
        tags: (parsed.tags || []).filter(tag => TAG_CATEGORIES.includes(tag))
      };
    } catch (error) {
      this.consecutiveFailures++;

      if (this.consecutiveFailures >= 3 || error.message.includes('429')) {
        if (!this.quotaExhausted) {
          this.quotaExhausted = true;
          console.warn(`[Summarizer] ⚠️ Gemini API 不可用，切换降级模式: ${error.message.slice(0, 80)}`);
        }
      } else {
        console.warn(`[Summarizer] Gemini 调用失败 (${this.consecutiveFailures}/3): ${error.message.slice(0, 100)}`);
      }

      return this._fallback(title, content);
    }
  }

  /**
   * 统一 AI 调用入口
   */
  async _callAI(title, content) {
    if (this.provider === 'xai' || this.provider === 'openai') {
      return this._callOpenAI(title, content);
    } else if (this.provider === 'gemini') {
      return this._callGemini(title, content);
    }
    return this._fallback(title, content);
  }

  /**
   * 降级方案：截断文本 + 基于关键词的标签匹配
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

    return { summary, tags: tags.slice(0, 3) };
  }

  /**
   * 批量生成摘要
   */
  async summarize(newsItems) {
    if (!newsItems || newsItems.length === 0) return [];

    console.log(`[Summarizer] 开始生成摘要: ${newsItems.length} 条 (provider: ${this.provider || 'fallback'})`);
    this.lastRequestTime = Date.now();
    this.requestCount = 0;

    // 只对前 30 条高优先级内容调 AI（节省配额），其余用降级
    const AI_LIMIT = 30;
    const results = [];

    for (let i = 0; i < newsItems.length; i++) {
      const item = newsItems[i];
      const contentLength = (item.content || '').length + (item.title || '').length;

      let summaryData;
      if (i >= AI_LIMIT || contentLength < SUMMARIZER_CONFIG.contentThreshold || !this.provider || this.quotaExhausted) {
        summaryData = this._fallback(item.title, item.content);
      } else {
        summaryData = await this._callAI(item.title, item.content);
      }

      results.push({
        ...item,
        summary: summaryData.summary || truncate(item.title, 50),
        tags: summaryData.tags || []
      });
    }

    const aiCount = Math.min(AI_LIMIT, newsItems.length) - (this.quotaExhausted ? this.consecutiveFailures : 0);
    console.log(`[Summarizer] 摘要生成完成: ${results.length} 条 (AI摘要: ~${Math.max(0, aiCount)} 条)`);
    return results;
  }
}
