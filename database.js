// In-memory database (Vercel pe file system nahi chalta)
// Data restarts pe reset hoga — production ke liye MongoDB/PlanetScale use karo

const db = {
  users: [],
  agents: [],
  plans: [
    { id: 'starter', name: 'Starter', price: 27, agentLimit: 3, messageLimit: 5000, features: ['3 AI Agents', '5,000 Messages', 'Website Integration', 'Basic Analytics'] },
    { id: 'professional', name: 'Professional', price: 67, agentLimit: -1, messageLimit: 50000, features: ['Unlimited Agents', '50,000 Messages', 'WhatsApp Integration', 'Priority Support', 'Custom Branding'] },
    { id: 'agency', name: 'Agency', price: 147, agentLimit: -1, messageLimit: -1, features: ['Everything in Pro', 'White-label Branding', 'Client Dashboard', 'API Access'] }
  ]
};

// Users
function findUserByEmail(email) {
  return db.users.find(u => u.email === email.toLowerCase()) || null;
}
function findUserById(id) {
  return db.users.find(u => u.id === id) || null;
}
function createUser(user) {
  db.users.push(user);
  return user;
}
function updateUser(id, updates) {
  const idx = db.users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  db.users[idx] = { ...db.users[idx], ...updates };
  return db.users[idx];
}

// Agents
function getAgentsByUser(userId) {
  return db.agents.filter(a => a.userId === userId);
}
function getAgentById(id) {
  return db.agents.find(a => a.id === id) || null;
}
function createAgent(agent) {
  db.agents.push(agent);
  return agent;
}
function updateAgent(id, updates) {
  const idx = db.agents.findIndex(a => a.id === id);
  if (idx === -1) return null;
  db.agents[idx] = { ...db.agents[idx], ...updates };
  return db.agents[idx];
}
function deleteAgent(id) {
  const idx = db.agents.findIndex(a => a.id === id);
  if (idx === -1) return false;
  db.agents.splice(idx, 1);
  return true;
}

// Plans
function getPlanById(id) {
  return db.plans.find(p => p.id === id) || null;
}
function getAllPlans() {
  return db.plans;
}

module.exports = {
  findUserByEmail, findUserById, createUser, updateUser,
  getAgentsByUser, getAgentById, createAgent, updateAgent, deleteAgent,
  getPlanById, getAllPlans
};
