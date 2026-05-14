const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getAllPlans, getPlanById, updateUser } = require('../db/database');

// GET /api/plans
router.get('/', (req, res) => {
  res.json({ plans: getAllPlans() });
});

// POST /api/plans/upgrade - simulate plan upgrade
router.post('/upgrade', authMiddleware, (req, res) => {
  try {
    const { planId } = req.body;
    const plan = getPlanById(planId);
    if (!plan) return res.status(400).json({ error: 'Invalid plan' });

    // In real app: integrate Stripe/payment gateway here
    const updated = updateUser(req.user.id, {
      plan: planId,
      planUpgradedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const { password, ...user } = updated;
    res.json({
      message: `Successfully upgraded to ${plan.name} plan!`,
      user,
      // In real app: return payment URL or confirmation
      paymentNote: 'In production, integrate with Stripe/PayPal here'
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
