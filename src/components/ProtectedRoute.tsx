'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useAuthActions } from '@/hooks/useAuthStore';
import { Sparkles } from 'lucide-react';
import { redirectToLogin } from '@/lib/redirect';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { setCurrentUser, setIsAuthenticated } = useAuthActions();
  const [isChecking, setIsChecking] = useState(!isAuthenticated);
  const hasCheckedRef = useRef(false);

  const checkSession = useCallback(async () => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      const data = await response.json();

      if (response.ok && data.authenticated && data.user) {
        setCurrentUser({
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          credits: 100,
          subscription: 'free',
          theme: 'blue',
          createdAt: new Date(),
        });
        setIsAuthenticated(true);
        setIsChecking(false);
      } else {
        setIsAuthenticated(false);
        redirectToLogin();
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('세션 확인 실패:', error);
      }
      setIsAuthenticated(false);
      redirectToLogin();
    }
  }, [router, setCurrentUser, setIsAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated && !hasCheckedRef.current) {
      checkSession();
    } else if (isAuthenticated) {
      setIsChecking(false);
    }
  }, [isAuthenticated, checkSession]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4 animate-in fade-in duration-500">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 via-primary-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl animate-pulse">
              <Sparkles className="w-9 h-9 text-white" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-purple-500 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">인증 확인 중...</h3>
            <p className="text-sm text-gray-500">잠시만 기다려주세요</p>
          </div>
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

