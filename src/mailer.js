/**
 * 邮件自动推送模块
 * 将「今日超级头条 + AI早知道」合并为一封邮件发送
 */

import nodemailer from 'nodemailer';
import { getTodayDate } from './utils.js';

/**
 * 发送每日晨报邮件（今日超级头条 + AI早知道）
 * @param {object} params
 * @param {Array} params.hotItems - 今日超级头条（6条）
 * @param {Array} params.earlyBirdItems - AI早知道条目
 * @param {string} params.earlyBirdMarkdown - AI早知道 Markdown
 * @returns {Promise<boolean>}
 */
export async function sendDailyEmail({ hotItems, earlyBirdItems, earlyBirdMarkdown }) {
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASS || '';
  const recipient = process.env.EMAIL_TO || '278908513@qq.com';

  if (!smtpUser || !smtpPass) {
    console.warn('[Mailer] ⚠️ 未配置 SMTP_USER/SMTP_PASS，跳过邮件发送');
    return false;
  }

  let smtpConfig;
  if (smtpUser.includes('@qq.com')) {
    smtpConfig = { host: 'smtp.qq.com', port: 465, secure: true };
  } else if (smtpUser.includes('@gmail.com')) {
    smtpConfig = { host: 'smtp.gmail.com', port: 465, secure: true };
  } else if (smtpUser.includes('@163.com')) {
    smtpConfig = { host: 'smtp.163.com', port: 465, secure: true };
  } else {
    smtpConfig = { host: 'smtp.qq.com', port: 465, secure: true };
  }

  const transporter = nodemailer.createTransport({
    ...smtpConfig,
    auth: { user: smtpUser, pass: smtpPass }
  });

  const date = getTodayDate();
  const htmlContent = buildEmailHtml({ hotItems, earlyBirdItems, date });

  const mailOptions = {
    from: `"AI Daily 晨报" <${smtpUser}>`,
    to: recipient,
    subject: `🔥 AI Daily | 今日超级头条 + AI早知道 ${date}`,
    html: htmlContent
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Mailer] ✅ 邮件已发送至 ${recipient}`);
    return true;
  } catch (error) {
    console.error(`[Mailer] ❌ 邮件发送失败: ${error.message}`);
    return false;
  }
}

/**
 * 构建合并邮件 HTML（深色极简科技风，小红书 3:4 卡片风格）
 */
function buildEmailHtml({ hotItems, earlyBirdItems, date }) {
  // 今日超级头条
  let hotHtml = '';
  if (hotItems && hotItems.length > 0) {
    hotHtml = hotItems.map(item => {
      const url = (item.urls && item.urls[0]) || item.url || '#';
      const source = (item.sources || [])[0] || '';
      return `<li class="news-item"><a href="${url}" style="color:#f8fafc;text-decoration:none;"><strong>${item.title}</strong></a>${item.summary ? `：${item.summary}` : ''}${source ? `<span class="source-tag">${source}</span>` : ''}</li>`;
    }).join('');
  }

  // AI早知道（按领域分组）
  const domainIcons = { llm_agent: '🤖', embodied: '🦾', chip: '⚡', space: '🚀' };
  const domainLabels = { llm_agent: '海外大模型 & Agent', embodied: '具身智能 & 机器人', chip: '最新 AI 芯片 & 算力', space: '太空探索 & 火箭回收' };

  let earlyBirdHtml = '';
  if (earlyBirdItems && earlyBirdItems.length > 0) {
    const grouped = {};
    earlyBirdItems.forEach(item => {
      const d = item.earlyBirdDomain || 'llm_agent';
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(item);
    });

    for (const [domain, items] of Object.entries(grouped)) {
      const icon = domainIcons[domain] || '📡';
      const label = domainLabels[domain] || '前沿';
      const listItems = items.map(item => {
        const url = (item.urls && item.urls[0]) || item.url || '#';
        const source = (item.sources || [])[0] || '';
        return `<li class="news-item"><a href="${url}" style="color:#f8fafc;text-decoration:none;"><strong>${item.title}</strong></a>${item.summary ? `：${item.summary}` : ''}${source ? `<span class="source-tag">${source}</span>` : ''}</li>`;
      }).join('');
      earlyBirdHtml += `
        <div class="section-card">
          <div class="section-title"><span>${icon}</span><span>${label}</span></div>
          <ul class="news-list">${listItems}</ul>
        </div>`;
    }
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Daily 晨报 ${date}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  max-width: 640px;
  margin: 0 auto;
  background-color: #090d16;
  background-image: radial-gradient(circle at 15% 15%, rgba(56,189,248,0.15) 0%, transparent 45%),
                    radial-gradient(circle at 85% 85%, rgba(129,140,248,0.12) 0%, transparent 45%);
  color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", sans-serif;
  padding: 40px 32px;
}
.header {
  display: flex; justify-content: space-between; align-items: flex-end;
  border-bottom: 2px solid rgba(255,255,255,0.08); padding-bottom: 20px; margin-bottom: 24px;
}
.badge {
  display: inline-block; background: linear-gradient(135deg, #38bdf8, #818cf8);
  color: #0f172a; font-size: 12px; font-weight: 800; padding: 4px 12px;
  border-radius: 14px; letter-spacing: 1px; text-transform: uppercase;
}
.title { font-size: 28px; font-weight: 900; color: #fff; margin-top: 6px; }
.date-info { text-align: right; color: #94a3b8; font-size: 13px; }
.section-label {
  font-size: 16px; font-weight: 700; color: #ff6b35; margin: 20px 0 12px;
  padding-left: 12px; border-left: 3px solid #ff6b35;
}
.section-card {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px; padding: 16px 20px; margin-bottom: 16px;
  backdrop-filter: blur(12px); box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}
.section-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 15px; font-weight: 700; color: #38bdf8; margin-bottom: 12px;
}
.news-list { list-style: none; }
.news-item {
  font-size: 13px; line-height: 1.6; color: #cbd5e1;
  padding: 6px 0 6px 14px; position: relative; border-bottom: 1px solid rgba(255,255,255,0.04);
}
.news-item:last-child { border-bottom: none; }
.news-item::before { content: "•"; position: absolute; left: 0; color: #818cf8; font-weight: bold; }
.news-item strong { color: #f8fafc; font-weight: 600; }
.news-item a { color: #f8fafc; text-decoration: none; }
.news-item a:hover { color: #38bdf8; }
.source-tag {
  display: inline-block; font-size: 10px; color: #38bdf8;
  background: rgba(56,189,248,0.1); padding: 1px 8px; border-radius: 4px; margin-left: 6px;
}
.footer {
  margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08);
  display: flex; justify-content: space-between; color: #64748b; font-size: 11px;
}
.footer a { color: #38bdf8; text-decoration: none; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <span class="badge">DAILY BRIEF</span>
      <h1 class="title">🔥 AI Daily 晨报</h1>
    </div>
    <div class="date-info">${date}</div>
  </div>

  ${hotHtml ? `
  <div class="section-label">🔥 今日超级头条</div>
  <div class="section-card">
    <ul class="news-list">${hotHtml}</ul>
  </div>
  ` : ''}

  ${earlyBirdHtml ? `
  <div class="section-label" style="color:#38bdf8;border-color:#38bdf8;">☀️ AI早知道 | 前沿科技</div>
  ${earlyBirdHtml}
  ` : ''}

  <div class="footer">
    <span>AI Daily 全网动态聚合系统</span>
    <a href="https://stevenyangsf.github.io/AINews/">在线查看完整版 →</a>
  </div>
</body>
</html>`;
}
