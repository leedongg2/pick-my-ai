import { NextRequest, NextResponse } from 'next/server';
import { createSecureToken } from '@/lib/secureAuth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const { access_token } = await request.json();

    if (!access_token) {
      return NextResponse.json(
        { error: '토큰이 필요합니다.' },
        { status: 400 }
      );
    }

    // Supabase access_token으로 사용자 정보 확인
    const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(access_token);

    if (userError || !user) {
      console.error('Social session - user verification failed:', userError);
      return NextResponse.json(
        { error: '사용자 인증에 실패했습니다.' },
        { status: 401 }
      );
    }

    // users 테이블에서 사용자 정보 조회
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    let userName = user.user_metadata?.full_name || 
                   user.user_metadata?.name || 
                   user.email?.split('@')[0] || 
                   'User';

    // 사용자가 없으면 생성
    if (dbError || !userData) {
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email!,
          name: userName,
        })
        .select()
        .single();

      if (insertError) {
        // 이미 존재하는 경우 (race condition) 다시 조회
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (existingUser) {
          userName = existingUser.name;
        } else {
          console.error('Social session - user creation failed:', insertError);
          return NextResponse.json(
            { error: '사용자 정보 생성에 실패했습니다.' },
            { status: 500 }
          );
        }
      } else if (newUser) {
        userName = newUser.name;
        
        // 지갑 생성
        await supabase
          .from('user_wallets')
          .insert({
            user_id: user.id,
            credits: {},
          });
      }
    } else {
      userName = userData.name;
    }

    // 커스텀 JWT 세션 토큰 생성
    const sessionToken = await createSecureToken({
      userId: user.id,
      email: user.email!,
      name: userName,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: userName,
      }
    });

    // HttpOnly 세션 쿠키 설정
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7일
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Social session error:', error);
    return NextResponse.json(
      { error: '세션 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
