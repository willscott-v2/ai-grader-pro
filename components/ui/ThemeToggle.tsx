'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const isDark = theme === 'dark' || (theme === 'system' && getSystemPrefersDark());
  root.classList.toggle('dark', isDark);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const saved = (typeof window !== 'undefined' && (localStorage.getItem('theme') as Theme)) || 'system';
    setTheme(saved);
    applyTheme(saved);

    if (saved === 'system') {
      const mm = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('system');
      mm.addEventListener('change', handler);
      return () => mm.removeEventListener('change', handler);
    }
  }, []);

  const changeTheme = (next: Theme) => {
    setTheme(next);
    if (next === 'system') {
      localStorage.removeItem('theme');
    } else {
      localStorage.setItem('theme', next);
    }
    applyTheme(next);
  };

  return (
    <div className="inline-flex items-center gap-2 text-sm">
      <button
        type="button"
        onClick={() => changeTheme(theme === 'dark' ? 'light' : 'dark')}
        className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        aria-label="Toggle dark mode"
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
      </button>
      <button
        type="button"
        onClick={() => changeTheme('system')}
        className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        aria-label="Use system theme"
        title="Use system theme"
      >
        🖥️ System
      </button>
    </div>
  );
}


