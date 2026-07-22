/**
 * 邮件自动推送模块
 * 将《AI早知道》晨报发送到指定邮箱
 * 使用 QQ 邮箱 SMTP 或 Gmail SMTP
 */

import nodemailer from 'nodemailer';
import { getTodayDate } from './utils.js';

/**
 * 发送《AI早知道》晨报邮件
 * @param {string} markdownContent - 晨报 Markdown 内容
 * @returns {Promise<boolean>} 是否发送成功
 */
export async function sendEarlyBirdEmail(markdownContent) {
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASS || ''; // QQ邮箱授权码
  const recipient = process.env.EMAIL_TO || '278908513@qq.com';

  if (!smtpUser || !smtpPass) {
    console.warn('[Mailer] ⚠️ 未配置 SMTP_USER/SMTP_PASS，跳过邮件发送');
    return false;
  }

  // 自动识别 SMTP 服务（QQ 邮箱 / Gmail / 163）
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

  // Markdown → 简单 HTML 转换
  const htmlContent = markdownToHtml(markdownContent);
  const date = getTodayDate();

  const mailOptions = {
    from: `"AI早知道" <${smtpUser}>`,
    to: recipient,
    subject: `☀️ AI早知道 | 前沿科技晨报 ${date}`,
    html: htmlContent
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Mailer] ✅ 晨报已发送至 ${recipient}`);
    return true;
  } catch (error) {
    console.error(`[Mailer] ❌ 邮件发送失败: ${error.message}`);
    return false;
  }
}

/**
 * 简单 Markdown → HTML 邮件模板
 */
function markdownToHtml(md) {
  const body = md
    .replace(/^## (.+)$/gm, '<h2 style="color:#1a73e8;font-size:18px;margin:16px 0 8px;">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 style="color:#333;font-size:15px;margin:14px 0 6px;border-left:3px solid #1a73e8;padding-left:8px;">$1</h3>')
    .replace(/^\* \*\*(.+?)\*\*：(.+?) \[🔗 源链接\]\((.+?)\)$/gm, '<p style="margin:6px 0;padding-left:12px;border-left:2px solid #e8e8e8;"><strong style="color:#1d1d1f;">$1</strong><br><span style="color:#666;font-size:13px;">$2</span> <a href="$3" style="color:#1a73e8;font-size:12px;">🔗 查看原文</a></p>')
    .replace(/^\* \*\*(.+?)\*\*：(.+)$/gm, '<p style="margin:6px 0;padding-left:12px;border-left:2px solid #e8e8e8;"><strong>$1</strong>：<span style="color:#666;">$2</span></p>')
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #eee;margin:16px 0;">')
    .replace(/^\*(.+)\*$/gm, '<p style="color:#999;font-size:11px;font-style:italic;">$1</p>')
    .replace(/\n/g, '');

  return `
    <div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:20px;background:#fafafa;">
      <div style="background:#fff;border-radius:12px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        ${body}
      </div>
      <p style="text-align:center;color:#aaa;font-size:11px;margin-top:16px;">
        由 AI Daily 系统自动生成并推送 · <a href="https://stevenyangsf.github.io/AINews/" style="color:#1a73e8;">在线查看完整版</a>
      </p>
    </div>
  `;
}
