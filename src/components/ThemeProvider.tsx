'use client';

import { useEffect } from 'react';
import { useStore } from '@/store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, themeSettings, customDesignTheme } = useStore();

  // Initialize color theme
  useEffect(() => {
    const colorTheme = currentUser?.theme || themeSettings?.color || 'blue';
    document.documentElement.setAttribute('data-theme', colorTheme);
  }, [currentUser?.theme, themeSettings?.color]);

  // Apply custom design theme as CSS variables
  useEffect(() => {
    const root = document.documentElement;
    
    if (customDesignTheme.theme) {
      const theme = customDesignTheme.theme;
      root.style.setProperty('--custom-primary', theme.primaryColor);
      root.style.setProperty('--custom-secondary', theme.secondaryColor);
      root.style.setProperty('--custom-background', theme.backgroundColor);
      root.style.setProperty('--custom-text', theme.textColor);
      root.style.setProperty('--custom-button', theme.buttonColor);
      root.style.setProperty('--custom-card', theme.cardColor);
      root.style.setProperty('--custom-header', theme.headerColor);
      root.classList.add('custom-theme-applied');
    } else {
      root.style.removeProperty('--custom-primary');
      root.style.removeProperty('--custom-secondary');
      root.style.removeProperty('--custom-background');
      root.style.removeProperty('--custom-text');
      root.style.removeProperty('--custom-button');
      root.style.removeProperty('--custom-card');
      root.style.removeProperty('--custom-header');
      root.classList.remove('custom-theme-applied');
    }

    // Apply individual element colors
    Object.entries(customDesignTheme.elementColors).forEach(([id, color]) => {
      root.style.setProperty(`--custom-element-${id}`, color);
    });
  }, [customDesignTheme]);

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
