'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/store';
import { initializeRealtimeSync, unsubscribeFromRealtimeUpdates } from '@/lib/realtimeSync';

/**
 * 앱 전역에서 세션 쿠키를 확인하여 Zustand store의 인증 상태를 자동 복원하는 컴포넌트.
 * layout.tsx에 배치하여 모든 페이지에서 인증 상태가 반영되도록 합니다.
 */
export function SessionInitializer() {
  const checkedRef = useRef(false);
  const isAuthenticated = useStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated || checkedRef.current) return;
    checkedRef.current = true;

    (async () => {
      try {
        // 세션 캐시: sessionStorage에서 5분 이내 결과 재사용 (API 재요청 제거)
        let sessionData: any = null;
        try {
          const cached = sessionStorage.getItem('__pma_session');
          if (cached) {
            const { data, ts } = JSON.parse(cached);
            if (Date.now() - ts < 5 * 60 * 1000) {
              sessionData = data;
            } else {
              sessionStorage.removeItem('__pma_session');
            }
          }
        } catch {}

        if (!sessionData) {
          const res = await fetch('/api/auth/session', {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
          });
          if (!res.ok) return;
          sessionData = await res.json();
          // 캐시 저장
          try {
            sessionStorage.setItem('__pma_session', JSON.stringify({ data: sessionData, ts: Date.now() }));
          } catch {}
        }

        const data = sessionData;
        if (data.authenticated && data.user) {
          const userId = data.user.id;

          // ★ 핵심: setCurrentUser 호출 전에 localStorage에서 기존 크레딧을 읽어둠
          // setCurrentUser가 partialize를 트리거하여 wallet:null을 저장하면 기존 데이터가 소멸하기 때문
          let savedLocalCredits: Record<string, number> = {};
          let savedLocalTransactions: any[] = [];
          let savedLocalHasFirstPurchase = false;
          try {
            const raw = localStorage.getItem('pick-my-ai-storage');
            if (raw) {
              const parsed = JSON.parse(raw);
              const ps = parsed?.state;
              if (ps) {
                const userWallet = ps[`user_${userId}_wallet`];
                if (userWallet?.credits && Object.keys(userWallet.credits).length > 0) {
                  savedLocalCredits = { ...userWallet.credits };
                  savedLocalTransactions = userWallet.transactions || [];
                }
                if (Object.keys(savedLocalCredits).length === 0 && ps.wallet?.credits && Object.keys(ps.wallet.credits).length > 0) {
                  savedLocalCredits = { ...ps.wallet.credits };
                  savedLocalTransactions = ps.wallet?.transactions || [];
                }
                const userHfp = ps[`user_${userId}_hasFirstPurchase`];
                if (userHfp) savedLocalHasFirstPurchase = true;
              }
            }
          } catch { /* ignore */ }

          // setCurrentUser + wallet을 한 번에 설정하여 partialize가 빈 wallet을 저장하는 것을 방지
          const initialWallet = {
            userId,
            credits: savedLocalCredits,
            transactions: savedLocalTransactions,
          };
          useStore.setState({
            currentUser: {
              id: userId,
              email: data.user.email,
              name: data.user.name,
              credits: 100,
              subscription: 'free' as const,
              theme: 'blue',
              createdAt: new Date(),
            },
            isAuthenticated: true,
            wallet: initialWallet,
            hasFirstPurchase: true,
          });

          // 서버에서 사용자 데이터(지갑 + 설정) 로드 후 병합
          try {
            const { loadUserData } = await import('@/lib/userDataSync');
            const userData = await loadUserData();

            if (userData) {
              const stateUpdate: Record<string, any> = {};

              const serverCredits = userData.credits || {};
              const mergedCredits: Record<string, number> = { ...serverCredits };
              
              // 0 이하인 크레딧 제거
              for (const key of Object.keys(mergedCredits)) {
                if (mergedCredits[key] <= 0) delete mergedCredits[key];
              }
              
              let hasCredits = Object.keys(mergedCredits).length > 0;
              
              stateUpdate.wallet = {
                userId,
                credits: mergedCredits,
                transactions: savedLocalTransactions,
              };
              if (hasCredits) {
                stateUpdate.hasFirstPurchase = true;
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
                stateUpdate.smartRouterPurchased = s.smartRouterPurchased === true;
                stateUpdate.smartRouterFreeUsed = s.smartRouterFreeUsed === true;
                stateUpdate.insurancePurchased = s.insurancePurchased === true;
                stateUpdate.insurancePurchaseDate = typeof s.insurancePurchaseDate === 'string'
                  ? s.insurancePurchaseDate
                  : null;
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

          // 채팅 세션 로드 (서버 세션과 로컬 세션 병합)
          try {
            const { ChatSyncService } = await import('@/lib/chatSync');
            const sessionsResult = await ChatSyncService.loadChatSessions();
            if (sessionsResult.success && sessionsResult.sessions) {
              const serverSessions = sessionsResult.sessions;
              
              // 로컬 세션 가져오기 (localStorage에서 직접 + store에서)
              let localSessions: any[] = useStore.getState().chatSessions || [];
              if (localSessions.length === 0) {
                try {
                  const raw = localStorage.getItem('pick-my-ai-storage');
                  if (raw) {
                    const parsed = JSON.parse(raw);
                    const ps = parsed?.state;
                    const userSessions = ps?.[`user_${userId}_chatSessions`];
                    if (Array.isArray(userSessions) && userSessions.length > 0) {
                      localSessions = userSessions;
                    }
                  }
                } catch { /* ignore */ }
              }
              
              // 서버/로컬 동일 ID 세션 병합: 더 최신(updatedAt) 또는 메시지 많은 쪽 우선
              if (serverSessions.length > 0) {
                const merged = serverSessions.map((serverSession: any) => {
                  const localMatch = localSessions.find((s: any) => s.id === serverSession.id);
                  if (!localMatch) return serverSession;

                  const serverUpdated = serverSession.updatedAt ? new Date(serverSession.updatedAt).getTime() : 0;
                  const localUpdated = localMatch.updatedAt ? new Date(localMatch.updatedAt).getTime() : 0;
                  const serverMsgCount = Array.isArray(serverSession.messages) ? serverSession.messages.length : 0;
                  const localMsgCount = Array.isArray(localMatch.messages) ? localMatch.messages.length : 0;

                  // 더 최근 updatedAt, 동률이면 메시지 수가 많은 쪽
                  if (localUpdated > serverUpdated) return localMatch;
                  if (localUpdated < serverUpdated) return serverSession;
                  return localMsgCount > serverMsgCount ? localMatch : serverSession;
                });

                const serverIds = new Set(serverSessions.map((s: any) => s.id));
                const localOnly = localSessions.filter((s: any) => !serverIds.has(s.id));
                useStore.setState({ chatSessions: [...merged, ...localOnly] });
              }
              // 서버가 비어있으면 로컬 세션 유지 (덮어쓰지 않음)
            }
          } catch {
            // 채팅 세션 로드 실패 시 무시 (로컬 데이터 유지)
          }

          // Realtime 구독 초기화
          initializeRealtimeSync(userId);
        }
      } catch {
        // 세션 확인 실패 시 무시 (비로그인 상태 유지)
      }
    })();
  }, [isAuthenticated]);

  // 컴포넌트 언마운트 시 Realtime 구독 해제
  useEffect(() => {
    return () => {
      unsubscribeFromRealtimeUpdates();
    };
  }, []);

  return null;
}
