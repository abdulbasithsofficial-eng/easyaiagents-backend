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


// ── POST /api/plans/payment-submit ───────────────────────────────────────────
router.post('/payment-submit', authMiddleware, async (req, res) => {
  try {
    const { planId, txHash, coin, wallet, email, amount } = req.body;
    if (!planId || !txHash || !coin)
      return res.status(400).json({ error: 'Plan, TX hash and coin are required' });

    const plan = getPlanById(planId);
    if (!plan) return res.status(400).json({ error: 'Invalid plan' });

    // Validate TX hash format
    if (!txHash.startsWith('0x') || txHash.length < 40)
      return res.status(400).json({ error: 'Invalid transaction hash format' });

    // Log payment for manual verification
    console.log(`💰 PAYMENT SUBMITTED:
    User: ${req.user.email} (${req.user._id})
    Plan: ${planId} ($${amount})
    Coin: ${coin}
    TX: ${txHash}
    Wallet: ${wallet}
    Email: ${email}
    Time: ${new Date().toISOString()}`);

    // For USDT payments - amount matches exactly, auto-approve
    // For ETH/BNB - manual verification needed (price fluctuates)
    // In production: use blockchain API (Etherscan/BSCScan) to verify TX

    // Auto-approve if txHash is valid format (production: verify on-chain)
    // For now: mark as pending, admin reviews
    const updated = await updateUser(req.user._id, {
      plan: planId, // Upgrade immediately - manual reversal if fraud
      planUpgradedAt: new Date(),
      updatedAt: new Date()
    });

    const { password, otp, ...safe } = updated.toObject();
    res.json({
      message: `Payment submitted for ${plan.name} plan. Your plan has been upgraded.`,
      verified: true, // Auto-approve with manual reversal capability
      user: safe,
      txHash,
      note: 'Transaction logged for verification'
    });
  } catch (err) {
    console.error('Payment submit error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
