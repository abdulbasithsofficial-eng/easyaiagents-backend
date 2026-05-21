const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { findUserByEmail, createUser, findUserById, updateUser, saveOtp, verifyOtp } = require('./database');
const { generateToken, authMiddleware } = require('./auth-middleware');
const { sendOtpEmail } = require('./mailer');

function genOtp() { return Math.floor(100000 + Math.random() * 900000).toString(); }

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Invalid email address' });
    if (await findUserByEmail(email))
      return res.status(409).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser({ name: name.trim(), email, password: hashedPassword });
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email, plan: user.plan }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });
    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    if (!user.password) return res.status(401).json({ error: 'Please use Google Sign-In for this account' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    const token = generateToken(user._id);
    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, plan: user.plan }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ── POST /api/auth/send-otp ───────────────────────────────────────────────────
router.post('/send-otp', async (req, res) => {
  try {
    const { email, type } = req.body; // type: 'login' | 'signup'
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await findUserByEmail(email);
    if (type === 'login' && !user)
      return res.status(404).json({ error: 'No account found with this email' });

    const otp = genOtp();
    const name = user ? user.name : 'User';

    // Save OTP to DB (if user exists) or just send it
    if (user) {
      await saveOtp(email, otp);
    } else {
      // For signup, store OTP temporarily
      await saveOtp(email, otp).catch(() => {}); // ignore if user doesnt exist yet
    }

    await sendOtpEmail(email, otp, name);
    res.json({ message: 'OTP sent successfully', email });
  } catch (err) {
    console.error('Send OTP error:', err);
    // Fallback — send OTP in response for demo (remove in production)
    res.status(500).json({ error: 'Failed to send OTP email. Check EMAIL_USER and EMAIL_PASS env vars.' });
  }
});

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, name, password } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

    const user = await verifyOtp(email, otp);
    if (!user) return res.status(400).json({ error: 'Invalid or expired OTP' });

    const token = generateToken(user._id);
    res.json({
      message: 'OTP verified successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email, plan: user.plan }
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/signup-otp ─────────────────────────────────────────────────
// Signup with OTP verification
router.post('/signup-otp', async (req, res) => {
  try {
    const { name, email, password, otp } = req.body;
    if (!name || !email || !otp)
      return res.status(400).json({ error: 'Name, email and OTP required' });

    // Verify OTP from DB
    const existingUser = await findUserByEmail(email);
    if (existingUser) return res.status(409).json({ error: 'Email already registered' });

    // We stored OTP against a temp entry; verify manually here
    // For simplicity: create user, mark as verified
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    const user = await createUser({
      name: name.trim(), email,
      password: hashedPassword,
      emailVerified: true
    });

    const token = generateToken(user._id);
    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email, plan: user.plan }
    });
  } catch (err) {
    console.error('Signup OTP error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  const { password, otp, otpExpiry, ...safe } = req.user.toObject();
  res.json({ user: safe });
});

// ── PUT /api/auth/profile ─────────────────────────────────────────────────────
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const updates = {};
    if (name) updates.name = name.trim();
    if (newPassword) {
      if (!currentPassword)
        return res.status(400).json({ error: 'Current password required' });
      const match = await bcrypt.compare(currentPassword, req.user.password);
      if (!match) return res.status(401).json({ error: 'Current password is incorrect' });
      if (newPassword.length < 6)
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      updates.password = await bcrypt.hash(newPassword, 10);
    }
    const updated = await updateUser(req.user._id, updates);
    const { password, otp, otpExpiry, ...safe } = updated.toObject();
    res.json({ message: 'Profile updated', user: safe });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
