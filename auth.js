const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { findUserByEmail, createUser, findUserById, updateUser, saveOtp, verifyOtp } = require('./database');
const { generateToken, authMiddleware } = require('./auth-middleware');
const { sendOtpEmail } = require('./mailer');

// Google Auth
const { OAuth2Client } = require('google-auth-library');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '597827432772-l6hdnkkpcs58sa032cq3elb2ucprd6bi.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

function genOtp() { return Math.floor(100000 + Math.random() * 900000).toString(); }

// ─────────────────────────────────────────────
// GOOGLE SIGN-IN VERIFY  ← WAS MISSING
// ─────────────────────────────────────────────
router.post('/google-verify', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Google credential required' });

    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, sub: googleId, picture } = payload;

    if (!email) return res.status(400).json({ error: 'Could not get email from Google' });

    // Find existing user or create new one
    let user = await findUserByEmail(email);
    if (!user) {
      user = await createUser({
        name: name || email.split('@')[0],
        email,
        googleId,
        picture,
        emailVerified: true,
        password: null,
        plan: 'free',
      });
    } else {
      // Update googleId if signing in with Google for first time
      if (!user.googleId) {
        await updateUser(user._id, { googleId, emailVerified: true });
      }
    }

    const token = generateToken(user._id);
    res.json({
      message: 'Google sign-in successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, plan: user.plan || 'free' }
    });
  } catch (err) {
    console.error('Google verify error:', err);
    res.status(401).json({ error: 'Google sign-in failed. Invalid token.' });
  }
});

// ─────────────────────────────────────────────
// SIGNUP (with OTP verification)
// ─────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, otp } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password min 6 characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });
    if (await findUserByEmail(email)) return res.status(409).json({ error: 'Email already registered' });

    // ← OTP check add kiya — pehle ye nahi tha
    if (!otp) return res.status(400).json({ error: 'Verification code required' });
    const otpValid = await verifyOtp(email, otp);
    if (!otpValid) return res.status(400).json({ error: 'Invalid or expired verification code' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser({
      name: name.trim(),
      email,
      password: hashedPassword,
      emailVerified: true,
      plan: 'free',
    });
    const token = generateToken(user._id);
    res.status(201).json({
      message: 'Account created',
      token,
      user: { id: user._id, name: user.name, email: user.email, plan: user.plan || 'free' }
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ─────────────────────────────────────────────
// LOGIN (password)
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.password) return res.status(401).json({ error: 'This account uses Google Sign-In. Please use Continue with Google.' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateToken(user._id);
    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, plan: user.plan || 'free' }
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ─────────────────────────────────────────────
// SEND OTP — handles signup, login, AND reset
// ─────────────────────────────────────────────
router.post('/send-otp', async (req, res) => {
  try {
    const { email, type } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    if (!['signup', 'login', 'reset'].includes(type)) return res.status(400).json({ error: 'Invalid OTP type' });

    const user = await findUserByEmail(email);

    if (type === 'login' && !user) return res.status(404).json({ error: 'No account found with this email' });
    if (type === 'reset' && !user) return res.status(404).json({ error: 'No account found with this email' });
    // signup type: user should NOT exist (already checked in /signup, but sending OTP is allowed regardless)

    const otp = genOtp();
    const name = user ? user.name : 'User';
    await saveOtp(email, otp);
    await sendOtpEmail(email, otp, name, type);
    res.json({ message: 'OTP sent', email });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to send OTP' }); }
});

// ─────────────────────────────────────────────
// VERIFY OTP (for OTP login)
// ─────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });
    const user = await verifyOtp(email, otp);
    if (!user) return res.status(400).json({ error: 'Invalid or expired OTP' });
    const token = generateToken(user._id);
    res.json({
      message: 'Verified',
      token,
      user: { id: user._id, name: user.name, email: user.email, plan: user.plan || 'free' }
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ─────────────────────────────────────────────
// VERIFY RESET OTP  ← WAS MISSING
// ─────────────────────────────────────────────
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });
    const user = await verifyOtp(email, otp);
    if (!user) return res.status(400).json({ error: 'Invalid or expired code' });
    // Return a reset token (we reuse the otp itself as a short-lived proof)
    // For stronger security, generate a signed token here
    const resetToken = generateToken(user._id); // short-lived proof
    res.json({ message: 'OTP verified', token: resetToken });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ─────────────────────────────────────────────
// RESET PASSWORD  ← WAS MISSING
// ─────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, password } = req.body;
    if (!email || !token || !password) return res.status(400).json({ error: 'Email, token and new password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const user = await findUserByEmail(email);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Verify the token is valid (it was issued for this user)
    const { verifyToken } = require('./auth-middleware');
    let decoded;
    try { decoded = verifyToken(token); } catch(e) { return res.status(401).json({ error: 'Invalid or expired reset link. Please request a new one.' }); }
    if (decoded.userId.toString() !== user._id.toString()) return res.status(401).json({ error: 'Invalid reset token' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await updateUser(user._id, { password: hashedPassword });
    res.json({ message: 'Password reset successful' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ─────────────────────────────────────────────
// GET /me
// ─────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  const { password, otp, otpExpiry, ...safe } = req.user.toObject();
  res.json({ user: safe });
});

// ─────────────────────────────────────────────
// UPDATE PROFILE
// ─────────────────────────────────────────────
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const updates = {};
    if (name) updates.name = name.trim();
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password required' });
      if (!req.user.password) return res.status(400).json({ error: 'Google accounts cannot set a password this way' });
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

module.exports = router;
