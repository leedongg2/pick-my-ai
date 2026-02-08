'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Sparkles } from 'lucide-react';

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
 * Implicit flow: Supabase가 #access_token=xxx&refresh_token=yyy 형태로 hash fragment에 토큰 전달
 * hash fragment를 직접 파싱하여 access_token을 추출하고 서버 API로 전달하여 세션 쿠키 설정
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

    // 3) Query string에서 code 확인 (PKCE fallback - Supabase 설정에 따라)
    const code = urlParams.get('code');
    if (code) {
      console.log('[auth/callback] code found, sending to server for exchange...');
      const ok = await callCodeExchangeAPI(code);
      if (ok) {
        console.log('[auth/callback] Code exchange successful, redirecting to /chat');
        window.location.replace('/chat');
        return;
      }
      console.error('[auth/callback] Code exchange failed');
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
