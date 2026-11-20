import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeMode } from '../types';

interface ThemeContextType {
  themeMode: ThemeMode;
  effectiveTheme: 'dark' | 'light';
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  istHour: number;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function computeISTHour(): number {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 3600000 * 5.5);
  return istDate.getHours();
}

export function computeISTTheme(): 'dark' | 'light' {
  const hour = computeISTHour();
  // 5:00 AM to 12:00 PM IST is light theme
  return hour >= 5 && hour < 12 ? 'light' : 'dark';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('live_theme_mode') as ThemeMode) || 'AUTO';
  });

  const [istHour, setIstHour] = useState<number>(computeISTHour());

  useEffect(() => {
    const timer = setInterval(() => {
      setIstHour(computeISTHour());
    }, 60000); // Check IST time every minute
    return () => clearInterval(timer);
  }, []);

  const effectiveTheme: 'dark' | 'light' =
    themeMode === 'AUTO' ? computeISTTheme() : themeMode === 'LIGHT' ? 'light' : 'dark';

  useEffect(() => {
    const root = document.documentElement;
    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [effectiveTheme]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem('live_theme_mode', mode);
  };

  const toggleTheme = () => {
    if (effectiveTheme === 'dark') {
      setThemeMode('LIGHT');
    } else {
      setThemeMode('DARK');
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        effectiveTheme,
        setThemeMode,
        toggleTheme,
        istHour,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
