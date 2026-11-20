import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Shield,
  Smartphone,
  Laptop,
  Clock,
  LogOut,
  Trash2,
  CheckCircle,
  AlertCircle,
  Sun,
  Moon,
  Globe,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../services/api';
import { ActiveSession, TrustedDevice, LoginHistoryRecord } from '../types';
import { formatDistanceToNow } from 'date-fns';

export const ProfilePage: React.FC = () => {
  const { user, refreshProfile, logout } = useAuth();
  const { themeMode, effectiveTheme, setThemeMode, istHour } = useTheme();

  // Tab switcher: Profile vs Security & Devices
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'logins'>('profile');

  // Profile form
  const [displayName, setDisplayName] = useState(user?.profile?.displayName || '');
  const [bio, setBio] = useState(user?.profile?.bio || '');
  const [country, setCountry] = useState(user?.profile?.country || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Security data
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryRecord[]>([]);
  const [loadingSecurity, setLoadingSecurity] = useState(false);

  useEffect(() => {
    if (user?.profile) {
      setDisplayName(user.profile.displayName || '');
      setBio(user.profile.bio || '');
      setCountry(user.profile.country || '');
    }
  }, [user]);

  const fetchSecurityData = async () => {
    setLoadingSecurity(true);
    try {
      const [sessRes, devRes, logRes] = await Promise.all([
        api.get('/auth/sessions'),
        api.get('/auth/trusted-devices'),
        api.get('/auth/login-history'),
      ]);

      if (sessRes.success) setSessions(sessRes.sessions);
      if (devRes.success) setTrustedDevices(devRes.devices);
      if (logRes.success) setLoginHistory(logRes.history);
    } catch (err) {
      console.error('Failed to load security info', err);
    } finally {
      setLoadingSecurity(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'security' || activeTab === 'logins') {
      fetchSecurityData();
    }
  }, [activeTab]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);

    try {
      const res = await api.put('/users/profile', {
        displayName,
        bio,
        country,
      });

      if (res.success) {
        setProfileMsg('Profile updated successfully.');
        await refreshProfile();
      }
    } catch (err: any) {
      setProfileMsg(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.delete(`/auth/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err: any) {
      alert(err.message || 'Failed to revoke session.');
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    try {
      await api.delete(`/auth/trusted-devices/${deviceId}`);
      setTrustedDevices((prev) => prev.filter((d) => d.id !== deviceId));
    } catch (err: any) {
      alert(err.message || 'Failed to remove trusted device.');
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-[#26292e]">
        <div>
          <h1 className="font-heading font-black text-2xl text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <UserIcon size={24} className="text-[#e04f38]" />
            <span>Account & Security Center</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Personal identity settings, IST login themes, and multi-device session verification.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-[#181a1d] rounded-xl border border-zinc-200 dark:border-[#26292e] text-xs">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'profile'
                ? 'bg-[#e04f38] text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'security'
                ? 'bg-[#e04f38] text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Sessions & Devices
          </button>
          <button
            onClick={() => setActiveTab('logins')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'logins'
                ? 'bg-[#e04f38] text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Login Audit
          </button>
        </div>
      </div>

      {/* TAB 1: Profile & Preferences */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <form
            onSubmit={handleSaveProfile}
            className="p-6 rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252a] shadow-sm space-y-4"
          >
            <h3 className="font-heading font-bold text-base text-zinc-900 dark:text-zinc-100">
              Personal Information
            </h3>

            {profileMsg && (
              <div className="p-3 rounded-xl bg-[#e04f38]/10 border border-[#e04f38]/20 text-[#e04f38] text-xs">
                {profileMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#111316] border border-zinc-200 dark:border-[#26292e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#e04f38]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#111316] border border-zinc-200 dark:border-[#26292e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#e04f38]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Bio / Broadcast Description
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#111316] border border-zinc-200 dark:border-[#26292e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#e04f38]"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2.5 rounded-xl bg-[#e04f38] hover:bg-[#cc422d] text-white text-xs font-semibold shadow-sm transition-colors"
              >
                {savingProfile ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>

          {/* IST Login Theme Preferences Box */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252a] shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-[#e04f38]" />
              <h3 className="font-heading font-bold text-base text-zinc-900 dark:text-zinc-100">
                IST Automated Login Theme
              </h3>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              In accordance with platform rules, LIVE automatically configures the theme based on
              Indian Standard Time (IST UTC+5:30): <strong>5:00 AM to 12:00 PM</strong> launches in light mode,
              and all other hours run in cinematic dark mode. You can also lock your preferred mode across sessions.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setThemeMode('AUTO')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  themeMode === 'AUTO'
                    ? 'border-[#e04f38] bg-[#e04f38]/10 text-[#e04f38]'
                    : 'border-zinc-200 dark:border-[#26292e] hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs mb-1">
                  <span>IST Auto Mode</span>
                  <Clock size={14} />
                </div>
                <p className="text-[10px] text-zinc-400">
                  Current IST Hour: {istHour}:00 ({effectiveTheme.toUpperCase()} active)
                </p>
              </button>

              <button
                type="button"
                onClick={() => setThemeMode('DARK')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  themeMode === 'DARK'
                    ? 'border-[#e04f38] bg-[#e04f38]/10 text-[#e04f38]'
                    : 'border-zinc-200 dark:border-[#26292e] hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs mb-1">
                  <span>Always Dark</span>
                  <Moon size={14} />
                </div>
                <p className="text-[10px] text-zinc-400">Deep charcoal & dark graphite</p>
              </button>

              <button
                type="button"
                onClick={() => setThemeMode('LIGHT')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  themeMode === 'LIGHT'
                    ? 'border-[#e04f38] bg-[#e04f38]/10 text-[#e04f38]'
                    : 'border-zinc-200 dark:border-[#26292e] hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs mb-1">
                  <span>Always Light</span>
                  <Sun size={14} />
                </div>
                <p className="text-[10px] text-zinc-400">Warm off-white & clean surfaces</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Active Sessions & Trusted Devices */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Active Sessions */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252a] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-base text-zinc-900 dark:text-zinc-100">
                  Active Sessions
                </h3>
                <p className="text-xs text-zinc-400">
                  Browsers and devices currently logged into your account.
                </p>
              </div>
            </div>

            {loadingSecurity ? (
              <div className="py-6 text-center text-xs text-zinc-400">Loading sessions...</div>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-zinc-500">No other active sessions detected.</p>
            ) : (
              <div className="space-y-3">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="p-3.5 rounded-xl border border-zinc-200 dark:border-[#26292e] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-zinc-100 dark:bg-[#202327] text-zinc-700 dark:text-zinc-300">
                        <Laptop size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-zinc-800 dark:text-zinc-200">
                          {sess.userAgent}
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          IP: {sess.ipAddress} • Last active{' '}
                          {formatDistanceToNow(new Date(sess.lastActiveAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevokeSession(sess.id)}
                      className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-semibold"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trusted Devices */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252a] shadow-sm space-y-4">
            <div>
              <h3 className="font-heading font-bold text-base text-zinc-900 dark:text-zinc-100">
                Trusted Devices
              </h3>
              <p className="text-xs text-zinc-400">
                Devices verified through OTP that do not require continuous verification challenges.
              </p>
            </div>

            {trustedDevices.length === 0 ? (
              <p className="text-xs text-zinc-500">No trusted devices stored.</p>
            ) : (
              <div className="space-y-3">
                {trustedDevices.map((dev) => (
                  <div
                    key={dev.id}
                    className="p-3.5 rounded-xl border border-zinc-200 dark:border-[#26292e] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-zinc-100 dark:bg-[#202327] text-zinc-700 dark:text-zinc-300">
                        <Smartphone size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-zinc-800 dark:text-zinc-200">
                          {dev.browserName} on {dev.osName} ({dev.deviceType || 'Desktop'})
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          Verified since{' '}
                          {formatDistanceToNow(new Date(dev.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveDevice(dev.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10"
                      title="Remove trusted device"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Login Audit History */}
      {activeTab === 'logins' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#15171a] border border-zinc-200 dark:border-[#22252a] shadow-sm space-y-4">
          <div>
            <h3 className="font-heading font-bold text-base text-zinc-900 dark:text-zinc-100">
              Recent Login Activity Audit
            </h3>
            <p className="text-xs text-zinc-400">
              Comprehensive security log recording IP address, browser, OS, and status.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-[#26292e]">
            <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
              <thead className="bg-zinc-50 dark:bg-[#181a1d] text-zinc-400 uppercase text-[10px] font-bold border-b border-zinc-200 dark:border-[#26292e]">
                <tr>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">IP Address</th>
                  <th className="py-2.5 px-3">Browser / OS</th>
                  <th className="py-2.5 px-3">Approx. Location</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-[#202327]">
                {loginHistory.map((l) => (
                  <tr key={l.id} className="hover:bg-zinc-50 dark:hover:bg-[#181a1d]">
                    <td className="py-2.5 px-3">
                      {l.isSuccess ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500">
                          SUCCESS
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-500/15 text-red-500">
                          FAILED ({l.failureReason || 'Auth'})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-zinc-500">{l.ipAddress}</td>
                    <td className="py-2.5 px-3">
                      {l.browserName} on {l.osName}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400">
                      {l.city || 'Local area'}, {l.country || 'Localhost'}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400">
                      {formatDistanceToNow(new Date(l.timestamp), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

