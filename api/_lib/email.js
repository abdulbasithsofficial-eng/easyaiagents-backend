import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

export async function sendOTP(email, otp, type = 'login') {
  const subjects = {
    signup: '🎉 Verify your EasyAIAgents account',
    login: '🔐 Your login code',
    reset: '🔑 Reset your password'
  };

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:40px 20px;background:#f5f4f0">
      <div style="background:#fff;border-radius:16px;padding:40px;box-shadow:0 4px 20px rgba(0,0,0,.08)">
        <div style="text-align:center;margin-bottom:30px">
          <div style="font-size:32px">🤖</div>
          <h1 style="color:#08090c;font-size:22px;margin:10px 0">EasyAIAgents</h1>
        </div>
        <h2 style="color:#08090c;font-size:18px;margin-bottom:16px">Your verification code</h2>
        <p style="color:#6b6860;font-size:14px;line-height:1.6">Use the code below to ${type === 'signup' ? 'verify your account' : type === 'reset' ? 'reset your password' : 'sign in'}. It expires in 10 minutes.</p>
        <div style="background:#f5f4f0;border:2px dashed #e85a1e;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
          <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#e85a1e;font-family:monospace">${otp}</div>
        </div>
        <p style="color:#9e9a93;font-size:12px;text-align:center;margin-top:30px">If you didn't request this, ignore this email.</p>
      </div>
      <p style="text-align:center;color:#9e9a93;font-size:12px;margin-top:20px">© 2025 EasyAIAgents</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"EasyAIAgents" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: subjects[type] || 'Your verification code',
    html
  });
}