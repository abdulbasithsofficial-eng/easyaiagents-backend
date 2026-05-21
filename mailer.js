const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
});

async function sendOtpEmail(to, otp, name = 'User') {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:#08090c;padding:32px;text-align:center;">
      <div style="display:inline-flex;align-items:center;gap:10px;">
        <div style="width:36px;height:36px;background:#e85a1e;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;font-size:18px;">🤖</div>
        <span style="font-size:20px;font-weight:800;color:white;letter-spacing:-0.5px;">EasyAIAgents</span>
      </div>
    </div>
    <!-- Body -->
    <div style="padding:36px 40px;">
      <h2 style="font-size:22px;font-weight:700;color:#08090c;margin:0 0 8px;">Hello, ${name}! 👋</h2>
      <p style="font-size:15px;color:#6b6860;margin:0 0 28px;line-height:1.6;">
        Here is your one-time verification code. It expires in <strong>10 minutes</strong>.
      </p>
      <!-- OTP Box -->
      <div style="background:#f5f4f0;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6b6860;margin-bottom:12px;">Your OTP Code</div>
        <div style="font-size:48px;font-weight:800;letter-spacing:12px;color:#08090c;font-family:monospace;">${otp}</div>
      </div>
      <p style="font-size:13px;color:#6b6860;line-height:1.6;margin:0;">
        If you did not request this code, please ignore this email. Do not share this code with anyone.
      </p>
    </div>
    <!-- Footer -->
    <div style="background:#f5f4f0;padding:20px 40px;text-align:center;">
      <p style="font-size:12px;color:#b0aca4;margin:0;">© 2025 EasyAIAgents.online — All rights reserved</p>
    </div>
  </div>
</body>
</html>`;

  return transporter.sendMail({
    from: `"EasyAIAgents" <${process.env.EMAIL_USER}>`,
    to,
    subject: `${otp} — Your EasyAIAgents Verification Code`,
    html,
  });
}

module.exports = { sendOtpEmail };
