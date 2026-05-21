const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth-middleware');
const { getAllPlans, getPlanById, updateUser } = require('./database');

router.get('/', (req, res) => {
  res.json({ plans: getAllPlans() });
});

router.post('/upgrade', authMiddleware, async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = getPlanById(planId);
    if (!plan) return res.status(400).json({ error: 'Invalid plan' });
    const updated = await updateUser(req.user._id, { plan: planId, planUpgradedAt: new Date() });
    const { password, otp, ...safe } = updated.toObject();
    res.json({ message: `Upgraded to ${plan.name}!`, user: safe });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
