import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Video,
  Sun,
  Moon,
  Clock,
  User as UserIcon,
  LogOut,
  ShieldAlert,
  Download,
  Menu,
  X,
} from 'lucide-react';
import { LiveLogo } from '../brand/LiveLogo';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

interface NavbarProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { themeMode, effectiveTheme, setThemeMode, istHour } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full h-16 border-b border-zinc-200 dark:border-[#26292e] bg-white/95 dark:bg-[#0c0d0e]/95 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between transition-colors">
      {/* Left: Mobile Toggle & Brand Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 lg:hidden"
          aria-label="Toggle navigation"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <Link to="/" className="flex items-center">
          <LiveLogo size="md" />
        </Link>
      </div>

      {/* Middle: Cinematic Search Bar */}
      <form
        onSubmit={handleSearch}
        className="hidden md:flex items-center flex-1 max-w-md mx-6"
      >
        <div className="relative w-full">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
          />
          <input
            type="text"
            placeholder="Search streams, documentaries, creator channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-100 dark:bg-[#181a1d] border border-zinc-200 dark:border-[#26292e] rounded-lg text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-[#e04f38] transition-colors"
          />
        </div>
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Quick Launch Meeting */}
        <Link
          to="/meetings"
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-[#181a1d] hover:bg-zinc-200 dark:hover:bg-[#202327] border border-zinc-200 dark:border-[#26292e] rounded-lg transition-colors"
        >
          <Video size={14} className="text-[#e04f38]" />
          <span>New Meeting</span>
        </Link>

        {/* IST Theme Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setThemeMenuOpen(!themeMenuOpen)}
            className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#181a1d] border border-transparent hover:border-zinc-200 dark:hover:border-[#26292e] transition-colors flex items-center gap-1.5 text-xs font-medium"
            title={`Active Theme: ${themeMode} (${effectiveTheme.toUpperCase()}) | IST ${istHour}:00`}
          >
            {effectiveTheme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            <span className="hidden xl:inline text-[11px] text-zinc-500">
              {themeMode === 'AUTO' ? `IST ${istHour}h Auto` : themeMode}
            </span>
          </button>

          {themeMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-[#181a1d] border border-zinc-200 dark:border-[#26292e] shadow-xl p-2 z-50 text-xs">
              <div className="px-2.5 py-1.5 text-[10px] uppercase font-bold tracking-wider text-zinc-400 border-b border-zinc-100 dark:border-[#26292e] mb-1">
                Theme (IST Auto Mode)
              </div>
              <button
                onClick={() => {
                  setThemeMode('AUTO');
                  setThemeMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors ${
                  themeMode === 'AUTO'
                    ? 'bg-[#e04f38]/10 text-[#e04f38] font-semibold'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Clock size={14} /> Auto (IST Time)
                </span>
                <span className="text-[10px] text-zinc-500">{effectiveTheme}</span>
              </button>
              <button
                onClick={() => {
                  setThemeMode('DARK');
                  setThemeMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${
                  themeMode === 'DARK'
                    ? 'bg-[#e04f38]/10 text-[#e04f38] font-semibold'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Moon size={14} /> Always Dark
              </button>
              <button
                onClick={() => {
                  setThemeMode('LIGHT');
                  setThemeMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${
                  themeMode === 'LIGHT'
                    ? 'bg-[#e04f38]/10 text-[#e04f38] font-semibold'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Sun size={14} /> Always Light
              </button>
            </div>
          )}
        </div>

        {/* User Account / Auth Actions */}
        {isAuthenticated && user ? (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-[#181a1d] transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-[#202327] border border-zinc-300 dark:border-[#2a2e35] flex items-center justify-center font-bold text-xs text-[#e04f38]">
                {user.profile?.avatarUrl ? (
                  <img
                    src={user.profile.avatarUrl}
                    alt={user.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  user.username.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold leading-tight text-zinc-800 dark:text-zinc-200">
                  {user.profile?.displayName || user.username}
                </p>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">
                  {user.role}
                </span>
              </div>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-[#181a1d] border border-zinc-200 dark:border-[#26292e] shadow-xl p-2 z-50 text-xs">
                <div className="px-3 py-2 border-b border-zinc-100 dark:border-[#26292e] mb-1">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {user.profile?.displayName || user.username}
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
                  <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#e04f38]/15 text-[#e04f38] border border-[#e04f38]/20">
                    {user.role} ACCOUNT
                  </span>
                </div>

                <Link
                  to="/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <UserIcon size={14} /> Profile & Security
                </Link>

                <Link
                  to="/downloads"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Download size={14} /> My Downloads ({user.dailyDownloadLimit}/day)
                </Link>

                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#e04f38] hover:bg-[#e04f38]/10 font-semibold"
                  >
                    <ShieldAlert size={14} /> Admin Dashboard
                  </Link>
                )}

                <div className="border-t border-zinc-100 dark:border-[#26292e] my-1" />

                <button
                  onClick={() => {
                    logout();
                    setUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-500 hover:bg-red-500/10 text-left font-medium"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:text-[#e04f38] transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/auth?mode=register"
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#e04f38] hover:bg-[#cc422d] rounded-lg transition-colors"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
