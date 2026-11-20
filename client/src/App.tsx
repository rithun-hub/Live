import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { CinematicIntro } from './components/brand/CinematicIntro';
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { WatchPage } from './pages/WatchPage';
import { MeetingsPage } from './pages/MeetingsPage';
import { MeetingRoomPage } from './pages/MeetingRoomPage';
import { DownloadsPage } from './pages/DownloadsPage';
import { HistoryPage } from './pages/HistoryPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AuthPage } from './pages/AuthPage';
import { useAuth } from './contexts/AuthContext';

// Protected Admin Route Guard
const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="py-24 text-center text-xs text-zinc-500">
        Verifying administrator credentials...
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  const [showIntro, setShowIntro] = useState(() => {
    // Only show opening intro if not previously seen in current session
    return sessionStorage.getItem('live_intro_seen') !== 'true';
  });

  return (
    <>
      {showIntro && <CinematicIntro onComplete={() => setShowIntro(false)} />}

      <BrowserRouter>
        <Routes>
          {/* Fullscreen Meeting Room Route */}
          <Route path="/meeting/:roomCode" element={<MeetingRoomPage />} />

          {/* Main App Layout Wrapped Routes */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/watch/:slug" element={<WatchPage />} />
            <Route path="/meetings" element={<MeetingsPage />} />
            <Route path="/downloads" element={<DownloadsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route
              path="/admin"
              element={
                <ProtectedAdminRoute>
                  <AdminDashboardPage />
                </ProtectedAdminRoute>
              }
            />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
};
