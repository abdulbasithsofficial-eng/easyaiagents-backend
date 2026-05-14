const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const {
  getAgentsByUser, getAgentById, createAgent, updateAgent, deleteAgent,
  getPlanById, findUserById, updateUser
} = require('../db/database');

const TEMPLATES = [
  { id: 'customer-support', name: 'Customer Support', icon: '🎧', description: 'Handle FAQs, complaints, and support tickets 24/7', category: 'Support' },
  { id: 'sales-assistant', name: 'Sales Assistant', icon: '💼', description: 'Qualify leads, answer product questions, close deals', category: 'Sales' },
  { id: 'real-estate', name: 'Real Estate Agent', icon: '🏠', description: 'Answer property queries, schedule viewings, qualify buyers', category: 'Real Estate' },
  { id: 'coaching', name: 'Life Coach Bot', icon: '🎯', description: 'Motivate clients, send reminders, track goals', category: 'Coaching' },
  { id: 'ecommerce', name: 'E-commerce Helper', icon: '🛒', description: 'Track orders, recommend products, handle returns', category: 'E-commerce' },
  { id: 'lead-gen', name: 'Lead Generator', icon: '📊', description: 'Capture leads, qualify prospects, book appointments', category: 'Marketing' },
  { id: 'appointment', name: 'Appointment Setter', icon: '📅', description: 'Book meetings, send reminders, manage calendar', category: 'Scheduling' },
  { id: 'restaurant', name: 'Restaurant Bot', icon: '🍕', description: 'Take reservations, share menu, handle inquiries', category: 'Food & Beverage' },
  { id: 'education', name: 'Education Tutor', icon: '📚', description: 'Answer student questions, quiz learners, explain concepts', category: 'Education' },
  { id: 'hr-assistant', name: 'HR Assistant', icon: '👥', description: 'Screen candidates, answer HR queries, onboard employees', category: 'HR' },
  { id: 'legal-intake', name: 'Legal Intake Bot', icon: '⚖️', description: 'Gather client info, explain services, schedule consultations', category: 'Legal' },
  { id: 'fitness', name: 'Fitness Coach', icon: '💪', description: 'Create workout plans, track progress, motivate clients', category: 'Health & Fitness' },
];

const PLAN_LIMITS = {
  free: { agents: 1, messages: 500 },
  starter: { agents: 3, messages: 5000 },
  professional: { agents: -1, messages: 50000 },
  agency: { agents: -1, messages: -1 }
};

// GET /api/agents/templates
router.get('/templates', authMiddleware, (req, res) => {
  res.json({ templates: TEMPLATES });
});

// GET /api/agents - list all agents for user
router.get('/', authMiddleware, (req, res) => {
  const agents = getAgentsByUser(req.user.id);
  res.json({ agents, total: agents.length });
});

