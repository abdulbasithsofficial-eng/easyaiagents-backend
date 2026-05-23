import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getDB } from '../_lib/db.js';
import { handleOptions } from '../_lib/cors.js';

function verifyToken(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  try {
    return jwt.verify(auth.replace('Bearer ', ''), process.env.JWT_SECRET);
  } catch { return null; }
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'Unauthorized' });

  const db = await getDB();
  const userId = new ObjectId(decoded.userId);

  if (req.method === 'GET') {
    const agents = await db.collection('agents').find({ userId }).toArray();
    return res.status(200).json({ agents });
  }

  if (req.method === 'POST') {
    const { name, templateId } = req.body;
    if (!name || !templateId) return res.status(400).json({ error: 'Name and template required' });

    const agent = {
      userId,
      name,
      templateId,
      template: templateId,
      status: 'draft',
      messagesHandled: 0,
      createdAt: new Date()
    };
    
    const result = await db.collection('agents').insertOne(agent);
    return res.status(200).json({ agent: { ...agent, _id: result.insertedId } });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}