const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth-middleware');
const { getAllPlans, getPlanById, updateUser } = require('./database');

router.get('/', (req, res) => {
  res.json({ plans: getAllPlans() });
});

router.post('/upgrade', authMiddleware, (req, res) => {
  try {
    const { planId } = req.body;
    const plan = getPlanById(planId);
    if (!plan) return res.status(400).json({ error: 'Invalid plan' });
    const updated = updateUser(req.user.id, {
      plan: planId,
      planUpgradedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    const { password, ...user } = updated;
    res.json({
      message: `Successfully upgraded to ${plan.name} plan!`,
      user,
      paymentNote: 'In production, integrate with Stripe/PayPal here'
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
