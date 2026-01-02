# 보안 가이드

이 문서는 Pick My AI 애플리케이션의 보안 설정 및 모범 사례를 설명합니다.

## 📋 목차

1. [환경 변수 보안](#환경-변수-보안)
2. [인증 및 권한](#인증-및-권한)
3. [API 보안](#api-보안)
4. [비밀번호 정책](#비밀번호-정책)
5. [입력 검증](#입력-검증)
6. [보안 헤더](#보안-헤더)
7. [Rate Limiting](#rate-limiting)
8. [CSRF 보호](#csrf-보호)
9. [보안 체크리스트](#보안-체크리스트)

---

## 🔐 환경 변수 보안

### 중요 사항

- **절대로 `.env` 파일을 Git에 커밋하지 마세요**
- `.env` 파일은 `.gitignore`에 포함되어 있습니다
- `.env.example` 파일을 참고하여 환경 변수를 설정하세요

### 환경 변수 설정

```bash
# .env 파일 생성
cp .env.example .env

# 민감한 정보 입력
# - API 키
# - 데이터베이스 자격 증명
# - JWT 시크릿 (최소 32자)
```

### 프로덕션 환경

- 환경 변수는 호스팅 플랫폼의 환경 변수 설정을 사용하세요
- Vercel, Netlify, AWS 등에서 제공하는 환경 변수 관리 기능 활용
- 정기적으로 API 키를 로테이션하세요

---

## 🔑 인증 및 권한

### Supabase 인증

- 이메일 인증 활성화
- Row Level Security (RLS) 정책 적용
- JWT 토큰 기반 인증

### 세션 관리

- 세션 타임아웃: 24시간
- 자동 로그아웃 기능
- Refresh Token 자동 갱신

### 권한 관리

```typescript
// 관리자 권한 확인
import { verifyAdmin } from '@/lib/apiAuth';

const isAdmin = await verifyAdmin(userId);
```

---

## 🛡️ API 보안

### Rate Limiting

모든 API 엔드포인트에 Rate Limiting이 적용됩니다:

- **Chat API**: 분당 20회
- **기본 API**: 15분당 100회

```typescript
import { RateLimiter } from '@/lib/rateLimit';

const limiter = new RateLimiter(20, 60 * 1000); // 분당 20회
const result = limiter.check(clientIp);
```

### 인증 미들웨어

보호된 API 라우트:

```typescript
import { withAuth } from '@/lib/apiAuth';

export const POST = withAuth(async (request, userId) => {
  // 인증된 사용자만 접근 가능
});
```

### 입력 검증

모든 API 요청에 대해:

- 메시지 개수 제한: 최대 100개
- 메시지 길이 제한: 최대 50,000자
- 첨부파일 개수 제한: 최대 10개
- 첨부파일 크기 제한: 최대 10MB

---

## 🔒 비밀번호 정책

### 요구사항

- **최소 길이**: 8자
- **복잡도**: 대문자, 소문자, 숫자, 특수문자 중 최소 3가지 포함
- **제한사항**:
  - 동일 문자 3번 이상 연속 금지
  - 흔한 패턴 금지 (123456, password 등)
  - 이메일과 유사한 비밀번호 금지

### 비밀번호 검증

```typescript
import { PasswordValidator } from '@/lib/passwordValidator';

const result = PasswordValidator.validate(password);
if (!result.isValid) {
  console.error(result.errors);
}
```

### 비밀번호 강도

- **약함**: 기본 요구사항만 충족
- **보통**: 10자 이상 + 3가지 이상 문자 유형
- **강함**: 12자 이상 + 4가지 문자 유형

---

## ✅ 입력 검증

### Sanitization 유틸리티

```typescript
import {
  escapeHtml,
  validateEmail,
  validateUrl,
  sanitizeFilename,
  validateUuid
} from '@/lib/sanitize';

// HTML 이스케이프
const safe = escapeHtml(userInput);

// 이메일 검증
if (!validateEmail(email)) {
  throw new Error('Invalid email');
}

// URL 검증
if (!validateUrl(url)) {
  throw new Error('Invalid URL');
}
```

### XSS 방지

- 모든 사용자 입력은 HTML 이스케이프 처리
- `dangerouslySetInnerHTML` 사용 금지
- Content Security Policy (CSP) 적용

### SQL Injection 방지

- Supabase의 Prepared Statements 사용
- 직접 SQL 쿼리 작성 금지
- RLS 정책으로 데이터 접근 제한

---

## 🛡️ 보안 헤더

### 적용된 헤더

`next.config.js`에 다음 헤더가 설정되어 있습니다:

```javascript
{
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': '...',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
}
```

### Content Security Policy (CSP)

- 스크립트: 자체 도메인 + Google + Toss Payments
- 스타일: 자체 도메인 + 인라인 스타일
- 이미지: 모든 HTTPS 소스
- 연결: API 엔드포인트만 허용

---

## ⏱️ Rate Limiting

### 구현

```typescript
// 메모리 기반 (개발 환경)
import { RateLimiter } from '@/lib/rateLimit';

// 프로덕션에서는 Redis 사용 권장
const limiter = new RateLimiter(100, 15 * 60 * 1000);
```

### API 키 로테이션 (429 에러 자동 처리)

각 AI 프로바이더당 최대 3개의 API 키를 설정할 수 있습니다:

```bash
# .env 파일
OPENAI_API_KEY_1=sk-proj-xxxxx
OPENAI_API_KEY_2=sk-proj-yyyyy
OPENAI_API_KEY_3=sk-proj-zzzzz
```

**작동 방식**:
1. 키1이 429 에러 발생 → 자동으로 키2 사용
2. 키2도 429 에러 발생 → 자동으로 키3 사용
3. 모든 키가 제한된 경우 → 가장 빨리 풀리는 키 대기

**Rate Limit 타입별 메시지**:
- **분단위 제한**: "분당 요청 한도를 초과했습니다. 1분 후에 다시 시도해주세요."
- **일단위 제한**: "일일 요청 한도를 초과했습니다. 내일 다시 시도해주세요."

자세한 내용은 [API_KEY_ROTATION_GUIDE.md](./API_KEY_ROTATION_GUIDE.md)를 참조하세요.

### 응답 헤더

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2024-01-01T12:00:00Z
Retry-After: 900
```

### 제한 초과 시

- HTTP 429 (Too Many Requests)
- Retry-After 헤더 포함
- 사용자에게 대기 시간 안내
- 자동 키 로테이션 시도

---

## 🔐 CSRF 보호

### 구현

`src/middleware.ts`에서 CSRF 토큰 검증:

```typescript
// POST, PUT, DELETE 요청에 대해 검증
if (request.method === 'POST') {
  const csrfToken = request.headers.get('x-csrf-token');
  const cookieToken = request.cookies.get('csrf-token');
  
  if (csrfToken !== cookieToken) {
    return new Response('CSRF token mismatch', { status: 403 });
  }
}
```

### 클라이언트 사용법

```typescript
// API 요청 시 CSRF 토큰 포함
const csrfToken = document.cookie
  .split('; ')
  .find(row => row.startsWith('csrf-token='))
  ?.split('=')[1];

fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'x-csrf-token': csrfToken
  }
});
```

---

## ✔️ 보안 체크리스트

### 배포 전 확인사항

- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는가?
- [ ] 모든 API 키가 환경 변수로 관리되는가?
- [ ] HTTPS가 활성화되어 있는가?
- [ ] Supabase RLS 정책이 적용되어 있는가?
- [ ] Rate Limiting이 모든 API에 적용되어 있는가?
- [ ] CSRF 보호가 활성화되어 있는가?
- [ ] 보안 헤더가 설정되어 있는가?
- [ ] 비밀번호 정책이 적용되어 있는가?
- [ ] 입력 검증이 모든 폼에 적용되어 있는가?
- [ ] 에러 메시지에 민감한 정보가 포함되지 않는가?

### 정기 점검

- [ ] API 키 로테이션 (3개월마다)
- [ ] 의존성 업데이트 및 보안 패치
- [ ] 로그 모니터링 및 이상 탐지
- [ ] 백업 및 복구 테스트
- [ ] 침투 테스트 (연 1회)

---

## 🚨 보안 이슈 보고

보안 취약점을 발견하셨나요?

1. **공개적으로 이슈를 생성하지 마세요**
2. 이메일로 보고: security@pickmyai.com
3. 상세한 재현 방법 포함
4. 24-48시간 내 응답 예정

---

## 📚 추가 리소스

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
- [Supabase Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Web Security Academy](https://portswigger.net/web-security)

---

## 📝 변경 이력

### 2025-10-18  
- 초기 보안 설정 문서 작성
- Rate Limiting 구현
- CSRF 보호 추가
- 비밀번호 정책 강화
- 보안 헤더 설정
- 입력 검증 강화

---

**마지막 업데이트**: 2025-10-18
**버전**: 1.0.0
