import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://aniflex-production.up.railway.app/api';
const TMDB_DIRECT_KEY = import.meta.env.VITE_TMDB_API_KEY || '4c42c5afcf57e4950124a1c80a7d40a8';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// 1. High-Performance In-Memory + SessionStorage Cache (10-minute TTL)
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

function getCached(key) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.timestamp < CACHE_TTL_MS) {
    return hit.data;
  }
  try {
    const raw = sessionStorage.getItem(`tmdb_cache_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
        cache.set(key, parsed);
        return parsed.data;
      }
    }
  } catch {}
  return null;
}

function setCached(key, data) {
  if (!data) return;
  const entry = { data, timestamp: Date.now() };
  cache.set(key, entry);
  try {
    sessionStorage.setItem(`tmdb_cache_${key}`, JSON.stringify(entry));
  } catch {}
}

// 2. Optimized Image Helper: Defaults to w342 for cards, w1280 for banners (Zero 4K bandwidth waste)
export function getTMDBImageUrl(path, size = 'w342') {
  if (!path) return 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&auto=format&fit=crop&q=60';
  // Normalize 'original' to 'w1280' on mobile/tablets to prevent memory crashes
  const safeSize = size === 'original' && typeof window !== 'undefined' && window.innerWidth < 1920 ? 'w1280' : size;
  return `${IMAGE_BASE_URL}/${safeSize}${path}`;
}

// 3. Direct TMDB fetcher with 3-second timeout
async function fetchDirectTMDB(endpoint, params = {}) {
  try {
    const res = await axios.get(`${TMDB_BASE_URL}${endpoint}`, {
      params: {
        api_key: TMDB_DIRECT_KEY,
        language: 'en-US',
        ...params,
      },
      timeout: 3500,
    });
    return res.data;
  } catch (err) {
    console.warn(`Direct TMDB fallback warning [${endpoint}]:`, err.message);
    return null;
  }
}

// 4. Resilient & Cached fetch helper: 0ms cache hits -> fast proxy (2s timeout) -> direct TMDB
async function fetchProxy(endpoint, directEndpoint, params = {}, directParams = null) {
  const cacheKey = `${endpoint}_${JSON.stringify(params || {})}`;
  const hit = getCached(cacheKey);
  if (hit) return hit;

  let resultData = null;

  try {
    const response = await axios.get(`${API_BASE_URL}/movies${endpoint}`, {
      params,
      timeout: 2200, // Reduced from 4000ms to 2200ms to prevent lag on slow networks
    });
    if (response.data && (response.data.results || response.data.id || response.data.episodes)) {
      resultData = response.data;
    }
  } catch {
    // Fail fast to direct TMDB
  }

  if (!resultData) {
    resultData = await fetchDirectTMDB(directEndpoint || endpoint, directParams || params);
  }

  if (resultData) {
    setCached(cacheKey, resultData);
  }

  return resultData;
}

// 1. Trending All (Movies + TV) for Omni Home
export async function getTrendingAll() {
  const data = await fetchProxy('/trending', '/trending/all/day');
  return data?.results || [];
}

// 2. Hollywood Blockbuster Movies
export async function getHollywoodMovies(page = 1, genre = null) {
  const proxyParams = { page, genre };
  const directParams = {
    page,
    with_original_language: 'en',
    sort_by: 'popularity.desc',
  };
  if (genre) directParams.with_genres = genre;

  const data = await fetchProxy('/hollywood', '/discover/movie', proxyParams, directParams);
  return data?.results || [];
}

// 3. Bollywood Movies
export async function getBollywoodMovies(page = 1) {
  const proxyParams = { page };
  const directParams = {
    page,
    with_original_language: 'hi',
    sort_by: 'popularity.desc',
  };

  const data = await fetchProxy('/bollywood', '/discover/movie', proxyParams, directParams);
  return data?.results || [];
}

// 4. Global TV Series
export async function getPopularSeries(page = 1, genre = null) {
  const proxyParams = { page, genre };
  const directParams = {
    page,
    sort_by: 'popularity.desc',
  };
  if (genre) directParams.with_genres = genre;

  const data = await fetchProxy('/series', '/discover/tv', proxyParams, directParams);
  return data?.results || [];
}

// 5. KDrama & Asian Series
export async function getKDramas(page = 1) {
  const proxyParams = { page };
  const directParams = {
    page,
    with_original_language: 'ko',
    sort_by: 'popularity.desc',
  };

  const data = await fetchProxy('/kdramas', '/discover/tv', proxyParams, directParams);
  return data?.results || [];
}

// 6. Single Movie Details
export async function getMovieDetails(id) {
  return await fetchProxy(`/details/${id}`, `/movie/${id}`, {}, { append_to_response: 'videos,credits,recommendations' });
}

// 7. Single TV Series Details
export async function getTVDetails(id) {
  return await fetchProxy(`/tv/details/${id}`, `/tv/${id}`, {}, { append_to_response: 'videos,credits,recommendations' });
}

// 8. TV Season Details (Episode list)
export async function getTVSeason(id, seasonNumber = 1) {
  return await fetchProxy(`/tv/${id}/season/${seasonNumber}`, `/tv/${id}/season/${seasonNumber}`);
}

// Search Multi (Movies + TV)
export async function searchTMDB(query, page = 1) {
  if (!query) return [];
  const proxyParams = { query, page };
  const directParams = { query, page };
  const data = await fetchProxy('/search', '/search/multi', proxyParams, directParams);
  return data?.results || [];
}
