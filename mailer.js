const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'abdulbasithsofficial@gmail.com';

// ── SHARED HEADER/FOOTER
function emailWrap(content) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.10);">
  <div style="background:#08090c;padding:28px 40px;display:flex;align-items:center;">
    <div style="width:38px;height:38px;background:#e85a1e;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;margin-right:12px;">🤖</div>
    <span style="font-size:20px;font-weight:800;color:white;letter-spacing:-0.5px;">EasyAIAgents</span>
  </div>
  <div style="padding:36px 40px;">${content}</div>
  <div style="background:#f5f4f0;padding:20px 40px;text-align:center;border-top:1px solid #e8e6e0;">
    <p style="font-size:12px;color:#b0aca4;margin:0 0 6px;">© ${new Date().getFullYear()} EasyAIAgents.online — All rights reserved</p>
    <p style="font-size:12px;color:#b0aca4;margin:0;">
      <a href="https://easyaiagents.online" style="color:#e85a1e;text-decoration:none;">Visit Website</a> &nbsp;·&nbsp;
      <a href="https://easyaiagents.online/app" style="color:#e85a1e;text-decoration:none;">Dashboard</a> &nbsp;·&nbsp;
      <a href="mailto:${ADMIN_EMAIL}" style="color:#e85a1e;text-decoration:none;">Support</a>
    </p>
  </div>
