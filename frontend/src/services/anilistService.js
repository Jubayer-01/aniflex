import axios from 'axios';

const ANILIST_API_URL = 'https://graphql.anilist.co';
const HOME_CACHE_KEY = 'aniflex_home_cache_v2';
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes cache

// GraphQL query helper with timeout and safe error handling
async function fetchGraphQL(query, variables = {}) {
  try {
    const response = await axios.post(
      ANILIST_API_URL,
      { query, variables },
      { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, timeout: 6000 }
    );
    return response.data?.data;
  } catch (error) {
    if (error.response?.status === 429) {
      console.warn('AniList API rate limit reached (429). Serving from cache/fallback.');
    } else {
      console.warn('AniList network issue:', error.message);
    }
    return null;
  }
}

// Reliable fallback data using official AniList CDN images (never 403 or broken)
export const FALLBACK_HERO = {
  id: 101922,
  title: {
    english: "Demon Slayer: Kimetsu no Yaiba",
    romaji: "Kimetsu no Yaiba",
  },
  bannerImage: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/101922-YfZhKXRfkWtd.jpg",
  coverImage: {
    extraLarge: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-WBsBl0ClmgLd.jpg",
    large: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-WBsBl0ClmgLd.jpg",
  },
  year: 2023,
  seasons: 4,
  rating: "PG-13",
  score: 9.2,
  description: "A family is attacked by demons and only two members survive - Tanjiro and his sister Nezuko, who is turned into a demon slowly. Tanjiro sets out to become a demon slayer to avenge his family and cure his sister.",
  genres: ["Action", "Fantasy", "Supernatural"],
};

export const FALLBACK_CONTINUE_WATCHING = [
  {
    id: 113415,
    title: "Jujutsu Kaisen",
    episode: "Ep. 12",
    progress: 60,
    banner: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/113415-jQBSkxWAAk83.jpg",
  },
  {
    id: 16498,
    title: "Attack on Titan",
    episode: "Ep. 8",
    progress: 40,
    banner: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498-8jpFCOcDmnei.jpg",
  },
  {
    id: 151807,
    title: "Solo Leveling",
    episode: "Ep. 6",
    progress: 70,
    banner: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/151807-3flSI9yCmsr7.jpg",
  },
  {
    id: 21,
    title: "One Piece",
    episode: "Ep. 1021",
    progress: 30,
    banner: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/21-447543.jpg",
  },
];

