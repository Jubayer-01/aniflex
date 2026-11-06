import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Fallback movie list for graceful offline degradation
export const FALLBACK_MOVIES = [
  {
    id: 969681,
    title: 'The Odyssey',
    overview: 'After a decade of battle, a Greek king embarks on a perilous voyage home.',
    poster_path: '/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
    backdrop_path: '/zOpe0eHbgF3pr5NGaswhR48b6p0.jpg',
    vote_average: 8.5,
    release_date: '2025-05-15',
    media_type: 'movie',
  },
  {
    id: 533535,
    title: 'Deadpool & Wolverine',
    overview: 'A listless Wade Wilson toils away in civilian life with his days as Deadpool behind him.',
    poster_path: '/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
    backdrop_path: '/yDHYTfA3R0jFYba16jBB1jv8AmC.jpg',
    vote_average: 7.7,
    release_date: '2024-07-24',
    media_type: 'movie',
  },
  {
    id: 1022789,
    title: 'Inside Out 2',
    overview: "Teenager Riley's mind headquarters undergoes a sudden demolition for new Emotions.",
    poster_path: '/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
    backdrop_path: '/stKGOmPAhuQv11N40Xmiz6o9T5.jpg',
    vote_average: 7.6,
    release_date: '2024-06-11',
    media_type: 'movie',
  },
];

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
