import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { LogIn, UserPlus, Clock, ShieldCheck, Sparkles } from 'lucide-react';
import { LiveLogo } from '../components/brand/LiveLogo';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { OtpModal } from '../components/modals/OtpModal';

export const AuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const redirect = searchParams.get('redirect') || '/';

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const { login, register } = useAuth();
  const { effectiveTheme, istHour } = useTheme();
  const navigate = useNavigate();

  // Login fields
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP Modal State
  const [otpModalData, setOtpModalData] = useState<{
    isOpen: boolean;
    email: string;
    purpose: 'REGISTRATION' | 'LOGIN_NEW_DEVICE' | 'PASSWORD_RESET';
    devOtp?: string;
  }>({
    isOpen: false,
    email: '',
    purpose: 'REGISTRATION',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await login({ emailOrUsername, password });
      if (res.requiresOtp) {
        setOtpModalData({
          isOpen: true,
          email: res.email,
          purpose: res.purpose || 'LOGIN_NEW_DEVICE',
          devOtp: res.devOtp,
        });
      } else {
        navigate(redirect);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await register({
        email: regEmail,
        username: regUsername,
        password: regPassword,
        displayName: displayName || regUsername,
      });

      if (res.requiresVerification) {
        setOtpModalData({
          isOpen: true,
          email: res.email,
          purpose: 'REGISTRATION',
          devOtp: res.devOtp,
        });
      } else {
        navigate(redirect);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick fill demo credentials
  const fillDemo = (role: 'admin' | 'creator' | 'user') => {
    setMode('login');
    setError(null);
    if (role === 'admin') {
      setEmailOrUsername('admin@live.tv');
      setPassword('LiveAdmin123!');
    } else if (role === 'creator') {
      setEmailOrUsername('creator@live.tv');
      setPassword('LiveCreator123!');
    } else {
      setEmailOrUsername('user@live.tv');
      setPassword('LiveUser123!');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#15171a] rounded-3xl border border-zinc-200 dark:border-[#22252a] shadow-xl p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-block">
            <LiveLogo size="lg" />
          </div>
          <p className="text-xs text-zinc-500">
            {mode === 'login'
              ? 'Sign in to access your broadcasts, meetings, and downloads'
              : 'Create your LIVE account for ultra-low latency streams'}
          </p>
        </div>

        {/* IST Login Theme Badge */}
        <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-[#111316] border border-zinc-200 dark:border-[#26292e] flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <Clock size={13} className="text-[#e04f38]" />
            <span>IST Login Theme:</span>
            <strong className="text-zinc-800 dark:text-zinc-200 font-mono">
              {istHour}:00 ({effectiveTheme.toUpperCase()})
            </strong>
          </div>
          <span className="text-[10px] text-zinc-400">5am–12pm Light / Other Dark</span>
        </div>

        {/* Mode Toggle Switch */}
        <div className="grid grid-cols-2 p-1 bg-zinc-100 dark:bg-[#1c1f24] rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-white dark:bg-[#26292f] text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <LogIn size={14} />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              mode === 'register'
                ? 'bg-white dark:bg-[#26292f] text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <UserPlus size={14} />
            <span>Register</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
            {error}
          </div>
        )}

        {/* Quick Demo Pre-Fill Pills */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 flex items-center gap-1">
            <Sparkles size={11} className="text-[#e04f38]" /> Quick Demo Accounts
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillDemo('admin')}
              className="p-1.5 rounded-lg text-[10px] font-bold border border-[#e04f38]/30 bg-[#e04f38]/10 text-[#e04f38] hover:bg-[#e04f38]/20 transition-colors"
            >
              Admin Demo
            </button>
            <button
              type="button"
              onClick={() => fillDemo('creator')}
              className="p-1.5 rounded-lg text-[10px] font-bold border border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors"
            >
              Creator Demo
            </button>
            <button
              type="button"
              onClick={() => fillDemo('user')}
              className="p-1.5 rounded-lg text-[10px] font-bold border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 transition-colors"
            >
              User Demo
            </button>
          </div>
        </div>

        {/* Login Form */}
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Email or Username
              </label>
              <input
                type="text"
                required
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="admin@live.tv"
                className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#111316] border border-zinc-200 dark:border-[#26292e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#e04f38]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#111316] border border-zinc-200 dark:border-[#26292e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#e04f38]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-[#e04f38] hover:bg-[#cc422d] disabled:opacity-50 transition-colors shadow-md"
            >
              {isLoading ? 'Signing In...' : 'Sign In to LIVE'}
            </button>
          </form>
        ) : (
          /* Registration Form */
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#111316] border border-zinc-200 dark:border-[#26292e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#e04f38]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="johndoe"
                  className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#111316] border border-zinc-200 dark:border-[#26292e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#e04f38]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#111316] border border-zinc-200 dark:border-[#26292e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#e04f38]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Password (8+ chars, 1 uppercase, 1 number)
              </label>
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-[#111316] border border-zinc-200 dark:border-[#26292e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#e04f38]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-[#e04f38] hover:bg-[#cc422d] disabled:opacity-50 transition-colors shadow-md mt-2"
            >
              {isLoading ? 'Creating Account...' : 'Register & Receive OTP'}
            </button>
          </form>
        )}
      </div>

      {/* OTP Verification Modal */}
      <OtpModal
        isOpen={otpModalData.isOpen}
        email={otpModalData.email}
        purpose={otpModalData.purpose}
        devOtp={otpModalData.devOtp}
        onClose={() => setOtpModalData((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={() => {
          setOtpModalData((prev) => ({ ...prev, isOpen: false }));
          navigate(redirect);
        }}
      />
    </div>
  );
};
