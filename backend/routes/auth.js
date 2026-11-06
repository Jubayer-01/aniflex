import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { pool } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('CRITICAL SECURITY ERROR: process.env.JWT_SECRET is missing. Server cannot start without a secure secret.');
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Anti-brute force limiter: Max 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login or registration attempts. Please try again after 15 minutes.' }
});

// Password reset limiter: Max 5 attempts per hour per IP
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please try again later.' }
});

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  // Sanitize and validate username
  const cleanUsername = String(username).trim();
  if (cleanUsername.length < 3 || cleanUsername.length > 30 || !/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
    return res.status(400).json({ error: 'Username must be 3-30 characters (letters, numbers, and underscores only)' });
  }

  // Validate email format
  const cleanEmail = String(email).trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please provide a valid email address' });
  }

  // Validate password length (min 8 characters)
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    // Check if user already exists
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1',
      [cleanEmail, cleanUsername]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email or username already in use' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert new user
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, "user")',
      [cleanUsername, cleanEmail, passwordHash]
    );

    const userId = result.insertId;

    // Generate JWT token
    const token = jwt.sign(
      { id: userId, username: cleanUsername, email: cleanEmail, role: 'user' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: userId, username: cleanUsername, email: cleanEmail, role: 'user' }
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, username, email, password_hash, role, avatar_url FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// GET /api/auth/me (Current authenticated user profile)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, email, role, avatar_url, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: rows[0] });
  } catch (error) {
    console.error('Fetch me error:', error.message);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// PUT /api/auth/profile (Update username or avatar)
router.put('/profile', authenticateToken, async (req, res) => {
  const { username, avatar_url } = req.body;

  try {
    await pool.query(
      'UPDATE users SET username = COALESCE(?, username), avatar_url = COALESCE(?, avatar_url) WHERE id = ?',
      [username || null, avatar_url || null, req.user.id]
    );

    const [rows] = await pool.query(
      'SELECT id, username, email, role, avatar_url FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );

    res.json({ message: 'Profile updated successfully', user: rows[0] });
  } catch (error) {
    console.error('Profile update error:', error.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/auth/change-password (Secure password change)
router.put('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Current password and valid new password (min 6 chars) required' });
  }

  try {
    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error.message);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// POST /api/auth/forgot-password (Request reset link securely)
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const cleanEmail = String(email).trim().toLowerCase();

  try {
    const [rows] = await pool.query('SELECT id, email FROM users WHERE email = ? LIMIT 1', [cleanEmail]);
    if (rows.length === 0) {
      // Mitigate user enumeration: identical response for existing and non-existing accounts
      return res.json({ message: 'If your email is registered, you will receive a reset link.' });
    }

    // Generate signed reset token
    const resetToken = jwt.sign({ id: rows[0].id, type: 'reset' }, JWT_SECRET, { expiresIn: '15m' });

    // In production with live SMTP (Resend/Nodemailer), email the reset URL here:
    // await sendResetEmail(cleanEmail, `https://aniflex.vercel.app/reset-password?token=${resetToken}`);
    // NOTE: devToken and console.log are strictly deleted to prevent account takeover

    res.json({
      message: 'If your email is registered, you will receive a password reset link.',
    });
  } catch (error) {
    console.error('Forgot password error:', error.message);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /api/auth/reset-password (Apply new password with token)
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Valid token and new password (min 8 chars) required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'reset') {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, decoded.id]);
    res.json({ message: 'Password has been reset successfully. You may now log in.' });
  } catch (error) {
    console.error('Reset password error:', error.message);
    res.status(400).json({ error: 'Invalid or expired reset token' });
  }
});

export default router;

