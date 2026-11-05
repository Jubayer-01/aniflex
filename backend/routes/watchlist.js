import express from 'express';
import { pool } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All watchlist routes require authentication
router.use(authenticateToken);

// GET /api/watchlist (Get user's personal saved watchlist)
router.get('/', async (req, res) => {
  try {
    const [items] = await pool.query(
      `SELECT w.id AS watchlist_id, w.status AS watch_status, w.created_at AS added_at,
              a.id, a.anilist_id, a.title_english, a.title_romaji, a.poster_url, a.banner_url,
              a.score, a.season_year, a.status
       FROM watchlist w
       JOIN anime a ON w.anime_id = a.id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );

    res.json({ watchlist: items });
  } catch (error) {
    console.error('Fetch watchlist error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve watchlist' });
  }
});

// POST /api/watchlist (Add or update anime status in user's watchlist)
router.post('/', async (req, res) => {
  const { animeId, status = 'watching' } = req.body;

  if (!animeId) {
    return res.status(400).json({ error: 'animeId is required' });
  }

  try {
    await pool.query(
      `INSERT INTO watchlist (user_id, anime_id, status)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status)`,
      [req.user.id, animeId, status]
    );

    res.status(200).json({ message: 'Watchlist updated successfully', animeId, status });
  } catch (error) {
    console.error('Add watchlist error:', error.message);
    res.status(500).json({ error: 'Failed to update watchlist' });
  }
});

// DELETE /api/watchlist/:animeId (Remove anime from user's watchlist)
router.delete('/:animeId', async (req, res) => {
  const { animeId } = req.params;

  try {
    const [result] = await pool.query(
      'DELETE FROM watchlist WHERE user_id = ? AND anime_id = ?',
      [req.user.id, animeId]
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

