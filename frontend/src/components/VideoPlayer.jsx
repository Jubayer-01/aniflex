import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipForward, SkipBack, Settings, Subtitles, HelpCircle,
  Gauge, Check, X, RotateCcw, FastForward, Rewind
} from 'lucide-react';
import { historyAPI } from '../services/api';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SUBTITLES = [
  { id: 'off', label: 'Off' },
  { id: 'en', label: 'English [CC]' },
  { id: 'ja', label: 'Japanese' },
  { id: 'es', label: 'Spanish' },
];

export default function VideoPlayer({
  src,
  poster,
  title,
  episodeTitle,
  onNextEpisode,
  onPrevEpisode,
  hasNext = true,
  hasPrev = false,
  animeId,
  episodeNum = 1
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const autoNextTimerRef = useRef(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Settings & Enhancements
  const [qualities, setQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState(-1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [activeSubtitle, setActiveSubtitle] = useState('en');
  const [menuOpen, setMenuOpen] = useState(null); // 'settings' | 'subtitles' | 'shortcuts' | null

  // Keyboard shortcut toast / feedback
  const [hudFeedback, setHudFeedback] = useState(null);
  const hudTimeoutRef = useRef(null);

  // Auto-next countdown state
  const [autoNextCountdown, setAutoNextCountdown] = useState(null); // number or null

  const videoSource = src || '';

  const triggerHud = (message) => {
    setHudFeedback(message);
    clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => setHudFeedback(null), 1200);
  };

  // Initialize Video / HLS with on-demand dynamic chunk loading
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hlsInstance = null;
    let isDisposed = false;

    // Reset countdown
    setAutoNextCountdown(null);
    clearInterval(autoNextTimerRef.current);

    // Load saved timestamp
    const savedTime = localStorage.getItem(`aniflex_prog_${animeId}_ep_${episodeNum}`);
    if (savedTime && !isNaN(savedTime)) {
      video.currentTime = parseFloat(savedTime);
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = videoSource;
    } else {
      // Lazy load hls.js on demand to reduce initial Watch bundle by ~200 KB
      import('hls.js').then(({ default: Hls }) => {
        if (isDisposed || !Hls.isSupported()) return;

        hlsInstance = new Hls({ enableWorker: true });
        hlsRef.current = hlsInstance;
        hlsInstance.loadSource(videoSource);
        hlsInstance.attachMedia(video);

        hlsInstance.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          const availableLevels = data.levels.map((lvl, index) => ({
            id: index,
            height: lvl.height,
            bitrate: lvl.bitrate
          }));
          setQualities(availableLevels);
        });
      }).catch((err) => {
        console.warn('HLS lazy load error:', err);
      });
    }

    return () => {
      isDisposed = true;
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, [videoSource, animeId, episodeNum]);

  // Handle Progress & Backend Sync
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const total = videoRef.current.duration || 0;
    setCurrentTime(current);
    setDuration(total);

    if (total > 0) {
      setProgress((current / total) * 100);

      // Save every 8 seconds
      if (Math.floor(current) % 8 === 0 && animeId) {
        localStorage.setItem(`aniflex_prog_${animeId}_ep_${episodeNum}`, current.toString());
        // Sync to backend if logged in
        if (localStorage.getItem('aniflex_token')) {
          historyAPI.saveProgress(episodeNum, current, total, false).catch(() => {});
        }
      }
    }
  };

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      triggerHud('Paused');
    } else {
      videoRef.current.play();
      setIsPlaying(true);
      triggerHud('Playing');
    }
  }, [isPlaying]);

  const seekRelative = useCallback((seconds) => {
    if (!videoRef.current) return;
    const newTime = Math.min(Math.max(videoRef.current.currentTime + seconds, 0), duration || 999999);
    videoRef.current.currentTime = newTime;
    triggerHud(seconds > 0 ? `+${seconds}s` : `${seconds}s`);
  }, [duration]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      videoRef.current.volume = volume || 0.5;
      setIsMuted(false);
      triggerHud(`Volume: ${Math.round((volume || 0.5) * 100)}%`);
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
      triggerHud('Muted');
    }
  }, [isMuted, volume]);

  const adjustVolume = useCallback((delta) => {
    if (!videoRef.current) return;
    const newVol = Math.min(Math.max(volume + delta, 0), 1);
    setVolume(newVol);
    videoRef.current.volume = newVol;
    videoRef.current.muted = newVol === 0;
    setIsMuted(newVol === 0);
    triggerHud(`Volume: ${Math.round(newVol * 100)}%`);
  }, [volume]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
      triggerHud('Fullscreen');
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
      triggerHud('Exit Fullscreen');
    }
  }, []);

  const changeSpeed = (speed) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
      triggerHud(`Speed: ${speed}x`);
      setMenuOpen(null);
    }
  };

  const changeQuality = (levelIndex) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setCurrentQuality(levelIndex);
      triggerHud(levelIndex === -1 ? 'Quality: Auto' : `Quality: ${qualities[levelIndex]?.height}p`);
      setMenuOpen(null);
    }
  };

  // Auto-next episode countdown when video finishes
  const handleVideoEnded = () => {
    setIsPlaying(false);

    // Record completion to backend
    if (localStorage.getItem('aniflex_token')) {
      historyAPI.saveProgress(episodeNum, duration, duration, true).catch(() => {});
    }

    if (hasNext) {
      setAutoNextCountdown(5);
      clearInterval(autoNextTimerRef.current);

      autoNextTimerRef.current = setInterval(() => {
        setAutoNextCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(autoNextTimerRef.current);
            if (onNextEpisode) onNextEpisode();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const cancelAutoNext = () => {
    clearInterval(autoNextTimerRef.current);
    setAutoNextCountdown(null);
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          seekRelative(10);
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          seekRelative(-10);
          break;
        case 'arrowup':
          e.preventDefault();
          adjustVolume(0.1);
          break;
        case 'arrowdown':
          e.preventDefault();
          adjustVolume(-0.1);
          break;
        case 'n':
          e.preventDefault();
          if (hasNext && onNextEpisode) onNextEpisode();
          break;
        case 'p':
          e.preventDefault();
          if (hasPrev && onPrevEpisode) onPrevEpisode();
          break;
        case 'c':
          e.preventDefault();
          setActiveSubtitle((prev) => (prev === 'off' ? 'en' : 'off'));
          triggerHud(activeSubtitle === 'off' ? 'Subtitles: English' : 'Subtitles: Off');
          break;
        case '?':
          e.preventDefault();
          setMenuOpen((prev) => (prev === 'shortcuts' ? null : 'shortcuts'));
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, toggleFullscreen, toggleMute, seekRelative, adjustVolume, hasNext, hasPrev, onNextEpisode, onPrevEpisode, activeSubtitle]);

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2800);
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    if (videoRef.current && duration > 0) {
      videoRef.current.currentTime = pos * duration;
      setProgress(pos * 100);
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden group select-none shadow-2xl border border-white/10"
    >
      <video
        ref={videoRef}
        poster={poster}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleVideoEnded}
        onClick={togglePlay}
        className="w-full h-full object-contain cursor-pointer"
        playsInline
      />

      {/* Top Overlay with Episode Title & Shortcut Helper */}
      <div
        className={`absolute top-0 left-0 right-0 p-5 bg-gradient-to-b from-black/85 via-black/40 to-transparent transition-opacity duration-300 flex items-center justify-between pointer-events-none ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div>
          <h3 className="text-white font-black text-base sm:text-lg drop-shadow">{title}</h3>
          {episodeTitle && <p className="text-xs text-[#94A3B8] font-medium">{episodeTitle}</p>}
        </div>

        <button
          onClick={() => setMenuOpen(menuOpen === 'shortcuts' ? null : 'shortcuts')}
          className="pointer-events-auto p-2 rounded-xl bg-white/10 hover:bg-white hover:text-black text-white flex items-center gap-1.5 text-xs font-bold transition-all backdrop-blur-md"
          title="Keyboard Shortcuts (?)"
        >
          <HelpCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Shortcuts</span>
        </button>
      </div>

      {/* Big Play/Pause Center Trigger */}
      {!isPlaying && autoNextCountdown === null && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[2px] cursor-pointer"
        >
          <div className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
            <Play className="w-9 h-9 fill-black translate-x-1" />
          </div>
        </div>
      )}

      {/* Quick HUD Overlay for Shortcuts Feedback */}
      {hudFeedback && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none bg-black/80 backdrop-blur-md border border-white/15 text-white font-bold text-sm sm:text-base px-5 py-2.5 rounded-2xl shadow-2xl animate-fade-in flex items-center gap-2">
          <span>{hudFeedback}</span>
        </div>
      )}

      {/* Netflix-Style Auto-Next Countdown Card */}
      {autoNextCountdown !== null && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111318] border border-white/15 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <h4 className="text-sm font-bold text-[#AAA2B7] uppercase tracking-wider">Up Next</h4>
            <h3 className="text-xl font-black text-white">Episode {Number(episodeNum) + 1}</h3>
            <p className="text-xs text-gray-300">Starting in <strong className="text-white text-base">{autoNextCountdown}s</strong></p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  cancelAutoNext();
                  if (onNextEpisode) onNextEpisode();
                }}
                className="flex-1 py-3 bg-[#E2E8F0] hover:bg-white text-black font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-black text-black" /> Play Now
              </button>
              <button
                onClick={cancelAutoNext}
                className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Dialog */}
      {menuOpen === 'shortcuts' && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111318] border border-white/15 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#94A3B8]" /> Keyboard Shortcuts
              </h4>
              <button onClick={() => setMenuOpen(null)} className="text-[#AAA2B7] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#191621]">
                <span className="text-[#AAA2B7]">Play / Pause</span>
                <kbd className="bg-white/10 px-2 py-0.5 rounded text-white font-mono">Space / K</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#191621]">
                <span className="text-[#AAA2B7]">Fullscreen</span>
                <kbd className="bg-white/10 px-2 py-0.5 rounded text-white font-mono">F</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#191621]">
                <span className="text-[#AAA2B7]">Mute Audio</span>
                <kbd className="bg-white/10 px-2 py-0.5 rounded text-white font-mono">M</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#191621]">
                <span className="text-[#AAA2B7]">Seek -10s / +10s</span>
                <kbd className="bg-white/10 px-2 py-0.5 rounded text-white font-mono">← / →</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#191621]">
                <span className="text-[#AAA2B7]">Volume Up/Down</span>
                <kbd className="bg-white/10 px-2 py-0.5 rounded text-white font-mono">↑ / ↓</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#191621]">
                <span className="text-[#AAA2B7]">Subtitles</span>
                <kbd className="bg-white/10 px-2 py-0.5 rounded text-white font-mono">C</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#191621]">
                <span className="text-[#AAA2B7]">Next Episode</span>
                <kbd className="bg-white/10 px-2 py-0.5 rounded text-white font-mono">N</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#191621]">
                <span className="text-[#AAA2B7]">Previous Ep</span>
                <kbd className="bg-white/10 px-2 py-0.5 rounded text-white font-mono">P</kbd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress Seeker */}
        <div
          onClick={handleSeek}
          className="relative w-full h-2 bg-white/20 hover:h-3 rounded-full cursor-pointer transition-all mb-4 group/seeker"
        >
          <div
            className="absolute top-0 left-0 h-full bg-[#CBD5E1] rounded-full"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md scale-0 group-hover/seeker:scale-100 transition-transform -translate-x-2"
            style={{ left: `${progress}%` }}
          />
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between text-white text-xs sm:text-sm">
          {/* Left Controls: Play, Prev, Next, Volume, Time */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={togglePlay}
              className="hover:text-white transition-colors"
              title="Play/Pause (Space)"
            >
              {isPlaying ? <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-current" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />}
            </button>

            <button
              onClick={onPrevEpisode}
              disabled={!hasPrev}
              className={`hover:text-white transition-colors ${!hasPrev ? 'opacity-30 cursor-not-allowed' : ''}`}
              title="Previous Episode (P)"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={onNextEpisode}
              disabled={!hasNext}
              className={`hover:text-white transition-colors ${!hasNext ? 'opacity-30 cursor-not-allowed' : ''}`}
              title="Next Episode (N)"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2 group/vol">
              <button onClick={toggleMute} className="hover:text-white transition-colors" title="Mute (M)">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  if (videoRef.current) {
                    videoRef.current.volume = val;
                    videoRef.current.muted = val === 0;
                    setIsMuted(val === 0);
                  }
                }}
                className="w-16 sm:w-24 h-1 bg-white/30 accent-[#E2E8F0] rounded-full cursor-pointer"
              />
            </div>

            <span className="text-xs text-gray-300 font-mono hidden sm:inline">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right Controls: Subtitles, Settings (Speed & Quality), Fullscreen */}
          <div className="flex items-center gap-3 sm:gap-4 relative">
            {/* Subtitles Button */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(menuOpen === 'subtitles' ? null : 'subtitles')}
                className={`p-1.5 rounded-lg transition-colors ${
                  activeSubtitle !== 'off' ? 'text-white bg-white/20' : 'text-gray-300 hover:text-white'
                }`}
                title="Subtitles (C)"
              >
                <Subtitles className="w-5 h-5" />
              </button>

              {menuOpen === 'subtitles' && (
                <div className="absolute bottom-10 right-0 w-40 bg-[#111318] border border-white/15 rounded-2xl p-2 shadow-2xl text-xs space-y-1 z-50">
                  <div className="text-[#AAA2B7] font-bold px-2 py-1 uppercase text-[10px]">
                    Subtitles
                  </div>
                  {SUBTITLES.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => {
                        setActiveSubtitle(sub.id);
                        triggerHud(`Subtitles: ${sub.label}`);
                        setMenuOpen(null);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl ${
                        activeSubtitle === sub.id ? 'bg-[#E2E8F0] text-black font-bold' : 'hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      <span>{sub.label}</span>
                      {activeSubtitle === sub.id && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Settings Menu: Playback Speed + Quality */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(menuOpen === 'settings' ? null : 'settings')}
                className={`p-1.5 rounded-lg transition-colors ${
                  menuOpen === 'settings' ? 'text-white bg-white/20' : 'text-gray-300 hover:text-white'
                }`}
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>

              {menuOpen === 'settings' && (
                <div className="absolute bottom-10 right-0 w-48 bg-[#111318] border border-white/15 rounded-2xl p-2.5 shadow-2xl text-xs space-y-3 z-50">
                  {/* Speed Selector */}
                  <div>
                    <div className="text-[#AAA2B7] font-bold px-1 mb-1 uppercase text-[10px] flex items-center gap-1">
                      <Gauge className="w-3 h-3" /> Playback Speed
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {SPEEDS.map((spd) => (
                        <button
                          key={spd}
                          onClick={() => changeSpeed(spd)}
                          className={`py-1 rounded-lg text-center font-semibold ${
                            playbackSpeed === spd ? 'bg-[#E2E8F0] text-black font-bold' : 'bg-white/5 hover:bg-white/10 text-gray-300'
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality Selector */}
                  <div className="border-t border-white/10 pt-2">
                    <div className="text-[#AAA2B7] font-bold px-1 mb-1 uppercase text-[10px]">
                      Quality
                    </div>
                    <div className="space-y-0.5 max-h-32 overflow-y-auto pr-1">
                      <button
                        onClick={() => changeQuality(-1)}
                        className={`w-full flex items-center justify-between px-2 py-1 rounded-lg ${
                          currentQuality === -1 ? 'bg-[#E2E8F0] text-black font-bold' : 'hover:bg-white/10 text-gray-300'
                        }`}
                      >
                        <span>Auto</span>
                        {currentQuality === -1 && <Check className="w-3.5 h-3.5" />}
                      </button>
                      {qualities.map((q) => (
                        <button
                          key={q.id}
                          onClick={() => changeQuality(q.id)}
                          className={`w-full flex items-center justify-between px-2 py-1 rounded-lg ${
                            currentQuality === q.id ? 'bg-[#E2E8F0] text-black font-bold' : 'hover:bg-white/10 text-gray-300'
                          }`}
                        >
                          <span>{q.height ? `${q.height}p` : `${Math.round(q.bitrate / 1000)}k`}</span>
                          {currentQuality === q.id && <Check className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="hover:text-white transition-colors"
              title="Fullscreen (F)"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
