import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkIPSecurity, recordIPActivity, validateRequestHeaders, securityLog } from '@/lib/security';
import { getClientIp } from '@/lib/rateLimit';
import { jwtVerify } from 'jose';

// CSRF 토큰 생성
function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function middleware(request: NextRequest) {
  // 보호된 경로 정의
  const protectedPaths = ['/dashboard', '/settings', '/configurator', '/checkout', '/feedback'];
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path));
  
  // 보호된 경로에 대한 세션 검증
  if (isProtectedPath) {
    const sessionToken = request.cookies.get('session')?.value;
    
    if (!sessionToken) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret || secret.length < 32) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
      }
      
      const key = new TextEncoder().encode(secret);
      await jwtVerify(sessionToken, key, {
        algorithms: ['HS256'],
      });
    } catch (error) {
      // 모든 JWT 에러는 로그인 페이지로 리다이렉트
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  // IP 보안 체크
  const clientIp = getClientIp(request);
  const ipCheck = checkIPSecurity(clientIp);
  
  if (!ipCheck.allowed) {
    securityLog('warn', 'IP 차단', { ip: clientIp, reason: ipCheck.reason });
    return NextResponse.json(
      { error: ipCheck.reason || 'Access denied' },
      { status: 403 }
    );
  }
  
  // 요청 헤더 검증
  const headerCheck = validateRequestHeaders(request.headers);
  if (!headerCheck.valid) {
    securityLog('warn', '헤더 검증 실패', { ip: clientIp, reason: headerCheck.reason });
    return NextResponse.json(
      { error: headerCheck.reason || 'Invalid request' },
      { status: 400 }
    );
  }
  
  // IP 활동 기록
  recordIPActivity(clientIp);

  const requestHeaders = new Headers(request.headers);
  const existingCsrfToken = request.cookies.get('csrf-token')?.value;
  const csrfTokenForThisRequest = existingCsrfToken || generateCsrfToken();
  requestHeaders.set('x-middleware-csrf-token', csrfTokenForThisRequest);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // CSRF 토큰 설정 (POST, PUT, DELETE 요청에 대해)
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const csrfCookie = request.cookies.get('csrf-token');
    const csrfHeader = request.headers.get('x-csrf-token');

    // API 라우트에 대한 CSRF 검증 (일부 공개 엔드포인트 제외)
    if (request.nextUrl.pathname.startsWith('/api/')) {
      // 공개 엔드포인트는 CSRF 검증 제외
      const publicEndpoints = ['/api/auth/login', '/api/auth/register', '/api/auth/social-session', '/api/chat']; // TODO: /api/chat도 CSRF 검증을 통일하는 것이 이상적이지만 현재는 예외 유지
      const isPublicEndpoint = publicEndpoints.some(endpoint => 
        request.nextUrl.pathname.startsWith(endpoint)
      );

      if (!isPublicEndpoint) {
        // CSRF 토큰 검증 (타이밍 안전한 비교)
        if (!csrfCookie || !csrfHeader) {
          return NextResponse.json(
            { error: '요청이 유효하지 않습니다.' },
            { status: 403 }
          );
        }
        
        // 타이밍 공격 방지를 위한 상수 시간 비교
        const cookieValue = csrfCookie.value;
        const headerValue = csrfHeader;
        
        if (cookieValue.length !== headerValue.length) {
          return NextResponse.json(
            { error: '요청이 유효하지 않습니다.' },
            { status: 403 }
          );
        }
        
        let mismatch = 0;
        for (let i = 0; i < cookieValue.length; i++) {
          mismatch |= cookieValue.charCodeAt(i) ^ headerValue.charCodeAt(i);
        }
        
        if (mismatch !== 0) {
          return NextResponse.json(
            { error: '요청이 유효하지 않습니다.' },
            { status: 403 }
          );
        }
      }
    }
  }

  // CSRF 토큰이 없으면 생성
  if (!existingCsrfToken) {
    response.cookies.set('csrf-token', csrfTokenForThisRequest, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24시간
    });
  }

  // 보안 헤더 추가 (강화된 보안 정책)
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY'); // SAMEORIGIN -> DENY로 강화
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  
  // Content Security Policy 강화
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com;"
    );
  }

  return response;
}

// Middleware가 실행될 경로 설정
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
