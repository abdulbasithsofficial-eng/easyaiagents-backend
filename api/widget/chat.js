import { getDB } from '../_lib/db.js';
import { handleOptions } from '../_lib/cors.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { agentKey, message, sessionId } = req.body;
    const db = await getDB();
    const agent = await db.collection('agents').findOne({ publicKey: agentKey, status: 'live' });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const systemPrompt = `You are ${agent.name}. Personality: ${agent.personality || 'friendly'}. Language: ${agent.language || 'English'}. Business: ${agent.trainingData || ''}. ${agent.customInstructions || ''}`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
        max_tokens: 500
      })
    });

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content || "Sorry, I'm having trouble.";

    await db.collection('agents').updateOne({ _id: agent._id }, { $inc: { messagesHandled: 1 } });
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: 'Chat failed', reply: 'Error. Try again.' });
  }
}