import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getDB } from '../../_lib/db.js';
import { handleOptions } from '../../_lib/cors.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  
  let decoded;
  try { decoded = jwt.verify(auth.replace('Bearer ', ''), process.env.JWT_SECRET); }
  catch { return res.status(401).json({ error: 'Invalid token' }); }

  const { id } = req.query;
  const { trainingData, personality, language, customInstructions } = req.body;

  const db = await getDB();
  await db.collection('agents').updateOne(
    { _id: new ObjectId(id), userId: new ObjectId(decoded.userId) },
    { $set: { trainingData, personality, language, customInstructions, status: 'trained', trainedAt: new Date() } }
  );

  return res.status(200).json({ success: true });
}