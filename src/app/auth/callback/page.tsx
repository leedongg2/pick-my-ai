'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/Card';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { redirectToLogin, redirectToChat } from '@/lib/redirect';

export default function AuthCallbackPage() {
  const router = useRouter();

  /**
   * Supabase 세션 확인 후 커스텀 JWT 세션 쿠키를 설정하는 핵심 함수
   */
  const createSessionCookie = async (accessToken: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/social-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ access_token: accessToken }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        console.error('Session cookie creation failed:', data);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session cookie creation error:', error);
      return false;
    }
  };

  const handleCallback = async () => {
    try {
      console.log('Auth callback - URL:', window.location.href);
      console.log('Hash:', window.location.hash ? 'present' : 'empty');
      console.log('Search:', window.location.search || 'empty');

      // Supabase의 detectSessionInUrl이 hash fragment를 자동 처리
      // onAuthStateChange로 세션이 설정될 때까지 대기
      const waitForSession = (): Promise<any> => {
        return new Promise((resolve, reject) => {
          let subscription: { unsubscribe: () => void } | null = null;

          const cleanup = () => {
            try { subscription?.unsubscribe(); } catch {}
          };

          const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('Session timeout'));
          }, 10000); // 10초 타임아웃

          // 먼저 현재 세션 확인
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
              clearTimeout(timeout);
              cleanup();
              resolve(session);
              return;
            }

            // 세션이 없으면 auth state change 이벤트 대기
            const { data } = supabase.auth.onAuthStateChange(
              (event, session) => {
                console.log('Auth state changed:', event);
                if (event === 'SIGNED_IN' && session) {
                  clearTimeout(timeout);
                  cleanup();
                  resolve(session);
                }
              }
            );
            subscription = data.subscription;
          });
        });
      };

      const session = await waitForSession();

      if (session?.access_token) {
        console.log('Session established for:', session.user?.email);
        const cookieSet = await createSessionCookie(session.access_token);
        if (cookieSet) {
          toast.success('로그인 성공!');
          redirectToChat();
          return;
        }
        console.error('Failed to set session cookie');
        redirectToLogin('cookie_failed');
      } else {
        console.log('No session after waiting');
        redirectToLogin('no_session');
      }
    } catch (error: any) {
      console.error('Auth callback error:', error);
      if (error.message === 'Session timeout') {
        toast.error('로그인 시간이 초과되었습니다. 다시 시도해주세요.');
        redirectToLogin('timeout');
      } else {
        toast.error('로그인 처리 중 오류가 발생했습니다.');
        redirectToLogin('callback_error');
      }
    }
  };

  useEffect(() => {
    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <Card variant="elevated" className="max-w-md w-full shadow-2xl">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Sparkles className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold mb-4">인증 처리 중...</h2>
          <p className="text-gray-600">
            잠시만 기다려주세요.
          </p>
          <div className="mt-6 flex justify-center space-x-2">
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce animate-delay-100"></div>
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce animate-delay-200"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

