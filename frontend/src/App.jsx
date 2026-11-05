import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import SearchBar from './components/SearchBar';
import AuthModal from './components/AuthModal';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Watch from './pages/Watch';
import Explore from './pages/Explore';
import Search from './pages/Search';
import MyList from './pages/MyList';
import Profile from './pages/Profile';

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

          {/* Page Content */}
          <main className="flex-1">
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
          </main>

          {/* Global Footer */}
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
