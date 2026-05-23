import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDB } from '../_lib/db.js';
import { handleOptions } from '../_lib/cors.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const db = await getDB();
    const user = await db.collection('users').findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    if (!user.password) return res.status(401).json({ error: 'Use Google sign-in for this account' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ userId: user._id.toString(), email }, process.env.JWT_SECRET, { expiresIn: '30d' });

    return res.status(200).json({
      token,
      user: { _id: user._id, name: user.name, email: user.email, plan: user.plan || 'free' }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
}