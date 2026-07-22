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
 * 构建合并邮件 HTML
 */
function buildEmailHtml({ hotItems, earlyBirdItems, date }) {
  // 今日超级头条部分
  let hotHtml = '';
  if (hotItems && hotItems.length > 0) {
    hotHtml = hotItems.map(item => {
      const url = (item.urls && item.urls[0]) || item.url || '#';
      return `<tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">
        <a href="${url}" style="color:#1d1d1f;text-decoration:none;font-weight:600;font-size:14px;">${item.title}</a>
        ${item.summary ? `<p style="margin:4px 0 0;color:#666;font-size:12px;line-height:1.5;">${item.summary}</p>` : ''}
      </td></tr>`;
    }).join('');
  }

  // AI早知道部分（按领域分组）
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
      earlyBirdHtml += `<h3 style="color:#1a73e8;font-size:14px;margin:16px 0 8px;border-left:3px solid #1a73e8;padding-left:8px;">${icon} ${label}</h3>`;
      for (const item of items) {
        const url = (item.urls && item.urls[0]) || item.url || '#';
        earlyBirdHtml += `<p style="margin:6px 0;padding-left:12px;border-left:2px solid #e8f0fe;">
          <a href="${url}" style="color:#1d1d1f;text-decoration:none;font-weight:600;font-size:13px;">${item.title}</a><br>
          <span style="color:#666;font-size:12px;">${item.summary || ''}</span>
        </p>`;
      }
    }
  }

  return `
    <div style="max-width:640px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',sans-serif;padding:16px;background:#f5f5f7;">
      <div style="background:#fff;border-radius:16px;padding:24px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
        
        <!-- 头部 -->
        <h1 style="font-size:20px;margin:0 0 4px;color:#1d1d1f;">🔥 AI Daily | 每日晨报</h1>
        <p style="color:#999;font-size:12px;margin:0 0 20px;">${date} · 自动生成</p>
        
        <!-- 今日超级头条 -->
        ${hotHtml ? `
        <h2 style="font-size:16px;color:#ff6b35;margin:0 0 12px;">🔥 今日超级头条</h2>
        <table style="width:100%;border-collapse:collapse;">${hotHtml}</table>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
        ` : ''}
        
        <!-- AI早知道 -->
        ${earlyBirdHtml ? `
        <h2 style="font-size:16px;color:#1a73e8;margin:0 0 12px;">☀️ AI早知道 | 前沿科技晨报</h2>
        ${earlyBirdHtml}
        ` : ''}
        
      </div>
      <p style="text-align:center;color:#aaa;font-size:11px;margin-top:16px;">
        由 AI Daily 系统自动生成 · <a href="https://stevenyangsf.github.io/AINews/" style="color:#1a73e8;">在线查看完整版</a>
      </p>
    </div>
  `;
}
