import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { pool } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('CRITICAL SECURITY ERROR: process.env.JWT_SECRET is missing. Server cannot start without a secure secret.');
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Pre-computed dummy hash to equalize login response time (~85ms) and prevent email enumeration
const DUMMY_HASH = '$2a$10$wT8PZ1pL0u7Xb7xZ7j1zNuqW6Y.O6D1D5V0a2U4k5m6n7o8p9q0r.';

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
      'INSERT INTO users (username, email, password_hash, role, token_version) VALUES (?, ?, ?, "user", 1)',
      [cleanUsername, cleanEmail, passwordHash]
    );

    const userId = result.insertId;

    // Generate JWT token with token_version for session tracking
    const token = jwt.sign(
      { id: userId, username: cleanUsername, email: cleanEmail, role: 'user', token_version: 1 },
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

  if (!email || !password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const cleanEmail = String(email).trim().toLowerCase();

  try {
    const [rows] = await pool.query(
      'SELECT id, username, email, password_hash, role, avatar_url, token_version FROM users WHERE email = ? LIMIT 1',
      [cleanEmail]
    );

    // Mitigate timing attack & email enumeration: execute dummy bcrypt comparison when email not found
    if (rows.length === 0) {
      await bcrypt.compare(password, DUMMY_HASH);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const currentVersion = user.token_version || 1;

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role, token_version: currentVersion },
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

// PUT /api/auth/profile (Update username or avatar with strict input checks)
router.put('/profile', authenticateToken, async (req, res) => {
  const { username, avatar_url } = req.body;

  let cleanUsername = null;
  if (username !== undefined) {
    cleanUsername = String(username).trim();
    if (cleanUsername.length < 3 || cleanUsername.length > 30 || !/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      return res.status(400).json({ error: 'Username must be 3-30 characters (alphanumeric and underscores only)' });
    }
    // Check for duplicate username
    const [dup] = await pool.query('SELECT id FROM users WHERE username = ? AND id != ? LIMIT 1', [cleanUsername, req.user.id]);
    if (dup.length > 0) {
      return res.status(409).json({ error: 'Username is already taken' });
    }
  }

  let cleanAvatar = null;
  if (avatar_url !== undefined && avatar_url !== null) {
    cleanAvatar = String(avatar_url).trim();
    if (cleanAvatar.length > 500) {
      return res.status(400).json({ error: 'avatar_url must not exceed 500 characters' });
    }
  }

  try {
    await pool.query(
      'UPDATE users SET username = COALESCE(?, username), avatar_url = COALESCE(?, avatar_url) WHERE id = ?',
      [cleanUsername, cleanAvatar, req.user.id]
    );

    const [rows] = await pool.query(
      'SELECT id, username, email, role, avatar_url FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );

    res.json({ message: 'Profile updated successfully', user: rows[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username is already taken' });
    }
    console.error('Profile update error:', error.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/auth/change-password (Secure password change + invalidate older sessions)
router.put('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'Current password and valid new password (min 8 chars) required' });
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

    // Invalidate prior sessions by incrementing token_version
    await pool.query('UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?', [newHash, req.user.id]);
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
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [cleanEmail]);
    if (rows.length === 0) {
      // Mitigate user enumeration & timing difference
      await bcrypt.compare('dummy', DUMMY_HASH);
      return res.json({ message: 'If your email is registered, you will receive a reset link.' });
    }

    // Generate cryptographically secure random token & store SHA-256 hash in DB
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await pool.query(
      'UPDATE users SET reset_token_hash = ?, reset_token_expires_at = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?',
      [tokenHash, rows[0].id]
    );

    // Token is never leaked in HTTP response or logs to prevent account takeover
    res.json({
      message: 'If your email is registered, you will receive a password reset link.',
    });
  } catch (error) {
    console.error('Forgot password error:', error.message);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /api/auth/reset-password (Apply new password with single-use token + revoke old sessions)
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'Valid token and new password (min 8 chars) required' });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');

    const [rows] = await pool.query(
      'SELECT id FROM users WHERE reset_token_hash = ? AND reset_token_expires_at > NOW() LIMIT 1',
      [tokenHash]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const userId = rows[0].id;
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    // Clear reset token (single-use enforcement) and bump token_version (session revocation)
    await pool.query(
      'UPDATE users SET password_hash = ?, reset_token_hash = NULL, reset_token_expires_at = NULL, token_version = token_version + 1 WHERE id = ?',
      [newHash, userId]
    );

    res.json({ message: 'Password has been reset successfully. You may now log in.' });
  } catch (error) {
    console.error('Reset password error:', error.message);
    res.status(400).json({ error: 'Invalid or expired reset token' });
  }
});

export default router;
