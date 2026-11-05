import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, openAuthModal } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060709] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#E2E8F0] animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Open auth modal so the user can easily log in
    openAuthModal('login');
    return <Navigate to="/" replace />;
  }

  return children;
}

