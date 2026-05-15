const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Root route - Vercel health check
app.get('/', (req, res) => {
  res.json({ status: 'OK', message: 'EasyAIAgents Backend is running!' });
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const RESEND_API_KEY = process.env.RESEND_API_KEY;

const resend = new Resend(RESEND_API_KEY);

let users = [];
let agents = [];
let otps = {};
// ─── Google OAuth ─────────────────────────
app.get('/api/auth/google', (req, res) => {
  const redirectUri = 'https://www.easyaiagents.online/api/auth/google/callback';
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile`;
  res.redirect(url);
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: 'https://www.easyaiagents.online/api/auth/google/callback',
        grant_type: 'authorization_code'
      })
    });
    const tokenData = await tokenResponse.json();

    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const userInfo = await userResponse.json();

    // Check if user exists, create if not
    let user = users.find(u => u.email === userInfo.email);
    if (!user) {
      user = {
        id: uuidv4(),
        name: userInfo.name,
        email: userInfo.email,
        password: '' // Google users don't have password
      };
      users.push(user);
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    // Redirect to frontend with token
    res.redirect(`https://www.easyaiagents.online?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
});

// ─── Auth Routes ─────────────────────────
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

app.post('/api/auth/send-otp', async (req, res) => {
  const { email } = req.body;
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  otps[email] = otp;
  
  try {
    await resend.emails.send({
      from: 'EasyAIAgents <onboarding@resend.dev>',
      to: [email],
      subject: 'Your OTP for EasyAIAgents',
      text: `Your OTP is: ${otp}. It expires in 10 minutes.`
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp, name, password } = req.body;
  if (otps[email] !== otp) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }
  delete otps[email];
  
  const hashed = await bcrypt.hash(password, 10);
  const user = { id: uuidv4(), name, email, password: hashed };
  users.push(user);
  const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name, email } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).json({ error: 'User not found' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: 'Invalid password' });
  const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email } });
});

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

// ─── Agent Routes ────────────────────────
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

// ✅ Vercel export
module.exports = app;
