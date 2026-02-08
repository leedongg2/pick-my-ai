'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/store';

/**
 * 앱 전역에서 세션 쿠키를 확인하여 Zustand store의 인증 상태를 자동 복원하는 컴포넌트.
 * layout.tsx에 배치하여 모든 페이지에서 인증 상태가 반영되도록 합니다.
 */
export function SessionInitializer() {
  const checkedRef = useRef(false);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const setIsAuthenticated = useStore((s) => s.setIsAuthenticated);

  useEffect(() => {
    if (isAuthenticated || checkedRef.current) return;
    checkedRef.current = true;

    (async () => {
      try {
        const res = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        if (!res.ok) return;

        const data = await res.json();
        if (data.authenticated && data.user) {
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

          // 채팅 세션 로드 (로그인 후 store의 login과 동일한 처리)
          try {
            const { ChatSyncService } = await import('@/lib/chatSync');
            const sessionsResult = await ChatSyncService.loadChatSessions();
            if (sessionsResult.success && sessionsResult.sessions) {
              useStore.setState({ chatSessions: sessionsResult.sessions });
            }
          } catch {
            // 채팅 세션 로드 실패 시 무시
          }
        }
      } catch {
        // 세션 확인 실패 시 무시 (비로그인 상태 유지)
      }
    })();
  }, [isAuthenticated, setCurrentUser, setIsAuthenticated]);

  return null;
}
