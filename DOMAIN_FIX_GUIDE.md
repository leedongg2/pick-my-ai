# 도메인 리다이렉트 문제 해결 가이드

## 문제 원인
네이버 OAuth 로그인 후 프로덕션 환경에서 `localhost`로 리다이렉트되는 문제가 발생했습니다.

## 해결된 부분

### 1. Auth 컴포넌트 수정
```typescript
// 이전 코드
const redirectUri = `${window.location.origin}/api/auth/naver/callback`;

// 수정된 코드
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
const redirectUri = `${baseUrl}/api/auth/naver/callback`;
```

### 2. 네이버 콜백 API 수정
```typescript
// 모든 리다이렉트에 올바른 도메인 사용
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.url.split('/api/auth/naver/callback')[0];
const redirectUrl = `${baseUrl}/chat`;
```

## 배포 전 필수 확인

### 1. 환경 변수 설정
`.env` 파일에 반드시 설정해야 합니다:

```bash
# 프로덕션 환경
NEXT_PUBLIC_APP_URL=https://pickmyai.store
NEXT_PUBLIC_SITE_URL=https://pickmyai.store

# 네이버 OAuth
NEXT_PUBLIC_NAVER_CLIENT_ID=your-naver-client-id
NAVER_CLIENT_SECRET=your-naver-client-secret
```

### 2. 네이버 개발자 콘솔 설정
네이버 개발자 콘솔에서 리다이렉트 URI를 업데이트해야 합니다:

- **서비스 URL**: `https://pickmyai.store`
- **Callback URL**: `https://pickmyai.store/api/auth/naver/callback`
- **로그아웃 URL**: `https://pickmyai.store`

### 3. 배포 후 확인 사항
1. 네이버 로그인 버튼 클릭 시 올바른 도메인으로 이동
2. 로그인 성공 후 `https://pickmyai.store/chat`으로 리다이렉트
3. 로그인 실패 시 `https://pickmyai.store/login`으로 리다이렉트

## 테스트 방법

### 로컬 개발 환경
```bash
# .env.local
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 프로덕션 환경
```bash
# .env.production
NEXT_PUBLIC_APP_URL=https://pickmyai.store
```

## 주요 변경점

1. **환경 변수 우선순위**: `NEXT_PUBLIC_APP_URL` → `window.location.origin`
2. **모든 리다이렉트**: 절대 경로 사용
3. **에러 처리**: 일관된 도메인으로 리다이렉트

이제 프로덕션 환경에서도 올바른 도메인으로 리다이렉트됩니다.
