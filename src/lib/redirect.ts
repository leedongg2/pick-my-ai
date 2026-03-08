/**
 * 도메인 리다이렉트 유틸리티
 * 프로덕션/개발 환경에서 올바른 도메인으로 리다이렉트
 */

/**
 * 환경에 맞는 기본 URL 가져오기
 */
export function getBaseUrl(): string {
  // OAuth/쿠키 흐름은 실제 접속 origin과 일치해야 하므로 브라우저에서는 현재 origin을 최우선 사용
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  const baseUrl =
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://pickmyai.store';

  if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
    return baseUrl;
  }

  return `https://${baseUrl}`;
}

/**
 * 안전한 리다이렉트 (전체 페이지 리로드)
 * OAuth 콜백 등에서 사용
 */
export function safeRedirect(path: string): void {
  const baseUrl = getBaseUrl();
  const fullUrl = path.startsWith('http') ? path : `${baseUrl}${path}`;
  
  if (typeof window !== 'undefined') {
    window.location.href = fullUrl;
  }
}

/**
 * 클라이언트 사이드 리다이렉트 (Next.js router 사용)
 * 일반 페이지 이동에서 사용
 */
export function clientRedirect(path: string): string {
  // 절대 경로면 그대로 반환
  if (path.startsWith('http')) {
    return path;
  }
  
  // 상대 경로면 기본 URL 추가
  const baseUrl = getBaseUrl();
  return `${baseUrl}${path}`;
}

/**
 * 로그인 페이지로 리다이렉트
 */
export function redirectToLogin(error?: string): void {
  const baseUrl = getBaseUrl();
  const errorParam = error ? `?error=${encodeURIComponent(error)}` : '';
  safeRedirect(`/login${errorParam}`);
}

/**
 * 채팅 페이지로 리다이렉트
 */
export function redirectToChat(): void {
  safeRedirect('/chat');
}

/**
 * 대시보드로 리다이렉트
 */
export function redirectToDashboard(): void {
  safeRedirect('/dashboard');
}
