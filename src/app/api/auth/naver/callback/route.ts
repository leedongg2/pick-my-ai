import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // 에러 처리 - 올바른 도메인으로 리다이렉트
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.url.split('/api/auth/naver/callback')[0];
  
  if (error) {
    const errorUrl = `${baseUrl}/login?error=naver_auth_failed`;
    return NextResponse.redirect(new URL(errorUrl));
  }

  if (!code || !state) {
    const errorUrl = `${baseUrl}/login?error=invalid_callback`;
    return NextResponse.redirect(new URL(errorUrl));
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
        client_id: process.env.NEXT_PUBLIC_NAVER_CLIENT_ID!,
        client_secret: process.env.NAVER_CLIENT_SECRET!,
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
    const name = naverUser.name || naverUser.nickname;

    // Supabase에서 사용자 확인 또는 생성
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // 새 사용자 생성
      const { data: newUser, error: createError } = await supabase
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
      await supabase
        .from('user_wallets')
        .insert({
          user_id: userId,
          credits: {},
        });
    }

    // 세션 생성 (Supabase Auth 우회)
    const sessionToken = Buffer.from(JSON.stringify({
      userId,
      email,
      name,
      provider: 'naver',
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7일
    })).toString('base64');

    // 올바른 도메인으로 리다이렉트
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.url.split('/api/auth/naver/callback')[0];
    const redirectUrl = `${baseUrl}/chat`;
    
    const response = NextResponse.redirect(new URL(redirectUrl));
    response.cookies.set('naver_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7일
    });

    return response;
  } catch (error) {
    console.error('Naver OAuth error:', error);
    // 올바른 도메인으로 에러 리다이렉트
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.url.split('/api/auth/naver/callback')[0];
    const errorUrl = `${baseUrl}/login?error=naver_auth_failed`;
    return NextResponse.redirect(new URL(errorUrl));
  }
}
