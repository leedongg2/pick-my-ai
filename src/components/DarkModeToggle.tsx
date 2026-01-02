'use client';

import React from 'react';
import { useStore } from '@/store';
import { Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/utils/cn';

export const DarkModeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { themeSettings, setThemeSettings } = useStore();

  const modes = [
    { value: 'light', label: '라이트', icon: Sun },
    { value: 'dark', label: '다크', icon: Moon },
    { value: 'system', label: '시스템', icon: Monitor },
  ] as const;

  return (
    <div className={cn('flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg', className)}>
      {modes.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setThemeSettings({ mode: value as any })}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md transition-all',
            themeSettings.mode === value
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          )}
        >
          <Icon className="w-4 h-4" />
          <span className="text-sm font-medium">{label}</span>
        </button>
      ))}
    </div>
  );
};

export const DarkModeToggleCompact: React.FC<{ className?: string }> = ({ className }) => {
  const { themeSettings, setThemeSettings } = useStore();

  const handleToggle = () => {
    const nextMode = 
      themeSettings.mode === 'light' ? 'dark' :
      themeSettings.mode === 'dark' ? 'system' : 'light';
    
    setThemeSettings({ mode: nextMode });
  };

  const Icon = 
    themeSettings.mode === 'dark' ? Moon :
    themeSettings.mode === 'light' ? Sun : Monitor;

  return (
    <button
      onClick={handleToggle}
      className={cn(
        'p-2 rounded-lg transition-all',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        'text-gray-700 dark:text-gray-300',
        className
      )}
      title={`테마: ${themeSettings.mode === 'dark' ? '다크' : themeSettings.mode === 'light' ? '라이트' : '시스템'}`}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
};
