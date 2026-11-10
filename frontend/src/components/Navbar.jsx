import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, User, Film, Play, LogOut, Bookmark, Settings, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onOpenSearch }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Movies', path: '/movies' },
    { name: 'Series', path: '/series' },
    { name: 'Anime', path: '/anime' },
    { name: 'Explore', path: '/explore' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#060709]/95 backdrop-blur-md border-b border-white/10 py-3 shadow-xl'
          : 'bg-gradient-to-b from-[#060709]/95 via-[#060709]/50 to-transparent py-5'
      }`}
    >
      <div className="w-full px-4 sm:px-6 md:px-10 lg:px-12 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="w-9 h-9 rounded-xl bg-[#1E2028] border border-white/20 flex items-center justify-center shadow-md group-hover:border-white/40 transition-all">
            <Play className="w-4 h-4 fill-[#E2E8F0] text-[#E2E8F0] translate-x-0.5" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white">
            Omni<span className="text-[#94A3B8]">Flex</span>
          </span>
        </Link>

        {/* Center Pill Navigation with Static Instant Active Pill */}
        <nav className="hidden md:flex items-center bg-[#0F1115]/90 backdrop-blur-lg border border-white/10 rounded-full p-1.5 shadow-inner">
          {navLinks.map((link) => {
            const isActive = link.path.includes('?')
              ? location.pathname + location.search === link.path
              : location.pathname === link.path && !location.search;
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`px-5 py-1.5 rounded-full text-sm font-medium select-none transition-colors duration-150 ${
                  isActive
                    ? 'bg-[#E2E8F0] text-black font-bold shadow-sm'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Icons & User Account */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => navigate('/search')}
            aria-label="Search entertainment catalog"
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all ${
              location.pathname === '/search'
                ? 'bg-[#E2E8F0] text-black border-[#E2E8F0] shadow-sm scale-105'
                : 'bg-[#0F1115]/90 hover:bg-white/10 border-white/10 text-[#94A3B8] hover:text-white'
            }`}
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* User Account / Sign In Dropdown */}
          {isAuthenticated ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                aria-label="User profile and settings"
                className="w-10 h-10 rounded-full bg-[#1E2028] border border-white/20 flex items-center justify-center text-white font-bold ring-1 ring-white/10 hover:border-white/50 transition-all shadow-md overflow-hidden"
                title={user?.username || 'Profile'}
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold uppercase">{user?.username?.[0] || 'U'}</span>
                )}
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 top-12 w-48 bg-[#0F1115] border border-white/10 rounded-2xl p-2 shadow-2xl space-y-1 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-white/5">
                    <p className="font-bold text-white truncate">{user?.username}</p>
                    <p className="text-[11px] text-[#94A3B8] truncate">{user?.email}</p>
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-[#94A3B8]" />
                    <span>Profile & Settings</span>
                  </Link>

                  <Link
                    to="/mylist"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Bookmark className="w-4 h-4 text-[#94A3B8]" />
                    <span>My Watchlist</span>
                  </Link>

                  <button
                    onClick={() => {
                      logout();
                      setIsUserMenuOpen(false);
                      navigate('/');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => openAuthModal('login')}
              aria-label="Sign in to your account"
              className="px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full bg-[#E2E8F0] hover:bg-white text-black text-xs font-bold transition-all shadow-sm hover:scale-105 active:scale-95"
            >
              Sign In
            </button>
          )}

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#0F1115]/90 hover:bg-white/10 border border-white/10 flex items-center justify-center text-[#94A3B8] hover:text-white transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-Down Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#060709]/98 backdrop-blur-2xl px-4 py-4 space-y-1 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          {navLinks.map((link) => {
            const isActive = link.path.includes('?')
              ? location.pathname + location.search === link.path
              : location.pathname === link.path && !location.search;
            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-[#E2E8F0] text-black font-bold shadow-sm'
                    : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
