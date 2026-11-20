import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Compass,
  Video,
  Download,
  History,
  User,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { isAdmin } = useAuth();

  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Explore', path: '/explore', icon: Compass },
    { label: 'Downloads', path: '/downloads', icon: Download },
    { label: 'Meetings', path: '/meetings', icon: Video },
    { label: 'Watch History', path: '/history', icon: History },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed lg:sticky top-16 left-0 z-30 w-60 h-[calc(100vh-4rem)] bg-white dark:bg-[#0c0d0e] border-r border-zinc-200 dark:border-[#26292e] flex flex-col justify-between p-3.5 transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-1">
          <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-zinc-400">
            Platform
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#e04f38]/12 text-[#e04f38] font-semibold dark:bg-[#e04f38]/15'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-[#181a1d]'
                  }`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          {isAdmin && (
            <div className="pt-4 space-y-1">
              <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-[#e04f38]">
                Administration
              </div>
              <NavLink
                to="/admin"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#e04f38]/15 text-[#e04f38] font-semibold'
                      : 'text-[#e04f38] hover:bg-[#e04f38]/10'
                  }`
                }
              >
                <ShieldAlert size={18} />
                <span>Admin Panel</span>
              </NavLink>
            </div>
          )}
        </div>

        {/* Footer Brand Info */}
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#15171a] border border-zinc-200 dark:border-[#26292e] text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200">
            <span className="w-2 h-2 rounded-full bg-[#e04f38] animate-pulse" />
            <span>LIVE Platform</span>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Everything happens live. Ultra-low latency streaming & WebRTC meetings.
          </p>
        </div>
      </aside>
    </>
  );
};

