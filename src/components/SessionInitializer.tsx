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
          const userId = data.user.id;

          setCurrentUser({
            id: userId,
            email: data.user.email,
            name: data.user.name,
            credits: 100,
            subscription: 'free',
            theme: 'blue',
            createdAt: new Date(),
          });
          setIsAuthenticated(true);

          // 서버에서 사용자 데이터(지갑 + 설정) 로드
          try {
            const { loadUserData } = await import('@/lib/userDataSync');
            const userData = await loadUserData();

            if (userData) {
              const stateUpdate: Record<string, any> = {};

              // 지갑 복원
              if (userData.credits && Object.keys(userData.credits).length > 0) {
                stateUpdate.wallet = {
                  userId,
                  credits: userData.credits,
                  transactions: [],
                };
                stateUpdate.hasFirstPurchase = true;
              } else {
                stateUpdate.wallet = { userId, credits: {}, transactions: [] };
              }

              // 설정 복원
              if (userData.settings) {
                const s = userData.settings;
                if (s.selections?.length) stateUpdate.selections = s.selections;
                if (s.themeSettings) stateUpdate.themeSettings = s.themeSettings;
                if (s.personas?.length) stateUpdate.personas = s.personas;
                if (s.activePersona) stateUpdate.activePersona = s.activePersona;
                if (s.chatTemplates?.length) stateUpdate.chatTemplates = s.chatTemplates;
                if (s.favoriteTemplates?.length) stateUpdate.favoriteTemplates = s.favoriteTemplates;
                if (s.autoRecharge) stateUpdate.autoRecharge = s.autoRecharge;
                if (s.autoDelete) stateUpdate.autoDelete = s.autoDelete;
                if (s.streaming) stateUpdate.streaming = s.streaming;
                if (s.aiGrowthData) stateUpdate.aiGrowthData = s.aiGrowthData;
                if (s.expertiseProfiles?.length) stateUpdate.expertiseProfiles = s.expertiseProfiles;
                if (s.activeExpertise) stateUpdate.activeExpertise = s.activeExpertise;
                if (s.pmcBalance) stateUpdate.pmcBalance = s.pmcBalance;
                if (s.userPlan) stateUpdate.userPlan = s.userPlan;
                if (s.storedFacts?.length) stateUpdate.storedFacts = s.storedFacts;
                if (s.usageAlerts?.length) stateUpdate.usageAlerts = s.usageAlerts;
                if (s.comparisonSessions?.length) stateUpdate.comparisonSessions = s.comparisonSessions;
                if (s.customDesignTheme) stateUpdate.customDesignTheme = s.customDesignTheme;
                if (s.settings) stateUpdate.settings = s.settings;
                if (s.language) stateUpdate.language = s.language;
                if (s.hasFirstPurchase) stateUpdate.hasFirstPurchase = s.hasFirstPurchase;
              }

              if (Object.keys(stateUpdate).length > 0) {
                useStore.setState(stateUpdate);
              }
            }
          } catch {
            // 서버 데이터 로드 실패 시 무시 (로컬 데이터 사용)
          }

          // 채팅 세션 로드
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