</div>
</body></html>`;
}

function btn(text, url) {
  return `<div style="text-align:center;margin:28px 0;">
    <a href="${url}" style="display:inline-block;background:#e85a1e;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px;letter-spacing:-.2px;">${text}</a>
  </div>`;
}

function planBadge(plan) {
  const colors = { free:'#6b7280', starter:'#3b82f6', professional:'#8b5cf6', agency:'#f59e0b' };
  const labels = { free:'Free', starter:'Starter — $27/mo', professional:'Professional — $67/mo', agency:'Agency — $147/mo' };
  const color  = colors[plan] || '#6b7280';
  const label  = labels[plan] || plan;
  return `<div style="display:inline-block;background:${color}22;border:1.5px solid ${color};color:${color};padding:6px 18px;border-radius:20px;font-weight:700;font-size:13px;letter-spacing:.04em;">${label}</div>`;
}

// ── 1. OTP EMAIL
async function sendOtpEmail(to, otp, name = 'User', type = 'signup') {
  const subjects = { signup:'Verify your email', login:'Your login code', reset:'Reset your password' };
  const subject  = subjects[type] || 'Your verification code';

  const content = `
    <h2 style="font-size:22px;font-weight:800;color:#08090c;margin:0 0 6px;">Hello, ${name}! 👋</h2>
    <p style="font-size:15px;color:#6b6860;margin:0 0 28px;line-height:1.6;">
      Here is your one-time verification code. It expires in <strong>10 minutes</strong>.
    </p>
    <div style="background:#f5f4f0;border-radius:14px;padding:30px;text-align:center;margin-bottom:24px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6b6860;margin-bottom:14px;">Verification Code</div>
      <div style="font-size:52px;font-weight:900;letter-spacing:14px;color:#08090c;font-family:monospace;">${otp}</div>
    </div>
    <p style="font-size:13px;color:#9b9890;line-height:1.6;margin:0;">
      If you did not request this code, you can safely ignore this email. Never share this code with anyone.
    </p>`;

  return transporter.sendMail({
    from: `"EasyAIAgents" <${process.env.EMAIL_USER}>`,
    to,
    subject: `${otp} — ${subject} | EasyAIAgents`,
    html: emailWrap(content),
  });
}

// ── 2. WELCOME EMAIL (after signup)
async function sendWelcomeEmail(to, name) {
  const content = `
    <h2 style="font-size:24px;font-weight:800;color:#08090c;margin:0 0 6px;">Welcome to EasyAIAgents! 🎉</h2>
    <p style="font-size:15px;color:#6b6860;margin:0 0 22px;line-height:1.6;">
      Hi <strong>${name}</strong>, your account is ready. You can now build powerful AI agents for your business — no coding required.
    </p>
    <div style="background:#f5f4f0;border-radius:14px;padding:24px;margin-bottom:24px;">
      <div style="font-weight:700;font-size:14px;color:#08090c;margin-bottom:14px;">🚀 Get started in 3 steps:</div>
      <div style="margin-bottom:10px;font-size:14px;color:#4b4840;"><span style="color:#e85a1e;font-weight:800;">01.</span> &nbsp;Pick a template (Sales, Support, Real Estate...)</div>
      <div style="margin-bottom:10px;font-size:14px;color:#4b4840;"><span style="color:#e85a1e;font-weight:800;">02.</span> &nbsp;Train with your business data or website URL</div>
      <div style="font-size:14px;color:#4b4840;"><span style="color:#e85a1e;font-weight:800;">03.</span> &nbsp;Deploy to your website or WhatsApp in seconds</div>
    </div>
    <div style="background:#08090c;border-radius:14px;padding:24px;margin-bottom:24px;text-align:center;">
      <div style="font-size:15px;color:rgba(255,255,255,.7);margin-bottom:4px;">Your current plan</div>
      <div style="font-size:20px;font-weight:800;color:#fff;">Free Plan</div>
      <div style="font-size:13px;color:rgba(255,255,255,.5);margin-top:4px;">1 Agent · 500 messages/month</div>
    </div>
    ${btn('🤖 Build Your First Agent', 'https://easyaiagents.online/app')}
    <p style="font-size:13px;color:#9b9890;text-align:center;margin:0;">
      Questions? Reply to this email or visit <a href="https://easyaiagents.online" style="color:#e85a1e;">easyaiagents.online</a>
    </p>`;

  return transporter.sendMail({
    from: `"EasyAIAgents" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Welcome to EasyAIAgents, ${name}! 🤖`,
    html: emailWrap(content),
  });
}

// ── 3. PLAN UPGRADE EMAIL
async function sendPlanEmail(to, name, plan, trigger = 'user') {
  const planNames  = { free:'Free', starter:'Starter', professional:'Professional', agency:'Agency' };
  const planFeats  = {
    free:         ['1 AI Agent', '500 messages/month', 'Website widget'],
    starter:      ['3 AI Agents', '5,000 messages/month', 'Website widget', 'Basic analytics'],
    professional: ['Unlimited AI Agents', '50,000 messages/month', 'WhatsApp + Slack + Gmail', 'Advanced analytics', 'Custom branding', 'Priority support 24/7'],
    agency:       ['Unlimited AI Agents', 'Unlimited messages', 'All integrations', 'White-label', 'Dedicated support', 'Custom contracts'],
  };
  const planName = planNames[plan] || plan;
  const feats    = planFeats[plan] || [];
  const isUpgrade = plan !== 'free';
  const emoji = isUpgrade ? '🎉' : '📋';

  const featList = feats.map(f => `<div style="padding:8px 0;border-bottom:1px solid #f0ede8;font-size:14px;color:#4b4840;">✓ &nbsp;${f}</div>`).join('');

  const triggerNote = trigger === 'admin_update'
    ? `<div style="background:#fef3c7;border-radius:10px;padding:14px 18px;margin-bottom:20px;font-size:13px;color:#92400e;">⚡ Your plan was manually updated by our team. If you have questions, contact us.</div>`
    : '';

  const content = `
    <h2 style="font-size:24px;font-weight:800;color:#08090c;margin:0 0 6px;">${emoji} Plan ${isUpgrade ? 'Upgraded' : 'Updated'}!</h2>
    <p style="font-size:15px;color:#6b6860;margin:0 0 22px;line-height:1.6;">
      Hi <strong>${name}</strong>, your EasyAIAgents plan has been updated.
    </p>
    ${triggerNote}
    <div style="background:#08090c;border-radius:14px;padding:24px;margin-bottom:24px;text-align:center;">
      <div style="font-size:13px;color:rgba(255,255,255,.5);margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em;">Your New Plan</div>
      <div style="font-size:28px;font-weight:900;color:#fff;margin-bottom:4px;">${planName}</div>
      ${planBadge(plan)}
    </div>
    <div style="margin-bottom:24px;">
      <div style="font-weight:700;font-size:14px;color:#08090c;margin-bottom:12px;">What's included:</div>
      ${featList}
    </div>
    ${btn('🚀 Go to Dashboard', 'https://easyaiagents.online/app')}
    <p style="font-size:13px;color:#9b9890;text-align:center;margin:0;">
      Need help? Email us at <a href="mailto:${ADMIN_EMAIL}" style="color:#e85a1e;">${ADMIN_EMAIL}</a>
    </p>`;

  return transporter.sendMail({
    from: `"EasyAIAgents" <${process.env.EMAIL_USER}>`,
    to,
    subject: `${emoji} Your EasyAIAgents plan is now ${planName}`,
    html: emailWrap(content),
  });
}

// ── 4. CONTACT FORM EMAIL (to admin)
async function sendContactEmail({ name, email, subject, message, plan }) {
  const content = `
    <h2 style="font-size:20px;font-weight:800;color:#08090c;margin:0 0 18px;">📬 New Support Request</h2>
    <div style="background:#f5f4f0;border-radius:12px;padding:20px;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#9b9890;width:100px;">From:</td><td style="padding:8px 0;font-weight:600;color:#08090c;">${name}</td></tr>
        <tr><td style="padding:8px 0;color:#9b9890;">Email:</td><td style="padding:8px 0;"><a href="mailto:${email}" style="color:#e85a1e;">${email}</a></td></tr>
        <tr><td style="padding:8px 0;color:#9b9890;">Plan:</td><td style="padding:8px 0;">${plan}</td></tr>
        <tr><td style="padding:8px 0;color:#9b9890;">Subject:</td><td style="padding:8px 0;font-weight:600;">${subject}</td></tr>
      </table>
    </div>
    <div style="background:#fff;border:1.5px solid #e8e6e0;border-radius:12px;padding:20px;margin-bottom:20px;">
      <div style="font-weight:700;font-size:13px;color:#9b9890;margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em;">Message</div>
      <div style="font-size:15px;color:#08090c;line-height:1.7;white-space:pre-wrap;">${message}</div>
    </div>
    ${btn(`Reply to ${name}`, `mailto:${email}`)}`;

  // Send to admin
  await transporter.sendMail({
    from: `"EasyAIAgents Contact" <${process.env.EMAIL_USER}>`,
    to: ADMIN_EMAIL,
    replyTo: email,
    subject: `[Support] ${subject} — from ${name}`,
    html: emailWrap(content),
  });

  // Send confirmation to user
  const userContent = `
    <h2 style="font-size:22px;font-weight:800;color:#08090c;margin:0 0 8px;">We got your message! ✅</h2>
    <p style="font-size:15px;color:#6b6860;margin:0 0 22px;line-height:1.6;">
      Hi <strong>${name}</strong>, thank you for reaching out. We typically reply within <strong>24 hours</strong>.
    </p>
    <div style="background:#f5f4f0;border-radius:12px;padding:20px;margin-bottom:20px;">
      <div style="font-size:13px;color:#9b9890;margin-bottom:8px;font-weight:600;">Your message:</div>
      <div style="font-size:14px;color:#4b4840;line-height:1.6;white-space:pre-wrap;">${message}</div>
    </div>
    <p style="font-size:14px;color:#6b6860;line-height:1.6;">
      Meanwhile, you can also check our <a href="https://easyaiagents.online/blog" style="color:#e85a1e;">blog</a> for guides and tips.
    </p>
    ${btn('Go to Dashboard', 'https://easyaiagents.online/app')}`;

  await transporter.sendMail({
    from: `"EasyAIAgents Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `We received your message — EasyAIAgents Support`,
    html: emailWrap(userContent),
  });
}

module.exports = { sendOtpEmail, sendWelcomeEmail, sendPlanEmail, sendContactEmail };
