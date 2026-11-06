import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import SearchBar from './components/SearchBar';
import AuthModal from './components/AuthModal';
import ProtectedRoute from './components/ProtectedRoute';
import UnderDevelopment from './components/UnderDevelopment';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home'; // Eagerly loaded for instant initial render

// TOGGLE: Set to true for maintenance/development mode, false for live public site
const IS_UNDER_MAINTENANCE = true;

// Lazy-loaded route chunks to optimize initial bundle size & load speed
const Movies = lazy(() => import('./pages/Movies'));
const Series = lazy(() => import('./pages/Series'));
const Anime = lazy(() => import('./pages/Anime'));
const Watch = lazy(() => import('./pages/Watch'));
const Explore = lazy(() => import('./pages/Explore'));
const Search = lazy(() => import('./pages/Search'));
const MyList = lazy(() => import('./pages/MyList'));
const Profile = lazy(() => import('./pages/Profile'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageLoader() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 border-2 border-[#8955EF] border-t-transparent rounded-full animate-spin" />
      <span className="text-xs text-[#AAA2B7] font-medium tracking-wide animate-pulse">Loading OmniFlex...</span>
    </div>
  );
}

export default function App() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [bypassed, setBypassed] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('preview') === 'true' || localStorage.getItem('aniflex_dev_bypass') === 'true';
  });

  if (IS_UNDER_MAINTENANCE && !bypassed) {
    return <UnderDevelopment onUnlock={() => setBypassed(true)} />;
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#09080F] text-white flex flex-col font-sans selection:bg-[#8955EF] selection:text-white">
          {/* Global Navigation */}
          <Navbar onOpenSearch={() => setIsSearchOpen(true)} />

          {/* Global Search Modal */}
          <SearchBar
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
          />

          {/* Global Auth Modal */}
          <AuthModal />

          {/* Page Content with Lazy Suspense */}
          <main className="flex-1">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/movies" element={<Movies />} />
                <Route path="/series" element={<Series />} />
                <Route path="/anime" element={<Anime />} />
                <Route path="/search" element={<Search />} />
                <Route path="/watch/:type/:id" element={<Watch />} />
                <Route path="/watch/:id" element={<Watch />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/mylist" element={<MyList />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>

          {/* Global Footer */}
          <Footer />

          {/* Vercel Web Analytics */}
          <Analytics />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
