/**
 * email.service.js — Wrapper gửi email qua SMTP (nodemailer).
 *
 * Hạ tầng:
 *   - Dùng nodemailer + SMTP (Gmail hoặc SMTP relay khác).
 *   - ENV bắt buộc:
 *       SMTP_HOST       — VD: smtp.gmail.com
 *       SMTP_PORT       — VD: 465 (SSL) hoặc 587 (TLS)
 *       SMTP_SECURE     — "true" nếu port 465, "false" nếu 587
 *       SMTP_USER       — Tài khoản gửi (VD: huytruong061004@gmail.com)
 *       SMTP_PASSWORD   — App Password (KHÔNG phải mật khẩu Gmail thường)
 *       SMTP_FROM_NAME  — Tên hiển thị người gửi (optional, default: "Zhong Ruan")
 *
 *   - Nếu thiếu SMTP_* → service chuyển sang **dry-run mode**: log payload ra
 *     console (cho dev local chưa cấu hình), KHÔNG throw. Caller (contact-request.service)
 *     vẫn coi như gửi thành công để không làm fail request chính.
 *
 * Quy tắc:
 *   - sendContactNotification(...) LUÔN try/catch và **không throw ra ngoài**.
 *     Lỗi chỉ log để không làm fail cả request (data DB quan trọng hơn email).
 *   - Mọi nội dung email escape HTML cơ bản để tránh bị inject.
 */

const nodemailer = require("nodemailer");

let cachedTransport = null;

/**
 * Tạo (hoặc lấy cache) transporter. Trả null nếu thiếu ENV (dry-run mode).
 */
function getTransport() {
  if (cachedTransport !== null) return cachedTransport;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass || !Number.isFinite(port)) {
    return (cachedTransport = false); // sentinel: dry-run
  }

  const secure = String(process.env.SMTP_SECURE).toLowerCase() === "true";

  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
  return cachedTransport;
}

/**
 * Escape HTML cơ bản để chèn an toàn vào template email.
 */
function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Gửi email thông báo khi có contact request mới.
 *
 * @param {Object} params
 * @param {string} params.to            - Email nhận (ENV CONTACT_NOTIFICATION_EMAIL)
 * @param {string} params.fullName
 * @param {string} params.phone
 * @param {string} params.email
 * @param {string} params.message
 * @param {string} [params.requestId]   - ID record trong DB, đính kèm để tra cứu
 *
 * @returns {Promise<{ok: boolean, dryRun?: boolean, error?: string}>}
 *
 * Hàm này KHÔNG throw — luôn trả về object. Caller tự quyết định log/xử lý.
 */
async function sendContactNotification({
  to,
  fullName,
  phone,
  email,
  message,
  requestId = "",
}) {
  const transport = getTransport();
  const fromName = process.env.SMTP_FROM_NAME || "Zhong Ruan";
  const fromUser = process.env.SMTP_USER || "no-reply@zhongruan.local";
  const from = `"${fromName}" <${fromUser}>`;

  const subject = `[Zhong Ruan] Liên hệ mới từ ${fullName}`;
  const submittedAt = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #C8102E; margin-top: 0;">Liên hệ mới từ website</h2>
      <p style="color: #6B7280; font-size: 13px; margin: 0 0 16px;">
        Có yêu cầu liên hệ mới được gửi lúc <strong>${escapeHtml(submittedAt)}</strong>.
      </p>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 8px 12px; background: #F7F7F9; font-weight: 600; width: 130px;">Họ tên</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB;">${escapeHtml(fullName)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background: #F7F7F9; font-weight: 600;">Số điện thoại</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB;">
            <a href="tel:${escapeHtml(phone)}" style="color: #C8102E;">${escapeHtml(phone)}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background: #F7F7F9; font-weight: 600;">Email</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB;">
            <a href="mailto:${escapeHtml(email)}" style="color: #C8102E;">${escapeHtml(email)}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background: #F7F7F9; font-weight: 600; vertical-align: top;">Nội dung</td>
          <td style="padding: 8px 12px; white-space: pre-wrap;">${escapeHtml(message)}</td>
        </tr>
        ${requestId ? `
        <tr>
          <td style="padding: 8px 12px; background: #F7F7F9; font-weight: 600;">Request ID</td>
          <td style="padding: 8px 12px; font-family: monospace; font-size: 12px; color: #6B7280;">${escapeHtml(requestId)}</td>
        </tr>` : ""}
      </table>
      <p style="color: #9CA3AF; font-size: 12px; margin-top: 24px;">
        Vào Admin → Liên hệ để cập nhật trạng thái (NEW → CONTACTED → CLOSED).
      </p>
    </div>
  `;

  const text =
    `Liên hệ mới từ website Zhong Ruan\n` +
    `Thời gian: ${submittedAt}\n\n` +
    `Họ tên: ${fullName}\n` +
    `Số điện thoại: ${phone}\n` +
    `Email: ${email}\n\n` +
    `Nội dung:\n${message}\n\n` +
    (requestId ? `Request ID: ${requestId}\n` : "");

  // ===== Dry-run mode (chưa cấu hình SMTP) =====
  if (transport === false) {
    console.warn(
      "[email.service] SMTP chưa cấu hình (thiếu SMTP_HOST/SMTP_USER/SMTP_PASSWORD/SMTP_PORT) — bỏ qua gửi email, chỉ log payload:",
      { to, subject, fullName, phone, email, requestId }
    );
    return { ok: true, dryRun: true };
  }

  try {
    await transport.sendMail({ from, to, subject, html, text });
    return { ok: true };
  } catch (err) {
    console.error(
      "[email.service] Gửi email thất bại:",
      err && err.message ? err.message : err
    );
    return {
      ok: false,
      error: err && err.message ? err.message : "Unknown SMTP error",
    };
  }
}

module.exports = {
  sendContactNotification,
  // exported cho test đơn vị
  _internal: { escapeHtml, getTransport },
};