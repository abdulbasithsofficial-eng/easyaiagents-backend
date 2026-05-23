import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { getDB } from '../_lib/db.js';
import { handleOptions } from '../_lib/cors.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'No credential provided' });

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture, email_verified } = payload;

    if (!email_verified) return res.status(400).json({ error: 'Google email not verified' });

    const db = await getDB();
    const users = db.collection('users');
    
    let user = await users.findOne({ email });
    
    if (!user) {
      const newUser = {
        name, email, googleId, picture,
        plan: 'free', provider: 'google',
        emailVerified: true,
        createdAt: new Date()
      };
      const result = await users.insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    } else if (!user.googleId) {
      await users.updateOne({ _id: user._id }, { $set: { googleId, picture, emailVerified: true } });
    }

    const token = jwt.sign({ userId: user._id.toString(), email }, process.env.JWT_SECRET, { expiresIn: '30d' });

    return res.status(200).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan || 'free',
        picture: user.picture
      }
    });
  } catch (err) {
    console.error('Google verify error:', err);
    return res.status(401).json({ error: 'Invalid Google token' });
  }
}