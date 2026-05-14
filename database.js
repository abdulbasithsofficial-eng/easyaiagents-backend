const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.json');

// Initialize DB if not exists
function initDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = {
      users: [],
      agents: [],
      plans: [
        { id: 'starter', name: 'Starter', price: 27, agentLimit: 3, messageLimit: 5000, features: ['3 AI Agents', '5,000 Messages', 'Website Integration', 'Basic Analytics'] },
        { id: 'professional', name: 'Professional', price: 67, agentLimit: -1, messageLimit: 50000, features: ['Unlimited Agents', '50,000 Messages', 'WhatsApp Integration', 'Priority Support', 'Custom Branding'] },
        { id: 'agency', name: 'Agency', price: 147, agentLimit: -1, messageLimit: -1, features: ['Everything in Pro', 'White-label Branding', 'Client Dashboard', 'API Access'] }
      ]
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
  }
}

function readDB() {
  initDB();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Users
function findUserByEmail(email) {
  const db = readDB();
  return db.users.find(u => u.email === email.toLowerCase()) || null;
}

function findUserById(id) {
  const db = readDB();
  return db.users.find(u => u.id === id) || null;
}

function createUser(user) {
  const db = readDB();
  db.users.push(user);
  writeDB(db);
  return user;
}

function updateUser(id, updates) {
  const db = readDB();
  const idx = db.users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  db.users[idx] = { ...db.users[idx], ...updates };
  writeDB(db);
  return db.users[idx];
}

// Agents
function getAgentsByUser(userId) {
  const db = readDB();
  return db.agents.filter(a => a.userId === userId);
}

function getAgentById(id) {
  const db = readDB();
  return db.agents.find(a => a.id === id) || null;
}

function createAgent(agent) {
  const db = readDB();
  db.agents.push(agent);
  writeDB(db);
  return agent;
}

function updateAgent(id, updates) {
  const db = readDB();
  const idx = db.agents.findIndex(a => a.id === id);
  if (idx === -1) return null;
  db.agents[idx] = { ...db.agents[idx], ...updates };
  writeDB(db);
  return db.agents[idx];
}

function deleteAgent(id) {
  const db = readDB();
  const idx = db.agents.findIndex(a => a.id === id);
  if (idx === -1) return false;
  db.agents.splice(idx, 1);
  writeDB(db);
  return true;
}

// Plans
function getPlanById(id) {
  const db = readDB();
  return db.plans.find(p => p.id === id) || null;
}

function getAllPlans() {
  const db = readDB();
  return db.plans;
}

module.exports = {
  findUserByEmail, findUserById, createUser, updateUser,
  getAgentsByUser, getAgentById, createAgent, updateAgent, deleteAgent,
  getPlanById, getAllPlans
};