// Curated solid fallback dataset for all shelves if user is offline or rate limited
export const FALLBACK_CATALOG = [
  {
    id: 101922,
    title: { english: "Demon Slayer: Kimetsu no Yaiba", romaji: "Kimetsu no Yaiba" },
    coverImage: { large: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-WBsBl0ClmgLd.jpg" },
    seasonYear: 2019,
    averageScore: 92,
    genres: ["Action", "Fantasy"]
  },
  {
    id: 113415,
    title: { english: "Jujutsu Kaisen", romaji: "Jujutsu Kaisen" },
    coverImage: { large: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-bbBWj4pEFseh.jpg" },
    seasonYear: 2020,
    averageScore: 87,
    genres: ["Action", "Supernatural"]
  },
  {
    id: 16498,
    title: { english: "Attack on Titan", romaji: "Shingeki no Kyojin" },
    coverImage: { large: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-C6FPmWm59CyP.jpg" },
    seasonYear: 2013,
    averageScore: 90,
    genres: ["Action", "Drama"]
  },
  {
    id: 151807,
    title: { english: "Solo Leveling", romaji: "Ore dake Level Up na Ken" },
    coverImage: { large: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx151807-3FL2e5L15f5F.jpg" },
    seasonYear: 2024,
    averageScore: 86,
    genres: ["Action", "Fantasy"]
  },
  {
    id: 21,
    title: { english: "One Piece", romaji: "ONE PIECE" },
    coverImage: { large: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21-6D5twZcrrq48.jpg" },
    seasonYear: 1999,
    averageScore: 89,
    genres: ["Action", "Adventure"]
  },
  {
    id: 140960,
    title: { english: "Spy x Family", romaji: "SPY×FAMILY" },
    coverImage: { large: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx140960-YrkHG4UnDQfH.jpg" },
    seasonYear: 2022,
    averageScore: 85,
    genres: ["Comedy", "Action"]
  },
  {
    id: 127230,
    title: { english: "Chainsaw Man", romaji: "Chainsaw Man" },
    coverImage: { large: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx127230-NuEagrfSR9eL.png" },
    seasonYear: 2022,
    averageScore: 85,
    genres: ["Action", "Supernatural"]
  },
  {
    id: 20464,
    title: { english: "Haikyu!!", romaji: "Haikyuu!!" },
    coverImage: { large: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx20464-eW7fqm18D2F8.jpg" },
    seasonYear: 2014,
    averageScore: 88,
    genres: ["Sports", "Drama"]
  }
];

const ANIME_MEDIA_FRAGMENT = `
  id
  title {
    romaji
    english
    native
  }
  description(asHtml: false)
  bannerImage
  coverImage {
    large
    extraLarge
    medium
    color
  }
  format
  episodes
  status
  seasonYear
  averageScore
  genres
  studios(isMain: true) {
    nodes {
      name
    }
  }
`;

/**
 * Single Batched Query for the entire homepage:
 * Replaces 6 separate requests with 1 single call.
 * Saves results to localStorage cache so reloads are instant (0ms) and never hit rate limits.
 */
export async function getHomePageCatalog(force = false) {
  // 1. Check local cache first (unless force refresh requested)
  if (!force) {
    try {
      const cached = localStorage.getItem(HOME_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS && parsed.data) {
          return parsed.data;
        }
      }
    } catch (e) {
      console.warn('Cache read error:', e);
    }
  }

  // 2. Batched GraphQL Query (Single HTTP Request)
  const batchQuery = `
    query {
      trending: Page(page: 1, perPage: 12) {
        media(type: ANIME, sort: TRENDING_DESC, isAdult: false) { ${ANIME_MEDIA_FRAGMENT} }
      }
      popular: Page(page: 1, perPage: 12) {
        media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) { ${ANIME_MEDIA_FRAGMENT} }
      }
      action: Page(page: 1, perPage: 12) {
        media(type: ANIME, genre: "Action", sort: POPULARITY_DESC, isAdult: false) { ${ANIME_MEDIA_FRAGMENT} }
      }
      romance: Page(page: 1, perPage: 12) {
        media(type: ANIME, genre: "Romance", sort: POPULARITY_DESC, isAdult: false) { ${ANIME_MEDIA_FRAGMENT} }
      }
      movies: Page(page: 1, perPage: 12) {
        media(type: ANIME, format: MOVIE, sort: POPULARITY_DESC, isAdult: false) { ${ANIME_MEDIA_FRAGMENT} }
      }
      recent: Page(page: 1, perPage: 12) {
        media(type: ANIME, sort: START_DATE_DESC, isAdult: false) { ${ANIME_MEDIA_FRAGMENT} }
      }
    }
  `;

  const result = await fetchGraphQL(batchQuery);

  if (result) {
    const catalogData = {
      trending: result.trending?.media || FALLBACK_CATALOG,
      popular: result.popular?.media || FALLBACK_CATALOG,
      action: result.action?.media || FALLBACK_CATALOG,
      romance: result.romance?.media || FALLBACK_CATALOG,
      movies: result.movies?.media || FALLBACK_CATALOG,
      recent: result.recent?.media || FALLBACK_CATALOG,
    };

    // Register all home catalog anime into master search index
    registerAnimeToIndex(Object.values(catalogData).flat());

    // Save to cache
    try {
      localStorage.setItem(HOME_CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: catalogData,
      }));
    } catch (e) {}

    return catalogData;
  }

  // 3. Fallback: If network failed or 429 rate limit hit, check expired cache or return solid fallbacks
  try {
    const cached = localStorage.getItem(HOME_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.data) return parsed.data;
    }
  } catch (e) {}

  return {
    trending: FALLBACK_CATALOG,
    popular: FALLBACK_CATALOG,
    action: FALLBACK_CATALOG,
    romance: FALLBACK_CATALOG,
    movies: FALLBACK_CATALOG,
    recent: FALLBACK_CATALOG,
  };
}

// In-memory search cache and master anime index for instant alphabet matching
const searchCache = new Map();
let masterAnimeIndex = new Map();

// Seed master index with fallbacks
FALLBACK_CATALOG.forEach((item) => {
  if (item && item.id) masterAnimeIndex.set(item.id, item);
});

export function registerAnimeToIndex(animeList) {
  if (!Array.isArray(animeList)) return;
  animeList.forEach((item) => {
    if (item && item.id && !masterAnimeIndex.has(item.id)) {
      masterAnimeIndex.set(item.id, item);
    }
  });
}

export function getLocalCatalogMatches(queryStr) {
  const q = queryStr.toLowerCase().trim();
  if (!q) return [];

  // Also collect from localStorage cache if available
  try {
    const cached = localStorage.getItem(HOME_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      const data = parsed.data || {};
      const all = [
        ...(data.trending || []),
        ...(data.popular || []),
        ...(data.action || []),
        ...(data.romance || []),
        ...(data.movies || []),
        ...(data.recent || [])
      ];
      all.forEach((item) => {
        if (item && item.id && !masterAnimeIndex.has(item.id)) {
          masterAnimeIndex.set(item.id, item);
        }
      });
    }
  } catch (e) {}

  const scored = [];
  for (const anime of masterAnimeIndex.values()) {
    const en = (anime.title?.english || '').toLowerCase();
    const ro = (anime.title?.romaji || '').toLowerCase();

    let score = 0;
    if (en.startsWith(q) || ro.startsWith(q)) {
      score = 100;
    } else if (en.split(' ').some((w) => w.startsWith(q)) || ro.split(' ').some((w) => w.startsWith(q))) {
      score = 75;
    } else if (en.includes(q) || ro.includes(q)) {
      score = 50;
    }

    if (score > 0) {
      scored.push({ anime, score, popularity: anime.averageScore || 0 });
    }
  }

  scored.sort((a, b) => b.score - a.score || b.popularity - a.popularity);
  return scored.map((s) => s.anime);
}

export async function instantAlphabetSearch(queryStr, perPage = 24) {
  const clean = (queryStr || '').trim();
  if (!clean) return [];

  // 1. Instant local alphabet match (<5ms)
  const localResults = getLocalCatalogMatches(clean);

  // 2. Query remote AniList in parallel for full catalog breadth
  try {
    const remoteResults = await searchAnime(clean, null, 'SEARCH_MATCH', perPage);
    if (Array.isArray(remoteResults) && remoteResults.length > 0) {
      registerAnimeToIndex(remoteResults);

      // Merge remote and local without duplicates
      const seen = new Set();
      const merged = [];

      // Add local prefix matches first for best responsiveness
      localResults.forEach((item) => {
        if (item && !seen.has(item.id)) {
          seen.add(item.id);
          merged.push(item);
        }
      });

      // Append remote matches
      remoteResults.forEach((item) => {
        if (item && !seen.has(item.id)) {
          seen.add(item.id);
          merged.push(item);
        }
      });

      return merged.slice(0, perPage);
    }
  } catch (err) {
    console.warn('Remote search error:', err.message);
  }

  return localResults.slice(0, perPage);
}

export async function searchAnime(
  searchOrOptions,
  genreArg,
  sortArg = "POPULARITY_DESC",
  perPageArg = 24,
  pageArg = 1
) {
  // Support both object and positional arguments
  const options = (typeof searchOrOptions === 'object' && searchOrOptions !== null)
    ? searchOrOptions
    : {
        search: searchOrOptions,
        genre: genreArg,
        sort: sortArg,
        perPage: perPageArg,
        page: pageArg,
      };

  const cleanSearch = options.search ? options.search.trim() : null;
  const cleanGenre = options.genre && options.genre !== 'All' ? options.genre.trim() : null;
  const cleanFormat = options.format && options.format !== 'All' ? options.format.toUpperCase().trim() : null;
  const cleanStatus = options.status && options.status !== 'All' ? options.status.toUpperCase().trim() : null;
  const cleanYear = options.year ? Number(options.year) : (options.seasonYear ? Number(options.seasonYear) : null);
  const minScore = options.minScore ? Number(options.minScore) : null;
  const sort = options.sort || 'POPULARITY_DESC';
  const perPage = options.perPage || 24;
  const page = options.page || 1;

  // When searching by title text, SEARCH_MATCH prioritizes exact relevance over sheer historical popularity
  const effectiveSort = cleanSearch && sort === 'POPULARITY_DESC' ? 'SEARCH_MATCH' : sort;

  const cacheKey = `${cleanSearch || ''}|${cleanGenre || ''}|${cleanFormat || ''}|${cleanStatus || ''}|${cleanYear || ''}|${minScore || ''}|${effectiveSort}|${perPage}|${page}`;
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }

  const query = `
    query (
      $search: String,
      $genre: String,
      $format: MediaFormat,
      $status: MediaStatus,
      $seasonYear: Int,
      $averageScore_greater: Int,
      $sort: [MediaSort],
      $perPage: Int,
      $page: Int
    ) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          hasNextPage
        }
        media(
          type: ANIME,
          search: $search,
          genre: $genre,
          format: $format,
          status: $status,
          seasonYear: $seasonYear,
          averageScore_greater: $averageScore_greater,
          sort: $sort,
          isAdult: false
        ) {
          ${ANIME_MEDIA_FRAGMENT}
        }
      }
    }
  `;

  const variables = {
    search: cleanSearch || undefined,
    genre: cleanGenre || undefined,
    format: cleanFormat || undefined,
    status: cleanStatus || undefined,
    seasonYear: cleanYear || undefined,
    averageScore_greater: minScore || undefined,
    sort: [effectiveSort],
    perPage,
    page
  };

  const data = await fetchGraphQL(query, variables);
  const mediaList = data?.Page?.media;

  if (Array.isArray(mediaList)) {
    // Cache up to 100 recent searches
    if (searchCache.size > 100) searchCache.clear();
    searchCache.set(cacheKey, mediaList);
    return mediaList;
  }

  // If search query was provided and API had an issue, fallback to matching items from cached catalog (never return unrelated dummy catalog)
  if (cleanSearch) {
    const localMatches = getLocalCatalogMatches(cleanSearch);
    return localMatches.length > 0 ? localMatches : [];
  }

  // Only return fallback catalog if user is browsing general catalog without query
  return page === 1 && !cleanGenre && !cleanFormat && !cleanStatus ? FALLBACK_CATALOG : [];
}

export async function getAnimeDetails(id) {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        ${ANIME_MEDIA_FRAGMENT}
        trailer {
          id
          site
        }
        nextAiringEpisode {
          episode
        }
        relations {
          edges {
            relationType
            node {
              id
              title {
                romaji
                english
              }
              format
              episodes
              status
              seasonYear
              coverImage {
                large
              }
            }
          }
        }
        recommendations(perPage: 8, sort: RATING_DESC) {
          nodes {
            mediaRecommendation {
              ${ANIME_MEDIA_FRAGMENT}
            }
          }
        }
      }
    }
  `;
  const data = await fetchGraphQL(query, { id: Number(id) });
  return data?.Media || null;
}
