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

      // 1) PKCE 방식: URL query string에서 code 파라미터 확인
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (code) {
        console.log('PKCE code found, exchanging for session...');
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error('Code exchange failed:', error);
          redirectToLogin('code_exchange_failed');
          return;
        }

        if (data.session) {
          console.log('Code exchange successful for:', data.session.user.email);
          const cookieSet = await createSessionCookie(data.session.access_token);
          if (cookieSet) {
            toast.success('로그인 성공!');
            redirectToChat();
            return;
          }
        }

        redirectToLogin('session_failed');
        return;
      }

      // 2) Implicit 방식: URL hash fragment에서 access_token 확인
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hashAccessToken = hashParams.get('access_token');
      const type = hashParams.get('type');

      console.log('Hash params:', { hasAccessToken: !!hashAccessToken, type });

      if (hashAccessToken) {
        // hash에 토큰이 있으면 Supabase가 자동으로 세션 설정
        // 잠시 대기 후 세션 확인
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          console.error('Session not found after hash token:', error);
          redirectToLogin('session_failed');
          return;
        }

        console.log('Session found for:', session.user.email);
        const cookieSet = await createSessionCookie(session.access_token);
        if (cookieSet) {
          toast.success('로그인 성공!');
          redirectToChat();
          return;
        }

        redirectToLogin('cookie_failed');
        return;
      }

      // 3) 아무 토큰도 없는 경우 - 마지막으로 기존 세션 확인
      console.log('No code or token found, checking existing session...');
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        console.log('Existing session found for:', session.user.email);
        const cookieSet = await createSessionCookie(session.access_token);
        if (cookieSet) {
          toast.success('로그인 성공!');
          redirectToChat();
          return;
        }
      }

      console.log('No session available, redirecting to login');
      redirectToLogin('no_session');
    } catch (error) {
      console.error('Auth callback error:', error);
      toast.error('로그인 처리 중 오류가 발생했습니다.');
      redirectToLogin('callback_error');
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

