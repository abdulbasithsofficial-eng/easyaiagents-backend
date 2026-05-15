const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 Config
const JWT_SECRET = 'your-secret-key-change-this';
const RESEND_API_KEY = 're_xxxxxxxxxxxxxxxx'; // ← apni Resend key lagayein

const resend = new Resend(RESEND_API_KEY);

// 📦 In-memory database (Vercel ke liye)
let users = [];
let agents = [];
let otps = {};

// ─── Signup ──────────────────────────────
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email already registered' });
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = { id: uuidv4(), name, email, password: hashed };
  users.push(user);
  const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name, email } });
});

// ─── Send OTP ────────────────────────────
app.post('/api/auth/send-otp', async (req, res) => {
  const { email } = req.body;
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  otps[email] = otp;
  
  await resend.emails.send({
    from: 'EasyAIAgents <onboarding@resend.dev>',
    to: [email],
    subject: 'Your OTP for EasyAIAgents',
    text: `Your OTP is: ${otp}. It expires in 10 minutes.`
  });
  
  res.json({ success: true });
});

// ─── Verify OTP & Signup ──────────────────
app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp, name, password } = req.body;
  if (otps[email] !== otp) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }
  delete otps[email];
  
  // Complete signup
  const hashed = await bcrypt.hash(password, 10);
  const user = { id: uuidv4(), name, email, password: hashed };
  users.push(user);
  const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name, email } });
});

// ─── Login ────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).json({ error: 'User not found' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: 'Invalid password' });
  const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email } });
});

// ─── Login with OTP ──────────────────────
app.post('/api/auth/login-otp-verify', async (req, res) => {
  const { email, otp } = req.body;
  if (otps[email] !== otp) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }
  delete otps[email];
  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).json({ error: 'User not found' });
  const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email } });
});

// ─── Agents ──────────────────────────────
app.get('/api/agents', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userAgents = agents.filter(a => a.userId === decoded.id);
    res.json({ agents: userAgents });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.post('/api/agents', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { name, template, training, deployType, isFree } = req.body;
    const agent = {
      id: uuidv4(),
      userId: decoded.id,
      name,
      template: template || 'custom',
      training,
      deployType,
      status: 'live',
      isFree: isFree || false,
      createdAt: new Date().toISOString()
    };
    agents.push(agent);
    res.json({ agent });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// ─── Stats ────────────────────────────────
app.get('/api/stats', (req, res) => {
  res.json({ agentCount: agents.length });
});

// ─── Start ────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
