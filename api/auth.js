const { Resend } = require('resend');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

const resend = new Resend('re_M87f...'); // Yahan apni Resend API Key dalein
const googleClient = new OAuth2Client('597827432772-l6hdnkkpcs58sa032cq3elb2ucprd6bi.apps.googleusercontent.com');
const JWT_SECRET = 'easy_ai_super_secret';

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action, email, name, credential } = req.body;

    // 1. Google Login Logic
    if (action === 'google') {
        try {
            const ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: '597827432772-l6hdnkkpcs58sa032cq3elb2ucprd6bi.apps.googleusercontent.com'
            });
            const payload = ticket.getPayload();
            const token = jwt.sign({ email: payload.email, name: payload.name }, JWT_SECRET, { expiresIn: '30d' });
            return res.status(200).json({ success: true, token, user: payload });
        } catch (e) {
            return res.status(400).json({ error: 'Google Auth Failed' });
        }
    }

    // 2. Resend OTP Logic
    if (action === 'send-otp') {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        try {
            const data = await resend.emails.send({
                from: 'EasyAIAgents <onboarding@resend.dev>', // Domain verify hone ke baad verify@easyaiagents.online kar dena
                to: email,
                subject: 'Your EasyAIAgents Login Code',
                html: `<div style="font-family:sans-serif; border:1px solid #eee; padding:20px; border-radius:10px;">
                        <h2 style="color:#e85a1e">Verification Code</h2>
                        <p>Welcome to EasyAIAgents! Use the code below to login:</p>
                        <h1 style="background:#f4f4f4; padding:10px; text-align:center; letter-spacing:5px;">${otp}</h1>
                        <p>This code will expire in 10 minutes.</p>
                       </div>`
            });
            // Demo purpose: Real app mein OTP ko database (Redis/MongoDB) mein save karte hain.
            return res.status(200).json({ success: true, message: 'OTP Sent via Resend' });
        } catch (error) {
            return res.status(500).json({ error: 'Resend API error' });
        }
    }
}