// POST /api/agents - create new agent (Step 1 & 2)
router.post('/', authMiddleware, (req, res) => {
  try {
    const { name, templateId, description, trainingData, trainingType, personality, language } = req.body;

    if (!name || !templateId)
      return res.status(400).json({ error: 'Agent name and template are required' });

    const template = TEMPLATES.find(t => t.id === templateId);
    if (!template)
      return res.status(400).json({ error: 'Invalid template selected' });

    const userAgents = getAgentsByUser(req.user.id);
    const plan = PLAN_LIMITS[req.user.plan] || PLAN_LIMITS.free;

    if (plan.agents !== -1 && userAgents.length >= plan.agents)
      return res.status(403).json({ error: `Your ${req.user.plan} plan allows max ${plan.agents} agent(s). Please upgrade.` });

    const agent = createAgent({
      id: uuidv4(),
      userId: req.user.id,
      name: name.trim(),
      templateId,
      template: template.name,
      templateIcon: template.icon,
      description: description || template.description,
      trainingData: trainingData || '',
      trainingType: trainingType || 'text', // text | url | pdf
      personality: personality || 'professional',
      language: language || 'English',
      status: 'draft', // draft | training | live | paused
      messagesHandled: 0,
      embedCode: null,
      whatsappConnected: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    res.status(201).json({ message: 'Agent created successfully', agent });
  } catch (err) {
    console.error('Create agent error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/agents/:id/train - Step 2: Train with data
router.post('/:id/train', authMiddleware, (req, res) => {
  try {
    const agent = getAgentById(req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    if (agent.userId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    const { trainingData, trainingType, websiteUrl, personality, language, customInstructions } = req.body;

    if (!trainingData && !websiteUrl)
      return res.status(400).json({ error: 'Training data or website URL is required' });

    const updated = updateAgent(agent.id, {
      trainingData: trainingData || websiteUrl,
      trainingType: trainingType || (websiteUrl ? 'url' : 'text'),
      personality: personality || agent.personality,
      language: language || agent.language,
      customInstructions: customInstructions || '',
      status: 'training',
      trainedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Simulate training (in real world, call AI API here)
    setTimeout(() => {
      updateAgent(agent.id, { status: 'live', updatedAt: new Date().toISOString() });
    }, 3000);

    res.json({ message: 'Training started! Your agent will be ready in moments.', agent: updated });
  } catch (err) {
    console.error('Train error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/agents/:id/deploy - Step 3: Go Live
router.post('/:id/deploy', authMiddleware, (req, res) => {
  try {
    const agent = getAgentById(req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    if (agent.userId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    const { deployType } = req.body; // website | whatsapp | both

    const embedCode = `<!-- EasyAIAgents Widget - ${agent.name} -->
<script>
  window.EasyAIAgentsConfig = {
    agentId: "${agent.id}",
    name: "${agent.name}",
    primaryColor: "#6366f1",
    position: "bottom-right"
  };
</script>
<script src="https://cdn.easyaiagents.online/widget.js" async></script>`;

    const updated = updateAgent(agent.id, {
      status: 'live',
      embedCode,
      deployType: deployType || 'website',
      whatsappConnected: deployType === 'whatsapp' || deployType === 'both',
      deployedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    res.json({
      message: 'Agent is now LIVE! 🚀',
      agent: updated,
      embedCode,
      whatsappLink: deployType !== 'website' ? `https://wa.me/?text=Connect%20Agent%20${agent.id}` : null
    });
  } catch (err) {
    console.error('Deploy error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/agents/:id - get single agent
router.get('/:id', authMiddleware, (req, res) => {
  const agent = getAgentById(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  if (agent.userId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });
  res.json({ agent });
});

// PUT /api/agents/:id - update agent
router.put('/:id', authMiddleware, (req, res) => {
  try {
    const agent = getAgentById(req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    if (agent.userId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    const allowedUpdates = ['name', 'description', 'personality', 'language', 'customInstructions', 'status'];
    const updates = { updatedAt: new Date().toISOString() };
    allowedUpdates.forEach(key => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

    const updated = updateAgent(agent.id, updates);
    res.json({ message: 'Agent updated', agent: updated });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/agents/:id
router.delete('/:id', authMiddleware, (req, res) => {
  const agent = getAgentById(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  if (agent.userId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

  deleteAgent(agent.id);
  res.json({ message: 'Agent deleted successfully' });
});

// GET /api/agents/:id/stats
router.get('/:id/stats', authMiddleware, (req, res) => {
  const agent = getAgentById(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  if (agent.userId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

  // Mock stats (real app: store message logs)
  res.json({
    stats: {
      agentId: agent.id,
      messagesHandled: agent.messagesHandled || Math.floor(Math.random() * 500),
      avgResponseTime: '1.2s',
      satisfactionRate: '94%',
      topTopics: ['Product queries', 'Pricing', 'Support'],
      dailyMessages: [12, 23, 45, 31, 67, 89, 54]
    }
  });
});

module.exports = router;
