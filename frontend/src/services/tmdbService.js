import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://aniflex-production.up.railway.app/api';
const TMDB_DIRECT_KEY = import.meta.env.VITE_TMDB_API_KEY || '4c42c5afcf57e4950124a1c80a7d40a8';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
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

// Direct TMDB fallback fetcher when backend proxy is sleeping or unavailable
async function fetchDirectTMDB(endpoint, params = {}) {
  try {
    const res = await axios.get(`${TMDB_BASE_URL}${endpoint}`, {
      params: {
        api_key: TMDB_DIRECT_KEY,
        language: 'en-US',
        ...params,
      },
      timeout: 5000,
    });
    return res.data;
  } catch (err) {
    console.warn(`Direct TMDB fallback failed [${endpoint}]:`, err.message);
    return null;
  }
}

// Resilient fetch helper: tries production backend proxy first, seamlessly falls back to direct TMDB
async function fetchProxy(endpoint, directEndpoint, params = {}, directParams = null) {
  try {
    const response = await axios.get(`${API_BASE_URL}/movies${endpoint}`, {
      params,
      timeout: 4000,
    });
    if (response.data && (response.data.results || response.data.id || response.data.episodes)) {
      return response.data;
    }
  } catch (error) {
    // Backend proxy unavailable, cold-starting, or rate-limited; trigger direct TMDB fallback
    console.info(`Proxy unavailable for ${endpoint}, switching to direct TMDB connection...`);
  }

  // Layer 2: Direct TMDB Fallback
  const fallbackData = await fetchDirectTMDB(directEndpoint || endpoint, directParams || params);
  return fallbackData;
}

// 1. Trending All (Movies + TV) for Omni Home
export async function getTrendingAll() {
  const data = await fetchProxy('/trending', '/trending/all/day');
  return data?.results && data.results.length > 0 ? data.results : FALLBACK_MOVIES;
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
  return data?.results && data.results.length > 0 ? data.results : FALLBACK_MOVIES;
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
