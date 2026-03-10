'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const processed = useRef(false);

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

      // PKCE 표준 경로: Supabase SDK가 저장한 code_verifier를 사용해 세션 교환
      const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (!exchangeError) {
        const accessToken = exchangeData.session?.access_token;
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
      }

      // 일부 환경 fallback: 서버 code 교환 경로 시도
      console.warn('[auth/callback] PKCE exchange failed, trying server fallback...', exchangeError?.message);
      const ok = await callCodeExchangeAPI(code);
      if (ok) {
        console.log('[auth/callback] Server fallback exchange successful, redirecting to /chat');
        window.location.replace('/chat');
        return;
      }

      console.error('[auth/callback] Code exchange failed in both client/server paths');
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
    return true;
  } catch (err) {
    console.error('[auth/callback] social-session fetch error:', err);
    return false;
  }
}

/** code를 서버로 보내서 서버사이드에서 token 교환 + 세션 쿠키 설정 */
async function callCodeExchangeAPI(code: string): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/social-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error('[auth/callback] code exchange API error:', res.status, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[auth/callback] code exchange fetch error:', err);
    return false;
  }
}
