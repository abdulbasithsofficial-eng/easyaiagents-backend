import bcrypt from 'bcryptjs';
import { getDB } from '../_lib/db.js';
import { handleOptions } from '../_lib/cors.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ error: 'All fields required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const db = await getDB();
    
    const otpDoc = await db.collection('otps').findOne({ email, type: 'reset' });
    if (!otpDoc || otpDoc.otp !== otp) return res.status(400).json({ error: 'Invalid or expired code' });
    if (new Date() > otpDoc.expiresAt) return res.status(400).json({ error: 'Code expired. Request a new one.' });

    const hashedPass = await bcrypt.hash(newPassword, 10);
    const result = await db.collection('users').updateOne(
      { email },
      { $set: { password: hashedPass, passwordResetAt: new Date() } }
    );

    if (result.matchedCount === 0) return res.status(404).json({ error: 'User not found' });

    await db.collection('otps').deleteOne({ email, type: 'reset' });

    return res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Reset failed' });
  }
}