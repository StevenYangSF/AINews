/**
 * 爆款识别器
 * 基于加权算法进行跨源交叉验证，识别全网爆款
 */

/**
 * HotDetector - 爆款识别器
 *
 * 加权算法：
 * - 出现源数量 × 3
 * - 跨类别数 × 5
 * - 热度指标归一化 × 2
 * - 时效性加成（越新越高）
 *
 * 爆款条件：跨 ≥3 个不同类别
 */
export class HotDetector {
  constructor(options = {}) {
    this.minCategories = options.minCategories || 3;  // 最少跨类别数
    this.maxHotItems = options.maxHotItems || 3;      // 最多爆款数
    this.weights = {
      sourceCount: 3,
      categoryCount: 5,
      heatScore: 2,
      freshness: 1
    };
  }

  /**
   * 计算时效性分数（0-1）
   * 越新分越高
   */
  _freshnessScore(publishedAt) {
    if (!publishedAt) return 0.5;
    const now = Date.now();
    const pubTime = new Date(publishedAt).getTime();
    const hoursAgo = (now - pubTime) / (1000 * 60 * 60);

    if (hoursAgo <= 2) return 1.0;
    if (hoursAgo <= 6) return 0.8;
    if (hoursAgo <= 12) return 0.6;
    if (hoursAgo <= 24) return 0.4;
    return 0.2;
  }

  /**
   * 归一化热度分数
   * @param {number} score - 原始热度
   * @param {number} maxScore - 数据集最大热度
   * @returns {number} 0-1
   */
  _normalizeScore(score, maxScore) {
    if (maxScore === 0) return 0;
    return Math.min(score / maxScore, 1);
  }

  /**
   * 识别爆款
   * @param {Array} newsItems - 去重后的 NewsItem 数组
   * @returns {Array} 标记了 isHot 的 NewsItem 数组
   */
  detect(newsItems) {
    if (!newsItems || newsItems.length === 0) return [];

    console.log(`[HotDetect] 开始爆款识别: ${newsItems.length} 条`);

    // 找到最大热度（用于归一化）
    const maxScore = Math.max(...newsItems.map(i => i.score || 0), 1);

    // 计算综合热度分
    const scored = newsItems.map(item => {
      const sourceCount = (item.sources || []).length;
      const categoryCount = (item.categories || []).length;
      const heatNorm = this._normalizeScore(item.score || 0, maxScore);
      const freshness = this._freshnessScore(item.publishedAt);

      const hotScore =
        sourceCount * this.weights.sourceCount +
        categoryCount * this.weights.categoryCount +
        heatNorm * this.weights.heatScore +
        freshness * this.weights.freshness;

      return {
        ...item,
        hotScore,
        isHot: categoryCount >= this.minCategories
      };
    });

    // 按热度分排序
    scored.sort((a, b) => b.hotScore - a.hotScore);

    // 标记 Top N 为 HotItem（即使未达到跨类别阈值，也取热度最高的）
    let hotCount = 0;
    for (const item of scored) {
      if (item.isHot && hotCount < this.maxHotItems) {
        hotCount++;
      }
    }

    // 如果没有达到跨类别阈值的，取热度最高的 1-3 条作为 HotItem
    if (hotCount === 0) {
      for (let i = 0; i < Math.min(this.maxHotItems, scored.length); i++) {
        scored[i].isHot = true;
      }
    }

    const hotItems = scored.filter(i => i.isHot);
    console.log(`[HotDetect] 识别出 ${hotItems.length} 条爆款`);

    return scored;
  }
}
