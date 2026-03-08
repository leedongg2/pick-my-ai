'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store';

export default function AuthCallbackPage() {
  const processed = useRef(false);
  const language = useStore((state) => state.language);
  const ui = useMemo(() => {
    if (language === 'en') {
      return { title: 'Processing authentication...', subtitle: 'Please wait a moment.' };
    }
    if (language === 'ja') {
      return { title: '認証を処理中...', subtitle: 'しばらくお待ちください。' };
    }
    return { title: '인증 처리 중...', subtitle: '잠시만 기다려주세요.' };
  }, [language]);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <Card variant="elevated" className="max-w-md w-full shadow-2xl">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Sparkles className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold mb-4">{ui.title}</h2>
          <p className="text-gray-600">{ui.subtitle}</p>
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

/**
 * OAuth 콜백 처리
 * 
 * PKCE flow 우선: code를 Supabase SDK(exchangeCodeForSession)로 교환
 * hash fragment access_token(레거시/호환 경로)이 있으면 fallback으로 처리
 */
async function handleCallback() {
  try {
    const hash = window.location.hash;
    const search = window.location.search;

    console.log('[auth/callback] hash present:', !!hash, 'search present:', !!search);

    // 1) URL query string에서 에러 확인
    const urlParams = new URLSearchParams(search);
    const errorParam = urlParams.get('error');
    if (errorParam) {
      const desc = urlParams.get('error_description') || errorParam;
      console.error('[auth/callback] OAuth error:', desc);
      window.location.replace('/login?error=' + encodeURIComponent(errorParam));
      return;
    }

    // 2) Hash fragment에서 access_token 추출 (implicit flow)
    if (hash && hash.length > 1) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const errorInHash = hashParams.get('error');

      if (errorInHash) {
        console.error('[auth/callback] Hash error:', errorInHash);
        window.location.replace('/login?error=' + encodeURIComponent(errorInHash));
        return;
      }

      if (accessToken) {
        console.log('[auth/callback] access_token found in hash, setting session cookie...');
        const ok = await callSocialSessionAPI(accessToken);
        if (ok) {
          console.log('[auth/callback] Session cookie set, redirecting to /chat');
          window.location.replace('/chat');
          return;
        }
        console.error('[auth/callback] Failed to set session cookie');
        window.location.replace('/login?error=cookie_failed');
        return;
      }
    }

    // 3) Query string에서 code 확인 (PKCE)
    const code = urlParams.get('code');
    if (code) {
      console.log('[auth/callback] code found, exchanging via Supabase client...');

      const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      let accessToken = exchangeData.session?.access_token;

      if (!accessToken) {
        const { data: sessionData } = await supabase.auth.getSession();
        accessToken = sessionData.session?.access_token;
      }

      if (accessToken) {
        const ok = await callSocialSessionAPI(accessToken);
        if (ok) {
          console.log('[auth/callback] PKCE exchange successful, redirecting to /chat');
          window.location.replace('/chat');
          return;
        }
        console.error('[auth/callback] Session cookie setup failed after PKCE exchange');
        window.location.replace('/login?error=cookie_failed');
        return;
      }

      console.error('[auth/callback] Code exchange failed:', exchangeError?.message);
      window.location.replace('/login?error=exchange_failed');
      return;
    }

    // 4) 아무것도 없으면 로그인으로
    console.log('[auth/callback] No token or code found');
    window.location.replace('/login?error=no_token');
  } catch (err) {
    console.error('[auth/callback] Unexpected error:', err);
    window.location.replace('/login?error=callback_error');
  }
}

/** access_token을 서버로 보내서 커스텀 JWT 세션 쿠키 설정 */
async function callSocialSessionAPI(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/social-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ access_token: accessToken }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error('[auth/callback] social-session API error:', res.status, body);
      return false;
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const sessionRes = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      if (sessionRes.ok) {
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    console.error('[auth/callback] session cookie was not readable after social-session');
    return false;
  } catch (err) {
    console.error('[auth/callback] social-session fetch error:', err);
    return false;
  }
}
