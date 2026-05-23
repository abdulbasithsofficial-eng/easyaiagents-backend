import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDB } from '../_lib/db.js';
import { handleOptions } from '../_lib/cors.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, email, password, otp } = req.body;
    if (!name || !email || !password || !otp) return res.status(400).json({ error: 'All fields required' });

    const db = await getDB();
    
    // Verify OTP
    const otpDoc = await db.collection('otps').findOne({ email, type: 'signup' });
    if (!otpDoc || otpDoc.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    if (new Date() > otpDoc.expiresAt) return res.status(400).json({ error: 'OTP expired' });

    // Check if user exists
    const existing = await db.collection('users').findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashedPass = await bcrypt.hash(password, 10);
    const newUser = {
      name, email,
      password: hashedPass,
      plan: 'free',
      provider: 'email',
      emailVerified: true,
      createdAt: new Date()
    };

    const result = await db.collection('users').insertOne(newUser);
    await db.collection('otps').deleteOne({ email, type: 'signup' });

    const token = jwt.sign({ userId: result.insertedId.toString(), email }, process.env.JWT_SECRET, { expiresIn: '30d' });

    return res.status(200).json({
      token,
      user: { _id: result.insertedId, name, email, plan: 'free' }
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Signup failed' });
  }
}