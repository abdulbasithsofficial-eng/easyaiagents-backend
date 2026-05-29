const express = require('express');
const router = express.Router();
const { findUserByEmail, updateUser } = require('./database');
const { authMiddleware } = require('./auth-middleware');
const mongoose = require('mongoose');

// ── ADMIN EMAIL
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'abdulbasithsofficial@gmail.com').toLowerCase().trim();

// ── ADMIN MIDDLEWARE — strict double check
function adminMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.email.toLowerCase().trim() !== ADMIN_EMAIL) {
    console.warn(`⛔ Unauthorized admin attempt: ${req.user.email}`);
    return res.status(403).json({ error: 'Admin access only. Unauthorized.' });
  }
  next();
}

// ── GET ALL USERS with stats
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const User  = mongoose.model('User');
    const Agent = mongoose.model('Agent');
    const page  = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const plan   = req.query.plan || '';

    const filter = {};
    if (search) filter.$or = [
      { name:  { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
    if (plan) filter.plan = plan;

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password -otp -otpExpiry')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Agent counts per user
    const userIds = users.map(u => u._id);
    const agentCounts = await Agent.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ]);
    const agentMap = {};
    agentCounts.forEach(a => { agentMap[a._id.toString()] = a.count; });

    const usersData = users.map(u => ({
      ...u.toObject(),
      agentCount: agentMap[u._id.toString()] || 0
    }));

    res.json({ users: usersData, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET DASHBOARD STATS
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const User  = mongoose.model('User');
    const Agent = mongoose.model('Agent');

    const [
      totalUsers, freeUsers, starterUsers, proUsers, agencyUsers,
      totalAgents, liveAgents,
      recentUsers, recentSignups
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ plan: 'free' }),
      User.countDocuments({ plan: 'starter' }),
      User.countDocuments({ plan: 'professional' }),
      User.countDocuments({ plan: 'agency' }),
      Agent.countDocuments(),
      Agent.countDocuments({ status: 'live' }),
      User.find().sort({ createdAt: -1 }).limit(5).select('-password -otp -otpExpiry'),
      // Last 7 days signups
      User.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
      ])
    ]);

    const paidUsers = starterUsers + proUsers + agencyUsers;
    const revenue = (starterUsers * 27) + (proUsers * 67) + (agencyUsers * 147);

    res.json({
      stats: {
        totalUsers, freeUsers, paidUsers,
        starterUsers, proUsers, agencyUsers,
        totalAgents, liveAgents,
        estimatedRevenue: revenue,
        conversionRate: totalUsers > 0 ? ((paidUsers / totalUsers) * 100).toFixed(1) : 0
      },
      recentUsers,
      recentSignups
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── UPDATE USER PLAN (upgrade/downgrade)
router.put('/users/:id/plan', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { plan } = req.body;
    const validPlans = ['free', 'starter', 'professional', 'agency'];
    if (!validPlans.includes(plan)) return res.status(400).json({ error: 'Invalid plan' });

    const User = mongoose.model('User');
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { plan, planUpgradedAt: new Date() },
      { new: true }
    ).select('-password -otp -otpExpiry');

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Send plan update email
    const { sendPlanEmail } = require('./mailer');
    await sendPlanEmail(user.email, user.name, plan, 'admin_update').catch(console.error);

    res.json({ message: `Plan updated to ${plan}`, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE USER
router.delete('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const User  = mongoose.model('User');
    const Agent = mongoose.model('Agent');
    await Agent.deleteMany({ userId: req.params.id });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── CONTACT FORM — any user can submit
router.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message, plan } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: 'Name, email and message required' });

    const { sendContactEmail } = require('./mailer');
    await sendContactEmail({ name, email, subject: subject||'Support Request', message, plan: plan||'N/A' });

    res.json({ message: 'Message sent! We will reply within 24 hours.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ── VERIFY ADMIN
router.get('/verify', authMiddleware, adminMiddleware, (req, res) => {
  res.json({ admin: true, email: req.user.email });
});

module.exports = router;
