import express from 'express';
import { pool } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All history routes require authentication
router.use(authenticateToken);

// GET /api/history (Get user's continue-watching history - decoupled from local tables)
router.get('/', async (req, res) => {
  const { limit = 20 } = req.query;

  if (req.query.limit !== undefined) {
    if (!/^\d+$/.test(String(limit)) || Number(limit) < 1 || Number(limit) > 100) {
      return res.status(400).json({ error: 'Invalid limit parameter. Must be an integer between 1 and 100' });
    }
  }

  const safeLimit = Math.min(Math.max(1, Number(limit) || 20), 50);

  try {
    const [history] = await pool.query(
      `SELECT id AS history_id, media_id, media_type, episode_number, title, thumbnail_url,
              progress_seconds, duration_seconds, is_completed, updated_at,
              ROUND((progress_seconds / NULLIF(duration_seconds, 0)) * 100) AS progress_percent
       FROM watch_history
       WHERE user_id = ?
       ORDER BY updated_at DESC
       LIMIT ?`,
      [req.user.id, safeLimit]
    );

    res.json({ history });
  } catch (error) {
    console.error('Fetch history error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve watch history' });
  }
});

// POST /api/history (Record playback heartbeat / save progress)
router.post('/', async (req, res) => {
  const {
    mediaId,
    episodeId,
    mediaType = 'movie',
    episodeNumber = 1,
    title = '',
    thumbnailUrl = '',
    progressSeconds = 0,
    durationSeconds = 0,
    isCompleted = false
  } = req.body;

  const targetId = String(mediaId || episodeId || '').trim();
  if (!targetId || targetId.length > 64) {
    return res.status(400).json({ error: 'Valid mediaId or episodeId is required' });
  }

  const cleanMediaType = String(mediaType || 'movie').slice(0, 20);
  const cleanEpisodeNum = Math.max(1, Number(episodeNumber) || 1);
  const cleanTitle = String(title || '').slice(0, 255);
  const cleanThumbnail = String(thumbnailUrl || '').slice(0, 500);
  const cleanProgress = Math.max(0, Number(progressSeconds) || 0);
  const cleanDuration = Math.max(0, Number(durationSeconds) || 0);

  try {
    await pool.query(
      `INSERT INTO watch_history (user_id, media_id, media_type, episode_number, title, thumbnail_url, progress_seconds, duration_seconds, is_completed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         progress_seconds = VALUES(progress_seconds),
         duration_seconds = VALUES(duration_seconds),
         is_completed = VALUES(is_completed),
         title = CASE WHEN VALUES(title) != '' THEN VALUES(title) ELSE title END,
         thumbnail_url = CASE WHEN VALUES(thumbnail_url) != '' THEN VALUES(thumbnail_url) ELSE thumbnail_url END,
         updated_at = CURRENT_TIMESTAMP`,
      [
        req.user.id,
        targetId,
        cleanMediaType,
        cleanEpisodeNum,
        cleanTitle,
        cleanThumbnail,
        Math.floor(cleanProgress),
        Math.floor(cleanDuration),
        Boolean(isCompleted)
      ]
    );

    res.status(200).json({ message: 'Watch progress saved successfully' });
  } catch (error) {
    console.error('Save history error:', error.message);
    res.status(500).json({ error: 'Failed to record watch history' });
  }
});

export default router;
