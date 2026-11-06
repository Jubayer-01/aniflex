import express from 'express';
import axios from 'axios';

const router = express.Router();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
if (!TMDB_API_KEY) {
  console.warn('[SECURITY] process.env.TMDB_API_KEY is not configured. TMDB requests will return 503.');
}
const BASE_URL = 'https://api.themoviedb.org/3';

// Bounded LRU Cache (Max 200 items, 30-minute TTL) to prevent memory leak
const cache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_CACHE_SIZE = 200;

function getCached(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  return null;
}

function setCached(key, data) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

// Validation helper for numeric parameters
const isValidNumericId = (val) => /^\d+$/.test(String(val));

function validatePage(req, res) {
  if (req?.query?.page !== undefined) {
    if (!/^\d+$/.test(String(req.query.page)) || Number(req.query.page) < 1) {
      res.status(400).json({ error: 'Invalid page parameter. Must be a positive integer' });
      return false;
    }
  }
  return true;
}

// Reusable TMDB fetcher returning explicit error states
async function fetchTMDB(endpoint, params = {}) {
  if (!TMDB_API_KEY) return { error: 'TMDB_KEY_MISSING' };

  const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
  const hit = getCached(cacheKey);
  if (hit) return hit;

  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'en-US',
        ...params,
      },
      timeout: 7000,
    });

    if (response.data) {
      setCached(cacheKey, response.data);
    }
    return response.data;
  } catch (error) {
    console.error(`TMDB Server proxy error [${endpoint}]:`, error.message);
    if (error.response?.status === 404) return null;
    return { error: 'UPSTREAM_ERROR' };
  }
}

function sendTMDBResults(res, data) {
  if (data?.error === 'TMDB_KEY_MISSING') {
    return res.status(503).json({ error: 'TMDB service key not configured on server' });
  }
  if (data?.error === 'UPSTREAM_ERROR') {
    return res.status(502).json({ error: 'Upstream TMDB service temporarily unreachable' });
  }
  if (!data) {
    return res.status(502).json({ error: 'Upstream TMDB service unreachable' });
  }
  return res.json({ results: data.results || [] });
}

function sendTMDBDetail(res, data, notFoundMsg = 'Resource not found') {
  if (data?.error === 'TMDB_KEY_MISSING') {
    return res.status(503).json({ error: 'TMDB service key not configured on server' });
  }
  if (data?.error === 'UPSTREAM_ERROR') {
    return res.status(502).json({ error: 'Upstream TMDB service temporarily unreachable' });
  }
  if (!data) {
    return res.status(404).json({ error: notFoundMsg });
  }
  return res.json(data);
}

// 1. GET /api/movies/trending
router.get('/trending', async (req, res) => {
  const data = await fetchTMDB('/trending/all/day');
  sendTMDBResults(res, data);
});

// 2. GET /api/movies/hollywood
router.get('/hollywood', async (req, res) => {
  if (!validatePage(req, res)) return;
  const { page = 1, genre } = req.query;
  const safePage = Math.min(Math.max(1, Number(page) || 1), 100);
  const params = {
    page: safePage,
    with_original_language: 'en',
    sort_by: 'popularity.desc',
  };
  if (genre && isValidNumericId(genre)) params.with_genres = genre;

  const data = await fetchTMDB('/discover/movie', params);
  sendTMDBResults(res, data);
});

// 3. GET /api/movies/bollywood
router.get('/bollywood', async (req, res) => {
  if (!validatePage(req, res)) return;
  const { page = 1 } = req.query;
  const safePage = Math.min(Math.max(1, Number(page) || 1), 100);
  const data = await fetchTMDB('/discover/movie', {
    page: safePage,
    with_original_language: 'hi',
    sort_by: 'popularity.desc',
  });
  sendTMDBResults(res, data);
});

// 4. GET /api/movies/series
router.get('/series', async (req, res) => {
  if (!validatePage(req, res)) return;
  const { page = 1, genre } = req.query;
  const safePage = Math.min(Math.max(1, Number(page) || 1), 100);
  const params = {
    page: safePage,
    sort_by: 'popularity.desc',
  };
  if (genre && isValidNumericId(genre)) params.with_genres = genre;

  const data = await fetchTMDB('/discover/tv', params);
  sendTMDBResults(res, data);
});

// 5. GET /api/movies/kdramas
router.get('/kdramas', async (req, res) => {
  if (!validatePage(req, res)) return;
  const { page = 1 } = req.query;
  const safePage = Math.min(Math.max(1, Number(page) || 1), 100);
  const data = await fetchTMDB('/discover/tv', {
    page: safePage,
    with_original_language: 'ko',
    sort_by: 'popularity.desc',
  });
  sendTMDBResults(res, data);
});

// 6. GET /api/movies/details/:id
router.get('/details/:id', async (req, res) => {
  const { id } = req.params;
  if (!isValidNumericId(id)) return res.status(400).json({ error: 'Invalid movie ID' });

  const data = await fetchTMDB(`/movie/${id}`, {
    append_to_response: 'videos,credits,recommendations',
  });
  sendTMDBDetail(res, data, 'Movie not found');
});

// 7. GET /api/movies/tv/details/:id
router.get('/tv/details/:id', async (req, res) => {
  const { id } = req.params;
  if (!isValidNumericId(id)) return res.status(400).json({ error: 'Invalid series ID' });

  const data = await fetchTMDB(`/tv/${id}`, {
    append_to_response: 'videos,credits,recommendations',
  });
  sendTMDBDetail(res, data, 'TV Series not found');
});

// 8. GET /api/movies/tv/:id/season/:seasonNumber
router.get('/tv/:id/season/:seasonNumber', async (req, res) => {
  const { id, seasonNumber } = req.params;
  if (!isValidNumericId(id) || !isValidNumericId(seasonNumber)) {
    return res.status(400).json({ error: 'Invalid series ID or season number' });
  }

  const data = await fetchTMDB(`/tv/${id}/season/${seasonNumber}`);
  sendTMDBDetail(res, data, 'Season not found');
});

// 9. GET /api/movies/search
router.get('/search', async (req, res) => {
  if (!validatePage(req, res)) return;
  const { query, page = 1 } = req.query;
  const clean = String(query || '').trim().slice(0, 100);
  if (!clean) return res.json({ results: [] });

  const safePage = Math.min(Math.max(1, Number(page) || 1), 50);
  const data = await fetchTMDB('/search/multi', { query: clean, page: safePage });
  sendTMDBResults(res, data);
});

export default router;
