import express from 'express';
import { pool } from '../config/db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/anime (Browse & filter catalog)
router.get('/', async (req, res) => {
  const { genre, sort = 'score', search, limit = 24, page = 1 } = req.query;

  if (req.query.limit !== undefined) {
    if (!/^\d+$/.test(String(limit)) || Number(limit) < 1 || Number(limit) > 100) {
      return res.status(400).json({ error: 'Invalid limit parameter. Must be an integer between 1 and 100' });
    }
  }

  if (req.query.page !== undefined) {
    if (!/^\d+$/.test(String(page)) || Number(page) < 1) {
      return res.status(400).json({ error: 'Invalid page parameter. Must be a positive integer' });
    }
  }

  const safeLimit = Math.min(Math.max(1, Number(limit) || 24), 50);
  const safePage = Math.max(1, Number(page) || 1);
  const offset = (safePage - 1) * safeLimit;

  try {
    let sql = 'SELECT * FROM anime WHERE 1=1';
    const params = [];

    if (search) {
      const cleanSearch = String(search).slice(0, 80);
      sql += ' AND (title_english LIKE ? OR title_romaji LIKE ?)';
      params.push(`%${cleanSearch}%`, `%${cleanSearch}%`);
    }

    if (sort === 'score') {
      sql += ' ORDER BY score DESC';
    } else if (sort === 'newest') {
      sql += ' ORDER BY season_year DESC, id DESC';
    } else {
      sql += ' ORDER BY id DESC';
    }

    sql += ' LIMIT ? OFFSET ?';
    params.push(safeLimit, offset);

    const [rows] = await pool.query(sql, params);
    res.json({ anime: rows, page: safePage, limit: safeLimit });
  } catch (error) {
    console.error('Fetch anime error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve anime catalog' });
  }
});

// GET /api/anime/:id (Get single anime with seasons and episodes)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(String(id))) {
    return res.status(400).json({ error: 'Invalid anime ID' });
  }

  try {
    const [animeRows] = await pool.query('SELECT * FROM anime WHERE id = ? LIMIT 1', [id]);
    if (animeRows.length === 0) {
      return res.status(404).json({ error: 'Anime not found' });
    }

    const anime = animeRows[0];

    // Fetch seasons and episodes
    const [seasons] = await pool.query(
      'SELECT * FROM seasons WHERE anime_id = ? ORDER BY season_number ASC',
      [id]
    );

    for (let season of seasons) {
      const [episodes] = await pool.query(
        'SELECT * FROM episodes WHERE season_id = ? ORDER BY episode_number ASC',
        [season.id]
      );
      season.episodes = episodes;
    }

    anime.seasons = seasons;

    res.json({ anime });
  } catch (error) {
    console.error('Fetch anime details error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve anime details' });
  }
});

// POST /api/anime (Admin only - create anime)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const {
    title_english,
    title_romaji,
    synopsis,
    banner_url,
    poster_url,
    season_year,
    score,
    studio,
    status
  } = req.body;

  if (!title_english) {
    return res.status(400).json({ error: 'title_english is required' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO anime 
       (title_english, title_romaji, synopsis, banner_url, poster_url, season_year, score, studio, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title_english,
        title_romaji || null,
        synopsis || null,
        banner_url || null,
        poster_url || null,
        season_year || null,
        score || 0.0,
        studio || null,
        status || 'finished'
      ]
    );

    res.status(201).json({
      message: 'Anime created successfully',
      animeId: result.insertId
    });
  } catch (error) {
    console.error('Create anime error:', error.message);
    res.status(500).json({ error: 'Failed to create anime entry' });
  }
});

export default router;

