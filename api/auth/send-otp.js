import { getDB } from '../_lib/db.js';
import { handleOptions } from '../_lib/cors.js';
import { sendOTP } from '../_lib/email.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, type = 'login' } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const db = await getDB();
    
    // For reset, check if user exists
    if (type === 'reset') {
      const user = await db.collection('users').findOne({ email });
      if (!user) return res.status(404).json({ error: 'No account found with this email' });
    }

    // For login, check if user exists
    if (type === 'login') {
      const user = await db.collection('users').findOne({ email });
      if (!user) return res.status(404).json({ error: 'No account found. Please sign up first.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.collection('otps').updateOne(
      { email, type },
      { $set: { email, otp, type, expiresAt, createdAt: new Date() } },
      { upsert: true }
    );

    await sendOTP(email, otp, type);

    return res.status(200).json({ success: true, message: 'OTP sent to ' + email });
  } catch (err) {
    console.error('Send OTP error:', err);
    return res.status(500).json({ error: 'Failed to send OTP. Try again.' });
  }
}