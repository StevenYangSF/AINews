/**
 * 两级去重引擎
 * 一级：SimHash 快速过滤同质转载（标题级）
 * 二级：TF-IDF 余弦相似度语义去重（标题+内容级）
 * 归并：同一事件多源报道合并为一条，底部附所有来源链接
 */

import { generateId } from '../utils.js';

// ===== 一级去重：SimHash 快速过滤 =====

/**
 * 文本预处理：小写化、去标点、分词（中英文混合）
 */
function tokenize(text) {
  if (!text) return [];
  const cleaned = text.toLowerCase().replace(/[^\w\u4e00-\u9fff\s]/g, ' ').trim();
  const tokens = [];

  // 英文单词
  cleaned.split(/\s+/).forEach(word => {
    if (word.length > 1) tokens.push(word);
  });

  // 中文 bi-gram
  const chars = cleaned.match(/[\u4e00-\u9fff]/g) || [];
  for (let i = 0; i < chars.length - 1; i++) {
    tokens.push(chars[i] + chars[i + 1]);
  }

  return tokens;
}

/**
 * 计算 64-bit SimHash（用于快速判断近似重复）
 */
function simhash(tokens) {
  const hashBits = 64;
  const vector = new Array(hashBits).fill(0);

  for (const token of tokens) {
    // 简单字符串哈希
    let hash = 0n;
    for (let i = 0; i < token.length; i++) {
      hash = ((hash << 5n) - hash + BigInt(token.charCodeAt(i))) & 0xFFFFFFFFFFFFFFFFn;
    }

    for (let i = 0; i < hashBits; i++) {
      if ((hash >> BigInt(i)) & 1n) {
        vector[i]++;
      } else {
        vector[i]--;
      }
    }
  }

  let fingerprint = 0n;
  for (let i = 0; i < hashBits; i++) {
    if (vector[i] > 0) fingerprint |= (1n << BigInt(i));
  }
  return fingerprint;
}

/**
 * 计算两个 SimHash 的汉明距离（不同的比特位数）
 */
function hammingDistance(a, b) {
  let xor = a ^ b;
  let dist = 0;
  while (xor > 0n) {
    dist += Number(xor & 1n);
    xor >>= 1n;
  }
  return dist;
}

// ===== 二级去重：TF-IDF 余弦相似度 =====

/**
 * 构建 TF-IDF 向量（简化版：使用 TF 而非完整 IDF）
 */
function buildTFVector(tokens) {
  const tf = new Map();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  return tf;
}

/**
 * 计算两个 TF 向量的余弦相似度
 */
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const [key, valA] of vecA) {
    normA += valA * valA;
    const valB = vecB.get(key) || 0;
    dotProduct += valA * valB;
  }

  for (const [, valB] of vecB) {
    normB += valB * valB;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

// ===== 两级去重引擎 =====

export class Deduplicator {
  constructor(options = {}) {
    // 一级：SimHash 汉明距离阈值（≤ 5 位认为近似重复）
    this.simhashThreshold = options.simhashThreshold || 5;
    // 二级：余弦相似度阈值（≥ 0.6 认为语义重复）
    this.semanticThreshold = options.semanticThreshold || 0.6;
  }

  /**
   * 两级去重 + 多源归并
   * @param {Array} rawItems - RawItem 数组
   * @returns {Array} NewsItem 数组（去重归并后）
   */
  deduplicate(rawItems) {
    if (!rawItems || rawItems.length === 0) return [];

    console.log(`[Dedup] 开始两级去重: 输入 ${rawItems.length} 条`);

    // 预处理
    const processed = rawItems.map(item => {
      const titleTokens = tokenize(item.title);
      const fullTokens = tokenize(`${item.title} ${item.content || ''}`);
      return {
        ...item,
        titleTokens,
        fullTokens,
        simhashValue: simhash(titleTokens),
        tfVector: buildTFVector(fullTokens)
      };
    });

    // ===== 一级去重：SimHash 快速聚类 =====
    const clusters = [];
    const assigned = new Set();
    let level1Dedup = 0;

    for (let i = 0; i < processed.length; i++) {
      if (assigned.has(i)) continue;

      const cluster = [processed[i]];
      assigned.add(i);

      for (let j = i + 1; j < processed.length; j++) {
        if (assigned.has(j)) continue;

        // 一级：SimHash 快速判断（汉明距离 ≤ 3）
        const dist = hammingDistance(processed[i].simhashValue, processed[j].simhashValue);
        if (dist <= this.simhashThreshold) {
          cluster.push(processed[j]);
          assigned.add(j);
          level1Dedup++;
          continue;
        }

        // 二级：余弦相似度语义判断
        const similarity = cosineSimilarity(processed[i].tfVector, processed[j].tfVector);
        if (similarity >= this.semanticThreshold) {
          cluster.push(processed[j]);
          assigned.add(j);
        }
      }

      clusters.push(cluster);
    }

    // ===== 归并：每个 cluster → 一条 NewsItem =====
    const newsItems = clusters.map(cluster => {
      // 选取最长标题作为主标题
      const primary = cluster.reduce((best, item) =>
        item.title.length > best.title.length ? item : best, cluster[0]);

      // 聚合所有来源
      const urls = [...new Set(cluster.map(i => i.url).filter(Boolean))];
      const sources = [...new Set(cluster.map(i => i.source).filter(Boolean))];
      const categories = [...new Set(cluster.map(i => i.category).filter(Boolean))];

      // 取最高热度
      const maxScore = Math.max(...cluster.map(i => i.metadata?.score || 0));
      const maxComments = Math.max(...cluster.map(i => i.metadata?.comments || 0));

      // 选取最长/最有价值的 content
      const content = cluster.reduce((best, item) =>
        (item.content || '').length > best.length ? (item.content || '') : best, '');

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
        metadata: primary.metadata || {},
        mergedCount: cluster.length  // 归并了多少条
      };
    });

    const level2Dedup = rawItems.length - newsItems.length - level1Dedup;
    console.log(`[Dedup] 去重完成: ${rawItems.length} → ${newsItems.length} 条`);
    console.log(`[Dedup]   一级(SimHash): 去除 ${level1Dedup} 条转载`);
    console.log(`[Dedup]   二级(语义): 合并 ${Math.max(0, level2Dedup)} 条同事件报道`);
    console.log(`[Dedup]   多源归并: ${newsItems.filter(i => i.mergedCount > 1).length} 条含多源链接`);

    return newsItems;
  }
}
