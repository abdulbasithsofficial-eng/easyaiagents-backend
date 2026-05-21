require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./database');

const authRoutes  = require('./auth');
const agentRoutes = require('./agents');
const planRoutes  = require('./plans');

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'https://easyaiagents.online',
  'https://www.easyaiagents.online',
  'https://app.easyaiagents.online',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({ windowMs: 15*60*1000, max: 100, message: { error: 'Too many requests' } });
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 15, message: { error: 'Too many attempts' } });

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/send-otp', authLimiter);

// ── ROUTES ────────────────────────────────────────────────────────────────────
app.use('/api/auth',   authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/plans',  planRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'EasyAIAgents API v2', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ message: 'EasyAIAgents API v2 🚀 — MongoDB + Groq AI', health: '/api/health' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  if (err.message?.startsWith('CORS blocked'))
    return res.status(403).json({ error: err.message });
  res.status(500).json({ error: 'Internal server error' });
});

// ── START ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

async function start() {
  await connectDB(); // Connect MongoDB first
  if (require.main === module) {
    app.listen(PORT, () => {
      console.log(`\n🚀 EasyAIAgents API v2 running on port ${PORT}`);
      console.log(`   MongoDB + Groq AI + Real OTP`);
      console.log(`   Health: http://localhost:${PORT}/api/health\n`);
    });
  }
}

start().catch(console.error);

module.exports = app;
