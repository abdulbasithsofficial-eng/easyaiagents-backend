import jwt from 'jsonwebtoken';
import { getDB } from '../_lib/db.js';
import { handleOptions } from '../_lib/cors.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, otp } = req.body;
    const db = await getDB();
    
    const otpDoc = await db.collection('otps').findOne({ email, type: 'login' });
    if (!otpDoc || otpDoc.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    if (new Date() > otpDoc.expiresAt) return res.status(400).json({ error: 'OTP expired' });

    const user = await db.collection('users').findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await db.collection('otps').deleteOne({ email, type: 'login' });
    const token = jwt.sign({ userId: user._id.toString(), email }, process.env.JWT_SECRET, { expiresIn: '30d' });

    return res.status(200).json({
      token,
      user: { _id: user._id, name: user.name, email: user.email, plan: user.plan || 'free' }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Verification failed' });
  }
}