'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  OPENAI_STATUS_REFRESH_INTERVAL_MS,
  createDefaultOpenAIStatusSnapshot,
  type OpenAIStatusSnapshot,
} from '@/utils/openaiStatus';

type OpenAIStatusContextValue = {
  isRefreshing: boolean;
  refreshStatus: (force?: boolean) => Promise<void>;
  status: OpenAIStatusSnapshot;
};

const OpenAIStatusContext = createContext<OpenAIStatusContextValue | null>(null);

type Props = {
  children: React.ReactNode;
  initialStatus?: OpenAIStatusSnapshot;
};

export function OpenAIStatusProvider({ children, initialStatus }: Props) {
  const [status, setStatus] = useState<OpenAIStatusSnapshot>(initialStatus || createDefaultOpenAIStatusSnapshot());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshStatus = useCallback(async (force = false) => {
    setIsRefreshing(true);
    try {
      const response = await fetch(force ? '/api/openai-status?refresh=1' : '/api/openai-status', {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`OpenAI status fetch failed: ${response.status}`);
      }

      const nextStatus = await response.json() as OpenAIStatusSnapshot;
      if (mountedRef.current) {
        setStatus(nextStatus);
      }
    } catch {
      if (mountedRef.current) {
        setStatus((prev) => ({
          ...prev,
          source: prev.lastCheckedAt ? prev.source : 'fallback',
        }));
      }
    } finally {
      if (mountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void refreshStatus(false);

    const interval = window.setInterval(() => {
      void refreshStatus(false);
    }, OPENAI_STATUS_REFRESH_INTERVAL_MS);

    const handleFocus = () => {
      void refreshStatus(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshStatus(false);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshStatus]);

  const value = useMemo(() => ({
    isRefreshing,
    refreshStatus,
    status,
  }), [isRefreshing, refreshStatus, status]);

  return (
    <OpenAIStatusContext.Provider value={value}>
      {children}
    </OpenAIStatusContext.Provider>
  );
}

export function useOpenAIStatus(): OpenAIStatusContextValue {
  const context = useContext(OpenAIStatusContext);
  if (!context) {
    throw new Error('useOpenAIStatus must be used within OpenAIStatusProvider.');
  }
  return context;
}
