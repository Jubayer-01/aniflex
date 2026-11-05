// Service to track, persist, and resume anime watch progress per authenticated user or guest

export function getCurrentWatchHistoryKey() {
  try {
    const rawUser = localStorage.getItem('aniflex_user');
    if (rawUser) {
      const user = JSON.parse(rawUser);
      if (user?.id) return `aniflex_history_user_${user.id}`;
    }
  } catch (e) {}
  return 'aniflex_history_guest';
}

// Clean up any legacy mock keys from early prototypes
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('aniflex_watch_history_v1');
    localStorage.removeItem('aniflex_watch_history_v2');
    localStorage.removeItem('aniflex_continue_watching');
  } catch (e) {}
}

export function getWatchHistory() {
  try {
    const key = getCurrentWatchHistoryKey();
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse watch history:', err);
  }
  return [];
}

export function getLastWatchedEpisode(animeId) {
  if (!animeId) return null;
  const history = getWatchHistory();
  const found = history.find((item) => Number(item.id) === Number(animeId));
  return found?.episodeNumber ? Number(found.episodeNumber) : null;
}

export function saveWatchProgress({
  id,
  title,
  episodeNumber = 1,
  totalEpisodes = 12,
  banner,
  cover,
  progressPercent = 15,
}) {
  if (!id) return;

  try {
    const key = getCurrentWatchHistoryKey();
    const numericId = Number(id);
    const epNum = Number(episodeNumber) || 1;
    const history = getWatchHistory();

    // Clean title
    const cleanTitle =
      typeof title === 'string'
        ? title
        : title?.english || title?.romaji || 'Anime';

    // Best working image fallback
    const resolvedBanner =
      banner || cover || 'https://images.alphacoders.com/131/1314905.jpeg';
    const resolvedCover =
      cover || banner || 'https://images.alphacoders.com/131/1314905.jpeg';

    const newItem = {
      id: numericId,
      title: cleanTitle,
      episode: `Ep. ${epNum}`,
      episodeNumber: epNum,
      totalEpisodes: Number(totalEpisodes) || 12,
      banner: resolvedBanner,
      cover: resolvedCover,
      progress: Math.min(100, Math.max(5, Math.round(progressPercent))),
      lastWatchedAt: Date.now(),
    };

    // Remove existing entry for this anime and prepend as most recent
    const filtered = history.filter((item) => Number(item.id) !== numericId);
    const updated = [newItem, ...filtered].slice(0, 30);

    localStorage.setItem(key, JSON.stringify(updated));

    // Dispatch custom event for real-time reactive UI update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('aniflex:watchHistoryUpdate', { detail: updated })
      );
    }
    return updated;
  } catch (err) {
    console.warn('Failed to save watch progress:', err);
  }
}

export function removeWatchHistoryItem(animeId) {
  try {
    const key = getCurrentWatchHistoryKey();
    const numericId = Number(animeId);
    const history = getWatchHistory();
    const updated = history.filter((item) => Number(item.id) !== numericId);
    localStorage.setItem(key, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('aniflex:watchHistoryUpdate', { detail: updated })
      );
    }
    return updated;
  } catch (err) {
    console.warn('Failed to remove watch history item:', err);
  }
}
