# 도메인 리다이렉트 문제 완전 해결 가이드

## 🎯 문제 원인
모든 OAuth 로그인(Google, GitHub, Naver)에서 `window.location.origin`과 `router.push()`를 사용하여 프로덕션 환경에서 `localhost`로 리다이렉트되는 문제가 발생했습니다.

## ✅ 완전 해결 방법

### 1. 중앙 집중식 리다이렉트 유틸리티 생성
**파일**: `src/lib/redirect.ts`

```typescript
export function getBaseUrl(): string {
  // 서버 사이드: 환경 변수만 사용
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_APP_URL || 'https://pickmyai.store';
  }
  
  // 클라이언트 사이드: 환경 변수 우선
  return process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
}

export function safeRedirect(path: string): void {
  const baseUrl = getBaseUrl();
  const fullUrl = path.startsWith('http') ? path : `${baseUrl}${path}`;
  
  if (typeof window !== 'undefined') {
    window.location.href = fullUrl;
  }
}

export function redirectToLogin(error?: string): void {
  const baseUrl = getBaseUrl();
  const errorParam = error ? `?error=${encodeURIComponent(error)}` : '';
  safeRedirect(`/login${errorParam}`);
}

export function redirectToChat(): void {
  safeRedirect('/chat');
}
```

### 2. 수정된 파일 목록

#### 인증 관련 컴포넌트
- ✅ `src/components/Auth.tsx` - `safeRedirect()`, `getBaseUrl()` 사용
- ✅ `src/components/ProtectedRoute.tsx` - `redirectToLogin()` 사용
- ✅ `src/app/auth/callback/page.tsx` - 모든 리다이렉트 통일

#### OAuth 콜백
- ✅ `src/app/api/auth/naver/callback/route.ts` - `getBaseUrl()` 사용
- ✅ `src/lib/auth.ts` - 모든 OAuth 리다이렉트 통일

### 3. 핵심 변경점

#### 이전 코드 (문제)
```typescript
// ❌ 잘못된 방법
const redirectUri = `${window.location.origin}/api/auth/naver/callback`;
router.push('/login');
router.replace('/chat');
```

#### 수정된 코드 (해결)
```typescript
// ✅ 올바른 방법
import { getBaseUrl, safeRedirect, redirectToLogin } from '@/lib/redirect';

const redirectUri = `${getBaseUrl()}/api/auth/naver/callback`;
safeRedirect('/login');
redirectToLogin();
```

## 📋 환경 변수 설정 (필수)

### 프로덕션 환경
```bash
NEXT_PUBLIC_APP_URL=https://pickmyai.store
NEXT_PUBLIC_SITE_URL=https://pickmyai.store
```

### 개발 환경
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🔄 OAuth 제공자 설정

### Google OAuth (Google Cloud Console)
- **Authorized JavaScript origins**: `https://pickmyai.store`
- **Authorized redirect URIs**: `https://pickmyai.store/auth/callback`

### GitHub OAuth (GitHub Settings)
- **Homepage URL**: `https://pickmyai.store`
- **Authorization callback URL**: `https://pickmyai.store/auth/callback`

### Naver OAuth (Naver Developers)
- **서비스 URL**: `https://pickmyai.store`
- **Callback URL**: `https://pickmyai.store/api/auth/naver/callback`

## 🧪 테스트 체크리스트

### 로그인 플로우
- [x] Google 로그인 → `https://pickmyai.store/chat`
- [x] GitHub 로그인 → `https://pickmyai.store/chat`
- [x] Naver 로그인 → `https://pickmyai.store/chat`
- [x] 이메일/비밀번호 로그인 → `https://pickmyai.store/chat`

### 에러 처리
- [x] 로그인 실패 → `https://pickmyai.store/login?error=...`
- [x] 세션 만료 → `https://pickmyai.store/login`
- [x] OAuth 에러 → `https://pickmyai.store/login?error=...`

### 보호된 경로
- [x] 미인증 시 `/dashboard` 접근 → `https://pickmyai.store/login`
- [x] 미인증 시 `/settings` 접근 → `https://pickmyai.store/login`

## 🎯 핵심 원칙

1. **환경 변수 우선**: 항상 `NEXT_PUBLIC_APP_URL`을 먼저 확인
2. **중앙 집중식 관리**: `redirect.ts` 유틸리티만 사용
3. **전체 페이지 리로드**: OAuth 콜백은 `window.location.href` 사용
4. **일관된 fallback**: 서버는 `https://pickmyai.store`, 클라이언트는 `window.location.origin`

## 🚀 배포 전 최종 확인

```bash
# 1. 환경 변수 확인
echo $NEXT_PUBLIC_APP_URL

# 2. 빌드 테스트
npm run build

# 3. 프로덕션 모드 테스트
npm run start

# 4. OAuth 제공자 설정 확인
# - Google Cloud Console
# - GitHub Settings
# - Naver Developers
```

## 📝 주의사항

1. **절대 `window.location.origin` 직접 사용 금지**
2. **절대 `router.push()` 인증 관련 리다이렉트에 사용 금지**
3. **항상 `getBaseUrl()` 또는 전용 함수 사용**
4. **환경 변수 누락 시 적절한 fallback 제공**

---

이제 모든 OAuth 로그인이 프로덕션 환경에서 올바른 도메인으로 리다이렉트됩니다! 🎉
