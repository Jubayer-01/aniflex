import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import SearchBar from './components/SearchBar';
import AuthModal from './components/AuthModal';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home'; // Eagerly loaded for instant initial render

// Lazy-loaded route chunks to optimize initial bundle size & load speed
const Watch = lazy(() => import('./pages/Watch'));
const Explore = lazy(() => import('./pages/Explore'));
const Search = lazy(() => import('./pages/Search'));
const MyList = lazy(() => import('./pages/MyList'));
const Profile = lazy(() => import('./pages/Profile'));

function PageLoader() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 border-2 border-[#8955EF] border-t-transparent rounded-full animate-spin" />
      <span className="text-xs text-[#AAA2B7] font-medium tracking-wide animate-pulse">Loading ANIFLEX...</span>
    </div>
  );
}

export default function App() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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
                <Route path="/search" element={<Search />} />
                <Route path="/watch/:id" element={<Watch />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/mylist" element={<MyList />} />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
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
