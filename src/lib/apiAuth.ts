import { NextRequest, NextResponse } from 'next/server';
import { supabase } from './supabase';
import { jwtVerify } from 'jose';

/**
 * API 요청 인증 미들웨어
 */
export async function verifyAuth(request: NextRequest): Promise<{ 
  authenticated: boolean; 
  userId?: string; 
  error?: string 
}> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authenticated: false, error: '인증 토큰이 없습니다.' };
    }

    const token = authHeader.substring(7);

    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return { authenticated: false, error: '유효하지 않은 토큰입니다.' };
      }

      return { authenticated: true, userId: user.id };
    }

    return { authenticated: true };
  } catch (error) {
    return { authenticated: false, error: '인증 처리 중 오류가 발생했습니다.' };
  }
}

/**
 * 인증이 필요한 API 핸들러를 래핑
 */
export function withAuth(
  handler: (request: NextRequest, userId: string) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const auth = await verifyAuth(request);

    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    return handler(request, auth.userId!);
  };
}

/**
 * CSRF 토큰 검증
 */
export function verifyCsrfToken(request: NextRequest): boolean {
  const csrfToken = request.headers.get('x-csrf-token');
  const cookieToken = request.cookies.get('csrf-token')?.value;

  if (!csrfToken || !cookieToken) {
    return false;
  }

  return csrfToken === cookieToken;
}

/**
 * 관리자 권한 확인
 */
export async function verifyAdmin(userId: string): Promise<boolean> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return false;
    }

    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.role === 'admin';
  } catch {
    return false;
  }
}

/**
 * 세션 쿠키 검증 (HttpOnly)
 */
export async function verifySession(request: NextRequest): Promise<{ 
  authenticated: boolean; 
  userId?: string; 
  email?: string;
  name?: string;
  error?: string 
}> {
  try {
    const sessionToken = request.cookies.get('session')?.value;

    if (!sessionToken) {
      return { authenticated: false, error: '세션 토큰이 없습니다.' };
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return { authenticated: false, error: 'JWT_SECRET이 설정되지 않았습니다.' };
    }

    const key = new TextEncoder().encode(secret);

    const { payload } = await jwtVerify(sessionToken, key, {
      algorithms: ['HS256'],
    });

    return {
      authenticated: true,
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch (error: any) {
    return {
      authenticated: false,
      error: error?.message || '세션 검증 실패',
    };
  }
}
