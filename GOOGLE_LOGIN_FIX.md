# Google 로그인 도메인 리다이렉트 문제 완전 해결

## 문제 원인
Google 로그인을 포함한 모든 OAuth 로그인에서 `window.location.origin`을 사용하여 프로덕션 환경에서 `localhost`로 리다이렉트되는 문제

## 해결된 파일 및 내용

### 1. `src/lib/auth.ts`
- **회원가입 emailRedirectTo**: `NEXT_PUBLIC_APP_URL` 사용
- **Naver OAuth redirectUri**: `NEXT_PUBLIC_APP_URL` 사용  
- **Google/GitHub OAuth**: `NEXT_PUBLIC_APP_URL` 사용
- **이메일 재전송**: `NEXT_PUBLIC_APP_URL` 사용
- **비밀번호 재설정**: `NEXT_PUBLIC_APP_URL` 사용

### 2. `src/components/Auth.tsx`
- **Naver 로그인**: `NEXT_PUBLIC_APP_URL` 우선 사용

### 3. `src/app/api/auth/naver/callback/route.ts`
- **모든 리다이렉트**: `NEXT_PUBLIC_APP_URL` 기반

### 4. `src/app/auth/callback/page.tsx`
- **Supabase Auth 콜백**: 모든 리다이렉트를 `window.location.href` + `NEXT_PUBLIC_APP_URL`로 변경

## 핵심 변경점

```typescript
// 이전 코드
const redirectUri = `${window.location.origin}/api/auth/naver/callback`;
router.push('/login');

// 수정된 코드
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const redirectUri = `${baseUrl}/api/auth/naver/callback`;
window.location.href = `${baseUrl}/login`;
```

## 환경 변수 설정 (필수)

### 프로덕션 환경 (.env.production)
```bash
NEXT_PUBLIC_APP_URL=https://pickmyai.store
NEXT_PUBLIC_SITE_URL=https://pickmyai.store
```

### 개발 환경 (.env.local)
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Supabase OAuth 설정

### Google OAuth
- **Authorized redirect URIs**: 
  - `https://pickmyai.store/auth/callback`
  - `http://localhost:3000/auth/callback`

### GitHub OAuth  
- **Authorization callback URL**:
  - `https://pickmyai.store/auth/callback`
  - `http://localhost:3000/auth/callback`

## 테스트 확인 사항

1. **Google 로그인**: 성공 후 `https://pickmyai.store/chat`으로 이동
2. **GitHub 로그인**: 성공 후 `https://pickmyai.store/chat`으로 이동  
3. **Naver 로그인**: 성공 후 `https://pickmyai.store/chat`으로 이동
4. **이메일 인증**: 완료 후 `https://pickmyai.store/login`으로 이동
5. **에러 발생 시**: `https://pickmyai.store/login`으로 이동

## 동작 방식

1. **환경 변수 우선**: `NEXT_PUBLIC_APP_URL`이 항상 우선 적용
2. **Fallback**: 환경 변수가 없을 때만 `http://localhost:3000` 사용
3. **전체 리다이렉트**: `window.location.href`를 사용하여 전체 페이지 리로드

이제 모든 OAuth 로그인이 올바른 도메인으로 리다이렉트됩니다!
