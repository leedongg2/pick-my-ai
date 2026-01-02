'use client';

import { useEffect } from 'react';
import { useStore } from '@/store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, themeSettings } = useStore();

  // Initialize color theme
  useEffect(() => {
    const colorTheme = currentUser?.theme || themeSettings?.color || 'blue';
    document.documentElement.setAttribute('data-theme', colorTheme);
  }, [currentUser?.theme, themeSettings?.color]);

  // Initialize dark/light mode
  useEffect(() => {
    const mode = themeSettings?.mode || 'system';
    
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    if (mode === 'dark') {
      applyTheme(true);
    } else if (mode === 'light') {
      applyTheme(false);
    } else {
      // System mode
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);

      // Listen for system theme changes
      const handleChange = (e: MediaQueryListEvent) => {
        if (themeSettings?.mode === 'system') {
          applyTheme(e.matches);
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeSettings?.mode]);

  return <>{children}</>;
}
