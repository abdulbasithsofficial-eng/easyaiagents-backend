const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { findUserByEmail, createUser, findUserById, updateUser, saveOtp, verifyOtp, deleteUser } = require('./database');
const { generateToken, authMiddleware } = require('./auth-middleware');
const { sendOtpEmail } = require('./mailer');

function genOtp() { return Math.floor(100000 + Math.random() * 900000).toString(); }

// SIGNUP
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password min 6 characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });
    if (await findUserByEmail(email)) return res.status(409).json({ error: 'Email already registered' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser({ name: name.trim(), email, password: hashedPassword, emailVerified: false });
    const token = generateToken(user._id);
    res.status(201).json({ message: 'Account created', token, user: { id: user._id, name: user.name, email: user.email, plan: user.plan } });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// LOGIN (password)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.password) return res.status(401).json({ error: 'Use Google Sign-In' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateToken(user._id);
    res.json({ message: 'Login successful', token, user: { id: user._id, name: user.name, email: user.email, plan: user.plan } });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// SEND OTP (signup or login)
router.post('/send-otp', async (req, res) => {
  try {
    const { email, type } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const user = await findUserByEmail(email);
    if (type === 'login' && !user) return res.status(404).json({ error: 'No account found' });
    const otp = genOtp();
    const name = user ? user.name : 'User';
    await saveOtp(email, otp);
    await sendOtpEmail(email, otp, name);
    res.json({ message: 'OTP sent', email });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to send OTP' }); }
});

// VERIFY OTP (for signup completion)
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });
    const user = await verifyOtp(email, otp);
    if (!user) return res.status(400).json({ error: 'Invalid or expired OTP' });
    const token = generateToken(user._id);
    res.json({ message: 'Verified', token, user: { id: user._id, name: user.name, email: user.email, plan: user.plan } });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// SEND LOGIN OTP (passwordless)
router.post('/send-login-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const user = await findUserByEmail(email);
    if (!user) return res.status(404).json({ error: 'No account found' });
    const otp = genOtp();
    await saveOtp(email, otp);
    await sendOtpEmail(email, otp, user.name);
    res.json({ message: 'OTP sent to email' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to send OTP' }); }
});

// VERIFY LOGIN OTP
router.post('/login-otp-verify', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });
    const user = await verifyOtp(email, otp);
    if (!user) return res.status(400).json({ error: 'Invalid or expired OTP' });
    const token = generateToken(user._id);
    res.json({ message: 'Login successful', token, user: { id: user._id, name: user.name, email: user.email, plan: user.plan } });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /me
router.get('/me', authMiddleware, async (req, res) => {
  const { password, otp, otpExpiry, ...safe } = req.user.toObject();
  res.json({ user: safe });
});

// UPDATE PROFILE
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const updates = {};
    if (name) updates.name = name.trim();
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password required' });
      const match = await bcrypt.compare(currentPassword, req.user.password);
      if (!match) return res.status(401).json({ error: 'Current password incorrect' });
      if (newPassword.length < 6) return res.status(400).json({ error: 'Password min 6 chars' });
      updates.password = await bcrypt.hash(newPassword, 10);
    }
    const updated = await updateUser(req.user._id, updates);
    const { password, otp, otpExpiry, ...safe } = updated.toObject();
    res.json({ message: 'Profile updated', user: safe });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});



// ─────────────────────────────────────────────
// DELETE ACCOUNT
// ─────────────────────────────────────────────
router.delete('/account', authMiddleware, async (req, res) => {
  try {
    await deleteUser(req.user._id);
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;
