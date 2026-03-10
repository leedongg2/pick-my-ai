import { NextRequest, NextResponse } from 'next/server';
import { verifySecureToken, invalidateSession } from '@/lib/secureAuth';

export async function POST(request: NextRequest) {
  try {
    // 현재 세션 토큰에서 jti 추출하여 블랙리스트에 추가
    const sessionToken = request.cookies.get('session')?.value;
    if (sessionToken) {
      const result = await verifySecureToken(sessionToken);
      if (result.valid && result.payload?.jti) {
        // 세션 무효화 (토큰 재사용 방지)
        invalidateSession(result.payload.jti);
      }
    }

    const response = NextResponse.json({
      success: true,
      message: '로그아웃되었습니다.'
    });

    // 세션 쿠키 삭제
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    // Naver 세션 쿠키도 삭제
    response.cookies.set('naver_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Logout error:', error);
    }
    // 로그아웃은 에러가 발생해도 성공으로 처리 (쿠키는 삭제)
    const response = NextResponse.json({
      success: true,
      message: '로그아웃되었습니다.'
    });
    
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    
    return response;
  }
}
