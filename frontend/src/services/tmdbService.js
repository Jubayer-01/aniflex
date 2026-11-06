import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// TMDB Image Helper (Images are hosted on public CDN, zero API key required)
export function getTMDBImageUrl(path, size = 'w500') {
  if (!path) return 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=60';
  return `${IMAGE_BASE_URL}/${size}${path}`;
}

// Reusable fetch helper calling our secure backend proxy
async function fetchProxy(endpoint, params = {}) {
  try {
    const response = await axios.get(`${API_BASE_URL}/movies${endpoint}`, {
      params,
      timeout: 8000,
    });
    return response.data;
  } catch (error) {
    console.warn(`Movie API proxy warning [${endpoint}]:`, error.message);
    return null;
  }
}

// 1. Trending All (Movies + TV) for Omni Home
export async function getTrendingAll() {
  const data = await fetchProxy('/trending');
  return data?.results || FALLBACK_MOVIES;
}

// 2. Hollywood Blockbuster Movies
export async function getHollywoodMovies(page = 1, genre = null) {
  const data = await fetchProxy('/hollywood', { page, genre });
  return data?.results || [];
}

// 3. Bollywood Movies
export async function getBollywoodMovies(page = 1) {
  const data = await fetchProxy('/bollywood', { page });
  return data?.results || [];
}

// 4. Global TV Series
export async function getPopularSeries(page = 1, genre = null) {
  const data = await fetchProxy('/series', { page, genre });
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

// Search Multi (Movies + TV)
export async function searchTMDB(query, page = 1) {
  if (!query) return [];
  const data = await fetchProxy('/search', { query, page });
  return data?.results || [];
}
