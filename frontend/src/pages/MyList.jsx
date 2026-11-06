import React, { useState, useEffect } from 'react';
import { Bookmark, Trash2, Play, History, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AnimeCard from '../components/AnimeCard';
import ContinueWatchingRow from '../components/ContinueWatchingRow';
import { getWatchHistory } from '../services/watchHistoryService';

export default function MyList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('saved'); // 'saved' | 'history'
  const [historyList, setHistoryList] = useState(() => getWatchHistory());

  useEffect(() => {
    const handleUpdate = () => setHistoryList(getWatchHistory());
    window.addEventListener('aniflex:watchHistoryUpdate', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('aniflex:watchHistoryUpdate', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // User watchlist loaded from localStorage (clean initial state)
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const stored = localStorage.getItem('aniflex_watchlist');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const handleRemove = (id) => {
    setWatchlist((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem('aniflex_watchlist', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-[#060709] text-white pt-24 pb-16 px-4 sm:px-6 md:px-10 lg:px-12 w-full space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
            <span>My Library</span>
            <Bookmark className="w-6 h-6 text-[#94A3B8] fill-[#94A3B8]" />
          </h1>
          <p className="text-sm text-[#AAA2B7] mt-1">
            Manage your personal watchlist and viewing progress.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 bg-[#111318] p-1.5 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'saved'
                ? 'bg-[#E2E8F0] text-black shadow-sm'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Watchlist ({watchlist.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-[#E2E8F0] text-black shadow-sm'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Watch History</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'saved' ? (
        watchlist.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-4 sm:gap-6">
            {watchlist.map((anime) => (
              <div key={anime.id} className="relative group">
                <AnimeCard
                  anime={anime}
                  className="w-full"
                  onClick={() => navigate(`/watch/${anime.id}`)}
                  onPlay={() => navigate(`/watch/${anime.id}`)}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(anime.id);
                  }}
                  className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  title="Remove from list"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center space-y-3">
            <Bookmark className="w-12 h-12 text-[#AAA2B7]/40 mx-auto" />
            <h3 className="text-lg font-bold text-white">Your watchlist is empty</h3>
            <p className="text-xs text-[#AAA2B7]">Save anime by clicking the bookmark icon while browsing.</p>
            <button
              onClick={() => navigate('/')}
              className="mt-2 bg-[#E2E8F0] hover:bg-white text-black px-5 py-2.5 rounded-xl font-bold text-xs"
            >
              Browse Anime
            </button>
          </div>
        )
      ) : historyList.length > 0 ? (
        <div className="space-y-6">
          <ContinueWatchingRow items={historyList} />
        </div>
      ) : (
        <div className="py-20 text-center space-y-3 bg-[#111318] rounded-3xl border border-white/5 p-8 max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-[#15171E] border border-white/10 flex items-center justify-center mx-auto text-[#94A3B8] shadow-xl">
            <History className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">No Watch History Yet</h3>
          <p className="text-xs text-[#AAA2B7] max-w-sm mx-auto">
            Anime you watch will automatically be listed here so you can easily resume any episode.
          </p>
          <button
            onClick={() => navigate('/explore')}
            className="mt-2 bg-[#E2E8F0] hover:bg-white text-black px-5 py-2.5 rounded-xl font-bold text-xs transition-transform active:scale-95 shadow-none"
          >
            Browse Catalog
          </button>
        </div>
      )}
    </div>
  );
}

