import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSecureToken } from '@/lib/secureAuth';
import { RateLimiter, getClientIp } from '@/lib/rateLimit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const naverCallbackRateLimiter = new RateLimiter(20, 5 * 60 * 1000);

function getServerBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://pickmyai.store';
}

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rl = naverCallbackRateLimiter.check(`naver-callback:${clientIp}`);
  if (!rl.success) {
    return NextResponse.redirect(new URL(`${getServerBaseUrl()}/login?error=too_many_requests`));
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const baseUrl = getServerBaseUrl();
  
  if (error) {
    return NextResponse.redirect(new URL(`${baseUrl}/login?error=naver_auth_failed`));
  }

  if (!code || !state || code.length > 512 || state.length > 512) {
    return NextResponse.redirect(new URL(`${baseUrl}/login?error=invalid_callback`));
  }

  const naverClientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID || '';
  const naverClientSecret = process.env.NAVER_CLIENT_SECRET || '';

  if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey || !naverClientId || !naverClientSecret) {
    return NextResponse.redirect(new URL(`${baseUrl}/login?error=naver_not_configured`));
  }

  try {
    // 네이버 토큰 교환
    const tokenResponse = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: naverClientId,
        client_secret: naverClientSecret,
        code: code,
        state: state,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error('Failed to get access token');
    }

    // 네이버 사용자 정보 가져오기
    const userResponse = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();

    if (userData.resultcode !== '00') {
      throw new Error('Failed to get user info');
    }

    const naverUser = userData.response;
    const email = naverUser.email;
    const name = naverUser.name || naverUser.nickname || email?.split('@')[0] || 'User';

    if (typeof email !== 'string' || !email.trim() || email.length > 320) {
      throw new Error('Failed to resolve Naver user email');
    }

    // 서버사이드 Supabase Admin 클라이언트 사용
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 사용자 확인 또는 생성
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    let userId: string;
    let userName = name;

    if (existingUser) {
      userId = existingUser.id;
      userName = existingUser.name;
    } else {
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          email: email,
          name: name,
        })
        .select()
        .single();

      if (createError || !newUser) {
        throw new Error('Failed to create user');
      }

      userId = newUser.id;

      // 지갑 생성
      await supabaseAdmin
        .from('user_wallets')
        .insert({
          user_id: userId,
          credits: {},
        });
    }

    // 보안 강화된 JWT 세션 토큰 생성 (Google 로그인과 동일한 방식)
    const sessionToken = await createSecureToken({
      userId,
      email,
      name: userName,
    });

    const response = NextResponse.redirect(new URL(`${baseUrl}/chat`));
    
    // Google 로그인과 동일한 session 쿠키 사용 (통일)
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7일
      path: '/',
    });

    return response;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Naver OAuth error:', error);
    }
    return NextResponse.redirect(new URL(`${baseUrl}/login?error=naver_auth_failed`));
  }
}
