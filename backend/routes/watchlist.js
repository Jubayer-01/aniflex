import express from 'express';
import { pool } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All watchlist routes require authentication
router.use(authenticateToken);

const ALLOWED_STATUSES = ['watching', 'completed', 'plan_to_watch', 'dropped', 'on_hold'];

// GET /api/watchlist (Get user's personal saved watchlist - decoupled from local tables)
router.get('/', async (req, res) => {
  try {
    const [items] = await pool.query(
      `SELECT id AS watchlist_id, anime_id, media_type, status AS watch_status,
              title, poster_url, created_at AS added_at
       FROM watchlist
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({ watchlist: items });
  } catch (error) {
    console.error('Fetch watchlist error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve watchlist' });
  }
});

// POST /api/watchlist (Add or update media status in user's watchlist)
router.post('/', async (req, res) => {
  const { animeId, mediaType = 'movie', status = 'watching', title = '', posterUrl = '' } = req.body;

  if (!animeId || String(animeId).trim().length === 0 || String(animeId).length > 64) {
    return res.status(400).json({ error: 'Valid animeId or media ID is required' });
  }

  const cleanStatus = String(status).toLowerCase().trim();
  if (!ALLOWED_STATUSES.includes(cleanStatus)) {
    return res.status(400).json({ error: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}` });
  }

  const cleanMediaType = String(mediaType || 'movie').slice(0, 20);
  const cleanTitle = String(title || '').slice(0, 255);
  const cleanPoster = String(posterUrl || '').slice(0, 500);

  try {
    await pool.query(
      `INSERT INTO watchlist (user_id, anime_id, media_type, status, title, poster_url)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         media_type = VALUES(media_type),
         status = VALUES(status),
         title = CASE WHEN VALUES(title) != '' THEN VALUES(title) ELSE title END,
         poster_url = CASE WHEN VALUES(poster_url) != '' THEN VALUES(poster_url) ELSE poster_url END`,
      [req.user.id, String(animeId), cleanMediaType, cleanStatus, cleanTitle, cleanPoster]
    );

    res.status(200).json({ message: 'Watchlist updated successfully', animeId, status: cleanStatus });
  } catch (error) {
    console.error('Add watchlist error:', error.message);
    res.status(500).json({ error: 'Failed to update watchlist' });
  }
});

// DELETE /api/watchlist/:animeId (Remove media from user's watchlist)
router.delete('/:animeId', async (req, res) => {
  const { animeId } = req.params;

  if (!animeId || String(animeId).length > 64) {
    return res.status(400).json({ error: 'Invalid media ID' });
  }

  try {
    const [result] = await pool.query(
      'DELETE FROM watchlist WHERE user_id = ? AND anime_id = ?',
      [req.user.id, String(animeId)]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Item not found in watchlist' });
    }

    res.json({ message: 'Removed from watchlist successfully', animeId });
  } catch (error) {
    console.error('Delete watchlist error:', error.message);
    res.status(500).json({ error: 'Failed to remove from watchlist' });
  }
});

export default router;
