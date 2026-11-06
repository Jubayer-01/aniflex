import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('CRITICAL SECURITY ERROR: process.env.JWT_SECRET is missing. Server cannot start without a secure secret.');
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Verify session has not been invalidated by password change/reset
    try {
      const [rows] = await pool.query('SELECT token_version FROM users WHERE id = ? LIMIT 1', [user.id]);
      if (rows.length === 0) {
        return res.status(401).json({ error: 'User no longer exists' });
      }
      if (user.token_version !== undefined && rows[0].token_version !== user.token_version) {
        return res.status(401).json({ error: 'Session invalidated due to password change. Please log in again.' });
      }
    } catch (dbErr) {
      console.warn('Session version check DB warning:', dbErr.message);
    }

    // Set user info on request (prevents IDOR: queries use req.user.id, not req.body.userId)
    req.user = user;
    next();
  });
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
