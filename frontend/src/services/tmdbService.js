import axios from 'axios';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '4e44d9029b1270a757cddc766a1bcb63';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// TMDB Image Helper
export function getTMDBImageUrl(path, size = 'w500') {
  if (!path) return 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=60';
  return `${IMAGE_BASE_URL}/${size}${path}`;
}

// Reusable TMDB fetch helper with error handling
async function fetchTMDB(endpoint, params = {}) {
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'en-US',
        ...params,
      },
      timeout: 7000,
    });
    return response.data;
  } catch (error) {
    console.warn(`TMDB API call failed [${endpoint}]:`, error.message);
    return null;
  }
}

// 1. Trending All (Movies + TV) for Omni Home
export async function getTrendingAll() {
  const data = await fetchTMDB('/trending/all/day');
  return data?.results || FALLBACK_MOVIES;
}

// 2. Hollywood Blockbuster Movies
export async function getHollywoodMovies(page = 1, genre = null) {
  const params = {
    page,
    with_original_language: 'en',
    sort_by: 'popularity.desc',
  };
  if (genre) params.with_genres = genre;
  const data = await fetchTMDB('/discover/movie', params);
  return data?.results || [];
}

// 3. Bollywood Movies
export async function getBollywoodMovies(page = 1) {
  const data = await fetchTMDB('/discover/movie', {
    page,
    with_original_language: 'hi',
    sort_by: 'popularity.desc',
  });
  return data?.results || [];
}

// 4. Global TV Series
export async function getPopularSeries(page = 1, genre = null) {
  const params = {
    page,
    sort_by: 'popularity.desc',
  };
  if (genre) params.with_genres = genre;
  const data = await fetchTMDB('/discover/tv', params);
  return data?.results || [];
}

// 5. KDrama & Asian Series
export async function getKDramas(page = 1) {
  const data = await fetchTMDB('/discover/tv', {
    page,
    with_original_language: 'ko',
    sort_by: 'popularity.desc',
  });
  return data?.results || [];
}

// 6. Single Movie Details
export async function getMovieDetails(id) {
  return await fetchTMDB(`/movie/${id}`, {
    append_to_response: 'videos,credits,recommendations',
  });
}

// 7. Single TV Series Details
export async function getTVDetails(id) {
  return await fetchTMDB(`/tv/${id}`, {
    append_to_response: 'videos,credits,recommendations',
  });
}

// 8. TV Season Details (Episode list)
export async function getTVSeason(id, seasonNumber = 1) {
  return await fetchTMDB(`/tv/${id}/season/${seasonNumber}`);
}

// Search Multi (Movies + TV)
export async function searchTMDB(query, page = 1) {
  if (!query) return [];
  const data = await fetchTMDB('/search/multi', { query, page });
  return data?.results || [];
}

// Reliable Fallback Data
export const FALLBACK_MOVIES = [
  {
    id: 969681,
    title: 'Spider-Man: Brand New Day',
    overview: 'Fighting crime in a world that forgot Peter Parker, Spider-Man faces a hidden cosmic adversary.',
    backdrop_path: '/dzeCorl61ZdxbzfnciUkrc8JSZj.jpg',
    poster_path: '/bjiS5ipwxb9JFy3XRRN4OAilSeX.jpg',
    vote_average: 8.5,
    release_date: '2026',
    media_type: 'movie',
  },
  {
    id: 656908,
    title: 'Ramayana: Rise of a Legend',
    overview: 'An ancient epic follows Rama and Sita whose journey of destiny and virtue sets the stage for a cinematic showdown.',
    backdrop_path: '/yHVZncPRZr63mezRX20IyKLrSkv.jpg',
    poster_path: '/hz2Hv8tPToHvQ7HaxzqeLvahmcJ.jpg',
    vote_average: 8.2,
    release_date: '2026',
    media_type: 'movie',
  },
];
