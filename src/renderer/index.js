/**
 * 渲染引擎
 * 将 DailyData 注入 HTML 模板，输出静态页面到 dist/
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..', '..');
const TEMPLATE_PATH = join(ROOT_DIR, 'template', 'index.html');
const DIST_DIR = join(ROOT_DIR, 'dist');

export class Renderer {
  /**
   * 渲染静态页面
   * @param {object} dailyData - DailyData 对象
   * @returns {string} 生成的 HTML 内容
   */
  render(dailyData) {
    console.log('[Renderer] 开始渲染静态页面...');

    // 确保 dist 目录存在
    if (!existsSync(DIST_DIR)) {
      mkdirSync(DIST_DIR, { recursive: true });
    }

    // 读取模板
    const template = readFileSync(TEMPLATE_PATH, 'utf-8');

    // 注入数据：替换占位符
    const dataJson = JSON.stringify(dailyData, null, 0);
    const html = template.replace('__DAILY_DATA__', dataJson);

    // 写入 HTML
    const htmlPath = join(DIST_DIR, 'index.html');
    writeFileSync(htmlPath, html, 'utf-8');
    console.log(`[Renderer] ✅ HTML 已生成: ${htmlPath}`);

    // 同时输出 data.json（调试用）
    const jsonPath = join(DIST_DIR, 'data.json');
    writeFileSync(jsonPath, JSON.stringify(dailyData, null, 2), 'utf-8');
    console.log(`[Renderer] ✅ JSON 已生成: ${jsonPath}`);

    return html;
  }

  /**
   * 渲染错误页面（所有数据源失败时使用）
   * @param {Array<string>} errors - 错误信息列表
   */
  renderError(errors) {
    console.log('[Renderer] 渲染错误提示页面...');

    if (!existsSync(DIST_DIR)) {
      mkdirSync(DIST_DIR, { recursive: true });
    }

    const errorData = {
      date: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString(),
      heatIndex: 0,
      hotItems: [],
      github: [],
      curated: [],
      community: [],
      stats: {
        totalSources: 0,
        successSources: 0,
        failedSources: errors
      }
    };

    const template = readFileSync(TEMPLATE_PATH, 'utf-8');
    const html = template.replace('__DAILY_DATA__', JSON.stringify(errorData));

    writeFileSync(join(DIST_DIR, 'index.html'), html, 'utf-8');
    writeFileSync(join(DIST_DIR, 'data.json'), JSON.stringify(errorData, null, 2), 'utf-8');

    console.log('[Renderer] ⚠️ 错误页面已生成');
  }
}
