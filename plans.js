const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth-middleware');
const { getAllPlans, getPlanById, updateUser } = require('./database');

// ── Crypto wallet addresses (tumhare real wallets)
const WALLETS = {
  USDT_TRC20: 'TVzJxBo4UkgMJBAeupEvBBNBTCnFpEoLj3',
  USDT_ERC20: '0xYourERC20WalletHere',
  BNB:        '0xYourBNBWalletHere',
  ETH:        '0xYourETHWalletHere',
};

// ── Expected USD amounts per plan
const PLAN_PRICES = { starter: 27, professional: 67, agency: 147 };

// ── GET /api/plans
router.get('/', (req, res) => {
  res.json({ plans: getAllPlans() });
});

// ── POST /api/plans/upgrade (admin/internal only — direct upgrade)
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

// ── Helper: verify TX on Etherscan (ERC20/ETH/BNB)
async function verifyEVMTransaction(txHash, expectedToAddress, expectedMinUSD, coin) {
  try {
    // BSCScan for BNB, Etherscan for ETH/ERC20
    const isBSC = coin === 'BNB' || coin === 'USDT_BEP20';
    const apiKey = isBSC ? process.env.BSCSCAN_API_KEY : process.env.ETHERSCAN_API_KEY;
    const baseUrl = isBSC
      ? 'https://api.bscscan.com/api'
      : 'https://api.etherscan.io/api';

    if (!apiKey) {
      console.warn('⚠️ No blockchain API key set — cannot verify TX on-chain');
      return { verified: false, reason: 'Blockchain verification unavailable' };
    }

    const url = `${baseUrl}?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${apiKey}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (!data.result) return { verified: false, reason: 'Transaction not found on blockchain' };

    const tx = data.result;

    // Check transaction is confirmed (blockNumber exists)
    if (!tx.blockNumber) return { verified: false, reason: 'Transaction not yet confirmed' };

    // Check recipient address matches our wallet (case-insensitive)
    const toAddr = (tx.to || '').toLowerCase();
    const expectedAddr = expectedToAddress.toLowerCase();
    if (!toAddr.includes(expectedAddr.replace('0x','').toLowerCase())) {
      return { verified: false, reason: 'Transaction recipient does not match our wallet address' };
    }

    return { verified: true };
  } catch (err) {
    console.error('Blockchain verify error:', err.message);
    return { verified: false, reason: 'Could not connect to blockchain API' };
  }
}

// ── Helper: verify TRON/TRC20 TX (for USDT TRC20)
async function verifyTronTransaction(txHash, expectedMinUSD) {
  try {
    const url = `https://apilist.tronscanapi.com/api/transaction-info?hash=${txHash}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (!data || !data.hash) return { verified: false, reason: 'Transaction not found on TRON network' };
    if (data.confirmed !== true && data.contractRet !== 'SUCCESS') {
      return { verified: false, reason: 'Transaction not confirmed yet' };
    }

    // Check recipient
    const toAddr = (data.toAddress || '').toLowerCase();
    const ourAddr = WALLETS.USDT_TRC20.toLowerCase();
    if (toAddr !== ourAddr) {
      return { verified: false, reason: 'Transaction not sent to our wallet' };
    }

    // Check amount (TRC20 USDT has 6 decimals)
    const tokenTransfers = data.tokenTransferInfo;
    if (tokenTransfers) {
      const usdtAmount = parseFloat(tokenTransfers.amount_str || '0') / 1e6;
      if (usdtAmount < expectedMinUSD * 0.95) { // 5% tolerance
        return { verified: false, reason: `Amount too low: received $${usdtAmount.toFixed(2)}, expected $${expectedMinUSD}` };
      }
    }

    return { verified: true };
  } catch (err) {
    console.error('Tron verify error:', err.message);
    return { verified: false, reason: 'Could not connect to TRON network API' };
  }
}

// ── POST /api/plans/payment-submit
router.post('/payment-submit', authMiddleware, async (req, res) => {
  try {
    const { planId, txHash, coin, wallet, email, amount } = req.body;

    // ── Basic validation
    if (!planId || !txHash || !coin)
      return res.status(400).json({ error: 'Plan, transaction hash, and coin are required' });

    const plan = getPlanById(planId);
    if (!plan) return res.status(400).json({ error: 'Invalid plan selected' });

    const expectedUSD = PLAN_PRICES[planId];
    if (!expectedUSD) return res.status(400).json({ error: 'Free plan does not require payment' });

    // ── TX hash format validation
    const isTRON = coin === 'USDT_TRC20';
    if (isTRON) {
      if (!/^[a-fA-F0-9]{64}$/.test(txHash))
        return res.status(400).json({ error: 'Invalid TRON transaction hash format' });
    } else {
      if (!/^0x[a-fA-F0-9]{64}$/.test(txHash))
        return res.status(400).json({ error: 'Invalid transaction hash format. Must be 0x + 64 hex characters' });
    }

    // ── Log payment attempt
    console.log(`💰 PAYMENT SUBMITTED:
    User:   ${req.user.email} (${req.user._id})
    Plan:   ${planId} ($${expectedUSD})
    Coin:   ${coin}
    TX:     ${txHash}
    Time:   ${new Date().toISOString()}`);

    // ── Blockchain verification
    let verifyResult = { verified: false, reason: 'Unknown coin type' };

    if (isTRON) {
      verifyResult = await verifyTronTransaction(txHash, expectedUSD);
    } else if (['ETH', 'USDT_ERC20', 'BNB', 'USDT_BEP20'].includes(coin)) {
      const walletAddr = coin === 'BNB' || coin === 'USDT_BEP20' ? WALLETS.BNB : WALLETS.ETH;
      verifyResult = await verifyEVMTransaction(txHash, walletAddr, expectedUSD, coin);
    }

    // ── If verified: upgrade plan
    if (verifyResult.verified) {
      const updated = await updateUser(req.user._id, {
        plan: planId,
        planUpgradedAt: new Date(),
      });
      const { password, otp, ...safe } = updated.toObject();
      console.log(`✅ PAYMENT VERIFIED & PLAN UPGRADED: ${req.user.email} → ${planId}`);
      return res.json({
        message: `Payment verified! You've been upgraded to ${plan.name} plan.`,
        verified: true,
        user: safe,
      });
    }

    // ── If NOT verified: mark as pending, do NOT upgrade
    console.warn(`⏳ PAYMENT PENDING MANUAL REVIEW: ${req.user.email} | TX: ${txHash} | Reason: ${verifyResult.reason}`);
    return res.status(202).json({
      verified: false,
      pending: true,
      message: `Payment received but needs manual verification (${verifyResult.reason}). We'll upgrade your account within 24 hours after confirmation. Contact support@easyaiagents.online with your TX hash.`,
      txHash,
    });

  } catch (err) {
    console.error('Payment submit error:', err);
    res.status(500).json({ error: 'Server error during payment processing' });
  }
});

module.exports = router;
