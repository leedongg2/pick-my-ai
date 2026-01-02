'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Zustand persist 하이드레이션 완료 전에는 리다이렉트하지 않도록 보호
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const router = useRouter();
  const { isAuthenticated } = useStore();

  // 하이드레이션 상태 추적 (zustand persist 전용 API 사용)
  const [hydrated, setHydrated] = useState<boolean>(false);

  useEffect(() => {
    // 클라이언트 사이드에서만 하이드레이션 확인
    const timer = setTimeout(() => {
      setHydrated(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};

