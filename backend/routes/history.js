import express from 'express';
import { pool } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All history routes require authentication
router.use(authenticateToken);

// GET /api/history (Get user's continue-watching history)
router.get('/', async (req, res) => {
  try {
    const [history] = await pool.query(
      `SELECT h.id AS history_id, h.progress_seconds, h.duration_seconds, h.is_completed, h.updated_at,
              ROUND((h.progress_seconds / NULLIF(h.duration_seconds, 0)) * 100) AS progress_percent,
              e.id AS episode_id, e.episode_number, e.title AS episode_title, e.thumbnail_url,
              a.id AS anime_id, a.title_english, a.title_romaji, a.banner_url
       FROM watch_history h
       JOIN episodes e ON h.episode_id = e.id
       JOIN seasons s ON e.season_id = s.id
       JOIN anime a ON s.anime_id = a.id
       WHERE h.user_id = ?
       ORDER BY h.updated_at DESC
       LIMIT 20`,
      [req.user.id]
    );

    res.json({ history });
  } catch (error) {
    console.error('Fetch history error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve watch history' });
  }
});

// POST /api/history (Record playback heartbeat / save progress)
router.post('/', async (req, res) => {
  const { episodeId, progressSeconds = 0, durationSeconds = 0, isCompleted = false } = req.body;

  if (!episodeId) {
    return res.status(400).json({ error: 'episodeId is required' });
  }

  try {
    await pool.query(
      `INSERT INTO watch_history (user_id, episode_id, progress_seconds, duration_seconds, is_completed)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         progress_seconds = VALUES(progress_seconds),
         duration_seconds = VALUES(duration_seconds),
         is_completed = VALUES(is_completed),
         updated_at = CURRENT_TIMESTAMP`,
      [req.user.id, episodeId, Math.floor(progressSeconds), Math.floor(durationSeconds), Boolean(isCompleted)]
    );

    res.status(200).json({ message: 'Watch progress saved successfully' });
  } catch (error) {
    console.error('Save history error:', error.message);
    res.status(500).json({ error: 'Failed to record watch history' });
  }
});

export default router;

