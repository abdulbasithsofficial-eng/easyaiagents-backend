const mongoose = require('mongoose');

// ── Connect to MongoDB ────────────────────────────────────────────────────────
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'easyaiagents',
      bufferCommands: false,
    });
    isConnected = true;
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    throw err;
  }
}

// ── USER SCHEMA ───────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name:            { type: String, required: true, trim: true },
  email:           { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:        { type: String, default: null }, // null for Google users
  googleId:        { type: String, default: null },
  plan:            { type: String, enum: ['free','starter','professional','agency'], default: 'free' },
  messagesUsed:    { type: Number, default: 0 },
  emailVerified:   { type: Boolean, default: false },
  otp:             { type: String, default: null },
  otpExpiry:       { type: Date,   default: null },
  planUpgradedAt:  { type: Date,   default: null },
}, { timestamps: true });

// ── AGENT SCHEMA ──────────────────────────────────────────────────────────────
const agentSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:             { type: String, required: true, trim: true },
  templateId:       { type: String, required: true },
  template:         { type: String },
  templateIcon:     { type: String },
  description:      { type: String },
  trainingData:     { type: String, default: '' },
  trainingType:     { type: String, enum: ['text','url','manual'], default: 'text' },
  personality:      { type: String, default: 'professional' },
  language:         { type: String, default: 'English' },
  customInstructions: { type: String, default: '' },
  status:           { type: String, enum: ['draft','training','live','paused'], default: 'draft' },
  messagesHandled:  { type: Number, default: 0 },
  embedCode:        { type: String, default: null },
  deployType:       { type: String, default: 'website' },
  whatsappConnected:{ type: Boolean, default: false },
  trainedAt:        { type: Date, default: null },
  deployedAt:       { type: Date, default: null },
}, { timestamps: true });

// ── MESSAGE HISTORY (for real AI conversations) ───────────────────────────────
const messageSchema = new mongoose.Schema({
  agentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
  sessionId: { type: String, required: true },
  role:      { type: String, enum: ['user','assistant'], required: true },
  content:   { type: String, required: true },
}, { timestamps: true });

const User    = mongoose.models.User    || mongoose.model('User',    userSchema);
const Agent   = mongoose.models.Agent   || mongoose.model('Agent',   agentSchema);
const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

// ── USER FUNCTIONS ────────────────────────────────────────────────────────────
async function findUserByEmail(email) {
  await connectDB();
  return User.findOne({ email: email.toLowerCase() });
}
async function findUserById(id) {
  await connectDB();
  return User.findById(id);
}
async function createUser(data) {
  await connectDB();
  const user = new User(data);
  return user.save();
}
async function updateUser(id, updates) {
  await connectDB();
  return User.findByIdAndUpdate(id, updates, { new: true });
}
async function saveOtp(email, otp) {
  await connectDB();
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  return User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { otp, otpExpiry: expiry },
    { new: true }
  );
}
async function verifyOtp(email, otp) {
  await connectDB();
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || user.otp !== otp) return null;
  if (user.otpExpiry < new Date()) return null; // expired
  await User.findByIdAndUpdate(user._id, { otp: null, otpExpiry: null, emailVerified: true });
  return user;
}

// ── AGENT FUNCTIONS ───────────────────────────────────────────────────────────
async function getAgentsByUser(userId) {
  await connectDB();
  return Agent.find({ userId }).sort({ createdAt: -1 });
}
async function getAgentById(id) {
  await connectDB();
  return Agent.findById(id);
}
async function createAgent(data) {
  await connectDB();
  const agent = new Agent(data);
  return agent.save();
}
async function updateAgent(id, updates) {
  await connectDB();
  return Agent.findByIdAndUpdate(id, updates, { new: true });
}
async function deleteAgent(id) {
  await connectDB();
  await Message.deleteMany({ agentId: id });
  return Agent.findByIdAndDelete(id);
}

// ── MESSAGE FUNCTIONS ─────────────────────────────────────────────────────────
async function saveMessage(agentId, sessionId, role, content) {
  await connectDB();
  const msg = new Message({ agentId, sessionId, role, content });
  return msg.save();
}
async function getMessages(agentId, sessionId, limit = 10) {
  await connectDB();
  return Message.find({ agentId, sessionId }).sort({ createdAt: -1 }).limit(limit);
}

// ── PLAN FUNCTIONS ────────────────────────────────────────────────────────────
const PLANS = [
  { id: 'free',         name: 'Free',         price: 0,   agentLimit: 1,  messageLimit: 500   },
  { id: 'starter',      name: 'Starter',      price: 27,  agentLimit: 3,  messageLimit: 5000  },
  { id: 'professional', name: 'Professional', price: 67,  agentLimit: -1, messageLimit: 50000 },
  { id: 'agency',       name: 'Agency',       price: 147, agentLimit: -1, messageLimit: -1    },
];
function getAllPlans()    { return PLANS; }
function getPlanById(id) { return PLANS.find(p => p.id === id) || null; }

module.exports = {
  connectDB,
  findUserByEmail, findUserById, createUser, updateUser, saveOtp, verifyOtp,
  getAgentsByUser, getAgentById, createAgent, updateAgent, deleteAgent,
  saveMessage, getMessages,
  getAllPlans, getPlanById,
};
