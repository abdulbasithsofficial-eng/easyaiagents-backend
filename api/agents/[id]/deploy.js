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
  const { deployType } = req.body;
  const db = await getDB();

  // Generate public agent key for embed
  const publicKey = 'agt_' + Math.random().toString(36).substring(2, 18);
  
  const embedCode = `<!-- EasyAIAgents Widget -->
<script>
(function(){
  var s=document.createElement('script');
  s.src='https://api.easyaiagents.online/api/widget.js';
  s.async=true;
  s.setAttribute('data-agent','${publicKey}');
  document.head.appendChild(s);
})();
</script>`;

  await db.collection('agents').updateOne(
    { _id: new ObjectId(id), userId: new ObjectId(decoded.userId) },
    { $set: { status: 'live', deployType, publicKey, embedCode, deployedAt: new Date() } }
  );

  return res.status(200).json({ success: true, embedCode, publicKey });
}