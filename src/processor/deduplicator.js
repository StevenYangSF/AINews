/**
 * 去重引擎
 * 基于 Jaccard 相似度的标题去重与多源归并
 */

import { generateId } from '../utils.js';

/**
 * 文本预处理：小写化、去标点、分词
 */
function tokenize(text) {
  if (!text) return new Set();
  // 中英文混合分词：英文按空格/标点，中文按单字
  const cleaned = text.toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s]/g, ' ')
    .trim();

  const tokens = new Set();

  // 英文单词
  cleaned.split(/\s+/).forEach(word => {
    if (word.length > 1) tokens.add(word);
  });

  // 中文单字（简单分词）
  const chineseChars = cleaned.match(/[\u4e00-\u9fff]/g) || [];
  // 中文 bi-gram
  for (let i = 0; i < chineseChars.length - 1; i++) {
    tokens.add(chineseChars[i] + chineseChars[i + 1]);
  }

  return tokens;
}

/**
 * 计算 Jaccard 相似度
 * @param {Set} setA
 * @param {Set} setB
 * @returns {number} 0-1 之间的相似度
 */
function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * 去重引擎类
 */
export class Deduplicator {
  constructor(threshold = 0.6) {
    // 标题较短时使用较低阈值（0.6），长标题可以更严格
    this.threshold = threshold;
  }

  /**
   * 对原始数据进行去重和归并
   * @param {Array} rawItems - RawItem 数组
   * @returns {Array} NewsItem 数组（去重后）
   */
  deduplicate(rawItems) {
    if (!rawItems || rawItems.length === 0) return [];

    console.log(`[Dedup] 开始去重: 输入 ${rawItems.length} 条`);

    // 预处理：为每条数据计算 token 集合
    const processed = rawItems.map(item => ({
      ...item,
      tokens: tokenize(item.title)
    }));

    // 聚类：相似条目归为同一组
    const clusters = [];
    const assigned = new Set();

    for (let i = 0; i < processed.length; i++) {
      if (assigned.has(i)) continue;

      const cluster = [processed[i]];
      assigned.add(i);

      for (let j = i + 1; j < processed.length; j++) {
        if (assigned.has(j)) continue;

        const similarity = jaccardSimilarity(processed[i].tokens, processed[j].tokens);
        if (similarity >= this.threshold) {
          cluster.push(processed[j]);
          assigned.add(j);
        }
      }

      clusters.push(cluster);
    }

    // 归并：每个 cluster 合并为一条 NewsItem
    const newsItems = clusters.map(cluster => {
      // 选取最长标题作为主标题
      const primary = cluster.reduce((longest, item) =>
        item.title.length > longest.title.length ? item : longest, cluster[0]);

      // 聚合所有来源 URL 和名称
      const urls = [...new Set(cluster.map(i => i.url).filter(Boolean))];
      const sources = [...new Set(cluster.map(i => i.source).filter(Boolean))];
      const categories = [...new Set(cluster.map(i => i.category).filter(Boolean))];

      // 取最高热度
      const maxScore = Math.max(...cluster.map(i => i.metadata?.score || 0));
      const maxComments = Math.max(...cluster.map(i => i.metadata?.comments || 0));

      // 选取最长 content
      const content = cluster.reduce((longest, item) =>
        (item.content || '').length > longest.length ? (item.content || '') : longest, '');

      return {
        id: generateId(primary.url || primary.title),
        title: primary.title,
        urls,
        sources,
        categories,
        category: primary.category,
        publishedAt: primary.publishedAt,
        content,
        summary: '',
        tags: [],
        score: maxScore,
        comments: maxComments,
        isHot: false,
        metadata: primary.metadata || {}
      };
    });

    console.log(`[Dedup] 去重完成: ${rawItems.length} → ${newsItems.length} 条 (去重 ${rawItems.length - newsItems.length} 条)`);
    return newsItems;
  }
}
