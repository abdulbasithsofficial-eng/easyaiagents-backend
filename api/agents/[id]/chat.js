import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getDB } from '../../_lib/db.js';
import { handleOptions } from '../../_lib/cors.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { id } = req.query;
    const { message, sessionId } = req.body;

    const db = await getDB();
    const agent = await db.collection('agents').findOne({ _id: new ObjectId(id) });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    // Call Groq AI (free & fast) - or OpenAI
    const systemPrompt = `You are ${agent.name}, an AI assistant. 
Personality: ${agent.personality || 'friendly'}.
Language: ${agent.language || 'English'}.
Business info: ${agent.trainingData || 'General assistant'}.
${agent.customInstructions ? 'Special instructions: ' + agent.customInstructions : ''}

Respond helpfully and concisely.`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 500
      })
    });

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content || "I'm having trouble responding right now.";

    // Track message count
    await db.collection('agents').updateOne(
      { _id: new ObjectId(id) },
      { $inc: { messagesHandled: 1 } }
    );

    // Save conversation
    await db.collection('conversations').insertOne({
      agentId: new ObjectId(id),
      sessionId,
      message,
      reply,
      timestamp: new Date()
    });

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ error: 'Chat failed', reply: 'Sorry, I had trouble. Please try again.' });
  }
}