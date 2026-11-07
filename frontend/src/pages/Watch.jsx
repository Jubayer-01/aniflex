import React from 'react';
import { useParams } from 'react-router-dom';
import WatchMovie from './watch/WatchMovie';
import WatchSeries from './watch/WatchSeries';
import WatchAnime from './watch/WatchAnime';

/**
 * Universal Watch Dispatcher
 * Routes cleanly to dedicated media player components:
 * - /watch/movie/:id -> WatchMovie
 * - /watch/tv/:id    -> WatchSeries
 * - /watch/anime/:id -> WatchAnime
 * - /watch/:id       -> WatchAnime (fallback)
 */
export default function Watch() {
  const { type } = useParams();

  if (type === 'movie') {
    return <WatchMovie />;
  }

  if (type === 'tv') {
    return <WatchSeries />;
  }

  return <WatchAnime />;
}
