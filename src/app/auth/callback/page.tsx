'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/Card';
import { Sparkles } from 'lucide-react';

export default function AuthCallbackPage() {
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const handleCallback = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const errorParam = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        console.log('[auth/callback] code:', !!code, 'error:', errorParam);

        // Supabase가 에러를 반환한 경우
        if (errorParam) {
          console.error('[auth/callback] OAuth error:', errorParam, errorDescription);
          window.location.href = `/login?error=${encodeURIComponent(errorParam)}`;
          return;
        }

        // PKCE: code가 있으면 클라이언트에서 exchange (code verifier가 localStorage에 있음)
        if (code) {
          console.log('[auth/callback] Exchanging code for session...');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.warn('[auth/callback] exchangeCodeForSession error (might be auto-handled):', error.message);
            // 에러가 나더라도 여기서 멈추지 않고 아래의 세션 확인 로직으로 진행합니다.
            // Supabase client가 detectSessionInUrl: true 옵션으로 인해 이미 코드를 소모했을 수 있기 때문입니다.
          } else if (data.session) {
            console.log('[auth/callback] Session obtained, setting cookie...');
            const ok = await setSessionCookie(data.session.access_token);
            if (ok) {
              window.location.href = '/chat';
              return;
            }
            window.location.href = '/login?error=cookie_failed';
            return;
          }
        }

        // Fallback: 이미 세션이 있는지 확인 (Code exchange 실패 시에도 여기로 도달)
        console.log('[auth/callback] No code, checking existing session...');
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('[auth/callback] Existing session found');
          const ok = await setSessionCookie(session.access_token);
          if (ok) {
            window.location.href = '/chat';
            return;
          }
        }

        console.log('[auth/callback] No session available');
        window.location.href = '/login?error=no_session';
      } catch (err) {
        console.error('[auth/callback] Unexpected error:', err);
        window.location.href = '/login?error=callback_error';
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <Card variant="elevated" className="max-w-md w-full shadow-2xl">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Sparkles className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold mb-4">인증 처리 중...</h2>
          <p className="text-gray-600">잠시만 기다려주세요.</p>
          <div className="mt-6 flex justify-center space-x-2">
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

async function setSessionCookie(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/social-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ access_token: accessToken }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error('[auth/callback] social-session API failed:', res.status, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[auth/callback] social-session fetch error:', err);
    return false;
  }
}
