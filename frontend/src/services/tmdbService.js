import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://aniflex-production.up.railway.app/api';
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

// 2. Optimized Image Helper: Public CDN URLs (Zero API key required)
export function getTMDBImageUrl(path, size = 'w342') {
  if (!path) return 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&auto=format&fit=crop&q=60';
  const safeSize = size === 'original' && typeof window !== 'undefined' && window.innerWidth < 1920 ? 'w1280' : size;
  return `${IMAGE_BASE_URL}/${safeSize}${path}`;
}

// 3. Secure Backend Proxy Fetcher (TMDB Key is 100% hidden on server side)
async function fetchProxy(endpoint, params = {}) {
  const cacheKey = `${endpoint}_${JSON.stringify(params || {})}`;
  const hit = getCached(cacheKey);
  if (hit) return hit;

  try {
    const response = await axios.get(`${API_BASE_URL}/movies${endpoint}`, {
      params,
      timeout: 6000,
    });
    if (response.data && (response.data.results || response.data.id || response.data.episodes)) {
      setCached(cacheKey, response.data);
      return response.data;
    }
  } catch (error) {
    console.warn(`Backend Movies Proxy warning [${endpoint}]:`, error.message);
  }

  return null;
}

// 1. Trending All (Movies + TV) for Omni Home
export async function getTrendingAll() {
  const data = await fetchProxy('/trending');
  return data?.results || [];
}

// 2. Hollywood Blockbuster Movies
export async function getHollywoodMovies(page = 1, genre = null) {
  const params = { page };
  if (genre) params.genre = genre;
  const data = await fetchProxy('/hollywood', params);
  return data?.results || [];
}

// 3. Bollywood Movies
export async function getBollywoodMovies(page = 1) {
  const data = await fetchProxy('/bollywood', { page });
  return data?.results || [];
}

// 4. Global TV Series
export async function getPopularSeries(page = 1, genre = null) {
  const params = { page };
  if (genre) params.genre = genre;
  const data = await fetchProxy('/series', params);
  return data?.results || [];
}

// 5. KDrama & Asian Series
export async function getKDramas(page = 1) {
  const data = await fetchProxy('/kdramas', { page });
  return data?.results || [];
}

// 6. Single Movie Details
export async function getMovieDetails(id) {
  return await fetchProxy(`/details/${id}`);
}

// 7. Single TV Series Details
export async function getTVDetails(id) {
  return await fetchProxy(`/tv/details/${id}`);
}

// 8. TV Season Details (Episode list)
export async function getTVSeason(id, seasonNumber = 1) {
  return await fetchProxy(`/tv/${id}/season/${seasonNumber}`);
}

// 9. Search Multi (Movies + TV)
export async function searchTMDB(query, page = 1) {
  if (!query) return [];
  const data = await fetchProxy('/search', { query, page });
  return data?.results || [];
}
