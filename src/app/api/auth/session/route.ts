import { NextRequest, NextResponse } from 'next/server';
import { verifySecureToken } from '@/lib/secureAuth';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    // 보안 강화된 토큰 검증
    const result = verifySecureToken(sessionToken);

    if (!result.valid || !result.payload) {
      // 에러 상세 정보 숨김 (정보 노출 방지)
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: result.payload.userId,
        email: result.payload.email,
        name: result.payload.name,
      }
    });
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Session verification error:', error);
    }
    // 일반적인 응답 (정보 노출 방지)
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }
}
