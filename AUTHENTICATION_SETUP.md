# 인증 시스템 설정 가이드

## 개요

Pick-My-AI는 Supabase를 사용한 완전한 이메일 인증 시스템을 제공합니다.

### 기능

- ✅ 이메일/비밀번호 회원가입
- ✅ 이메일 인증 (Verification)
- ✅ 로그인/로그아웃
- ✅ 비밀번호 재설정
- ✅ 이메일 인증 재전송
- ✅ 사용자별 데이터 분리
- ✅ 로컬 모드 fallback (개발용)

## 1. Supabase 설정

### 1.1 프로젝트 생성

1. [Supabase](https://supabase.com) 대시보드 접속
2. 새 프로젝트 생성
3. **Settings > API**에서 키 복사:
   - `Project URL`
   - `anon public key`
   - `service_role key`

### 1.2 이메일 인증 설정

**Authentication > Settings**에서 설정:

```
✅ Enable email confirmations (활성화)
```

**이메일 템플릿 커스터마이징 (선택사항):**

1. **Authentication > Email Templates** 이동
2. `Confirm signup` 템플릿 편집
3. 원하는 디자인으로 수정

### 1.3 리다이렉트 URL 추가

**Authentication > URL Configuration**:

```
Redirect URLs:
- http://localhost:3000/auth/callback (개발)
- https://yourdomain.com/auth/callback (프로덕션)
- http://localhost:3000/auth/reset-password (개발)
- https://yourdomain.com/auth/reset-password (프로덕션)
```

### 1.4 데이터베이스 스키마

`supabase-setup.sql` 파일을 **SQL Editor**에서 실행:

```sql
-- users 테이블 생성
-- user_wallets 테이블 생성
-- transactions 테이블 생성
-- chat_sessions 테이블 생성
-- RLS 정책 설정
-- 트리거 설정
```

## 2. 환경 변수 설정

`.env.local` 파일 생성:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 기타 설정
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 3. 이메일 제공자 설정 (프로덕션)

### 기본 (Supabase 이메일)

개발 중에는 Supabase 기본 이메일 사용 가능 (일일 제한 있음)

### SendGrid 사용 (권장)

1. [SendGrid](https://sendgrid.com) 가입
2. API 키 생성
3. **Settings > Auth > SMTP Settings**에서 설정:

```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Password: YOUR_SENDGRID_API_KEY
```

### AWS SES 사용

1. AWS SES 설정
2. SMTP 자격 증명 생성
3. Supabase SMTP 설정에 입력

## 4. 사용 흐름

### 4.1 회원가입

```
1. 사용자가 이메일, 비밀번호, 이름 입력
2. Supabase Auth에 사용자 생성
3. users 테이블에 정보 저장
4. 자동으로 인증 이메일 전송
5. 이메일 인증 대기 화면 표시
```

### 4.2 이메일 인증

```
1. 사용자가 이메일의 인증 링크 클릭
2. /auth/callback으로 리다이렉트
3. 토큰 검증 및 세션 생성
4. /login?verified=true로 리다이렉트
5. 성공 메시지 표시
```

### 4.3 로그인

```
1. 이메일/비밀번호 입력
2. Supabase Auth로 인증
3. users 테이블에서 사용자 정보 로드
4. 사용자별 데이터 (지갑, 채팅 등) 로드
5. /dashboard로 리다이렉트
```

### 4.4 비밀번호 재설정

```
1. 로그인 페이지에서 "비밀번호를 잊으셨나요?" 클릭
2. 이메일 입력
3. 비밀번호 재설정 이메일 전송
4. 이메일의 링크 클릭
5. /auth/reset-password로 리다이렉트
6. 새 비밀번호 입력 및 변경
```

## 5. 파일 구조

```
src/
├── lib/
│   ├── auth.ts                      # 인증 서비스
│   └── supabase.ts                  # Supabase 클라이언트
├── app/
│   ├── login/page.tsx               # 로그인/회원가입 페이지
│   └── auth/
│       ├── callback/page.tsx        # 이메일 인증 콜백
│       └── reset-password/page.tsx  # 비밀번호 재설정
└── components/
    └── Auth.tsx                     # 인증 UI 컴포넌트
```

## 6. API 함수

### AuthService.register()

```typescript
const result = await AuthService.register(email, password, name);
// Returns: { success, error?, requiresEmailVerification? }
```

### AuthService.login()

```typescript
const result = await AuthService.login(email, password);
// Returns: { success, user?, error? }
```

### AuthService.logout()

```typescript
await AuthService.logout();
```

### AuthService.sendPasswordResetEmail()

```typescript
const result = await AuthService.sendPasswordResetEmail(email);
// Returns: { success, error? }
```

### AuthService.resendVerificationEmail()

```typescript
const result = await AuthService.resendVerificationEmail(email);
// Returns: { success, error? }
```

### AuthService.updatePassword()

```typescript
const result = await AuthService.updatePassword(newPassword);
// Returns: { success, error? }
```

## 7. 테스트

### 로컬 모드 (Supabase 없이)

```bash
# .env.local 파일 없이 실행
npm run dev

# 데모 계정 사용
demo@pickmyai.com / demo1234
test@pickmyai.com / test1234
```

### 실제 이메일 인증 테스트

```bash
# 1. Supabase 설정 완료
# 2. .env.local 파일 생성
# 3. 서버 실행
npm run dev

# 4. 회원가입
# 5. 이메일 확인 (스팸함 포함)
# 6. 인증 링크 클릭
# 7. 로그인
```

## 8. 보안 체크리스트

### 개발 환경

- ✅ `.env.local` 파일이 `.gitignore`에 있는지 확인
- ✅ 이메일 확인 비활성화 가능 (빠른 테스트용)
- ✅ 데모 계정 사용

### 프로덕션 환경

- ⚠️ 이메일 확인 반드시 활성화
- ⚠️ SMTP 제공자 설정 (SendGrid/AWS SES)
- ⚠️ HTTPS 사용
- ⚠️ 환경 변수 안전하게 관리
- ⚠️ Rate Limiting 설정
- ⚠️ RLS 정책 확인

## 9. 이메일 템플릿 커스터마이징

### Confirm Signup 템플릿ㄱ

```html
<h2>Pick-My-AI 가입을 환영합니다!</h2>
<p>아래 버튼을 클릭하여 이메일을 인증해주세요:</p>
<a href="{{ .ConfirmationURL }}">이메일 인증하기</a>    
<p>이 링크는 24시간 동안 유효합니다.</p>
```

### Reset Password 템플릿

```html
<h2>비밀번호 재설정</h2>
<p>비밀번호를 재설정하려면 아래 버튼을 클릭해주세요:</p>
<a href="{{ .ConfirmationURL }}">비밀번호 재설정하기</a>
<p>요청하지 않으셨다면 이 이메일을 무시하세요.</p>
```

## 10. 문제 해결

### 이메일이 오지 않아요

1. **스팸함 확인**
2. **Supabase 대시보드에서 이메일 전송 로그 확인**
   - Authentication > Logs
3. **일일 전송 제한 확인**
   - 기본 Supabase 이메일은 제한 있음
   - SendGrid 사용 권장
4. **SMTP 설정 확인**

### 인증 링크가 작동하지 않아요

1. **Redirect URLs 설정 확인**
2. **브라우저 콘솔에서 에러 확인**
3. **토큰 만료 확인** (24시간)
4. **인증 재전송** 시도

### 로그인이 안 돼요

1. **이메일 인증 완료 확인**
2. **비밀번호 확인** (최소 6자)
3. **Supabase 대시보드에서 사용자 상태 확인**
   - Authentication > Users
   - Email Confirmed 체크
4. **브라우저 콘솔 에러 확인**

### 비밀번호를 잊어버렸어요

1. 로그인 페이지에서 "비밀번호를 잊으셨나요?" 클릭
2. 이메일 입력
3. 받은 이메일에서 링크 클릭
4. 새 비밀번호 설정

## 11. 모범 사례

### 비밀번호 정책

```typescript
// 최소 6자 (Supabase 기본)
// 권장: 8자 이상, 대소문자/숫자/특수문자 포함
if (password.length < 8) {
  return { error: '비밀번호는 8자 이상이어야 합니다.' };
}
```

### 이메일 검증

```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  return { error: '올바른 이메일 형식이 아닙니다.' };
}
```

### Rate Limiting

```typescript
// Supabase에서 자동 제공
// 추가 보호가 필요하면 Middleware에서 구현
```

## 12. 프로덕션 배포

### Vercel 배포

```bash
# 1. Vercel에 프로젝트 연결
vercel link

# 2. 환경 변수 설정
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY

# 3. 배포
vercel --prod
```

### 배포 후 체크리스트

- ✅ Redirect URLs에 프로덕션 URL 추가
- ✅ 이메일 템플릿의 링크 확인
- ✅ SMTP 설정 확인
- ✅ 테스트 계정으로 전체 흐름 테스트
- ✅ 에러 모니터링 설정

## 13. FAQ

### Q: 이메일 인증을 비활성화할 수 있나요?

A: **개발 중**에만 가능합니다. Supabase 대시보드 > Authentication > Settings에서 "Enable email confirmations" 체크 해제. **프로덕션에서는 반드시 활성화**하세요.

### Q: 소셜 로그인을 추가할 수 있나요?

A: 네. Supabase는 Google, GitHub, Facebook 등 다양한 OAuth 제공자를 지원합니다. Authentication > Providers에서 설정하세요.

### Q: 이메일 제공자 비용은?

A: 
- Supabase 기본: 무료 (제한 있음)
- SendGrid: 월 100통까지 무료
- AWS SES: 매우 저렴 (1,000통당 $0.10)

### Q: 사용자 데이터는 어디에 저장되나요?

A: Supabase 데이터베이스의 `users` 테이블에 저장됩니다. 인증 정보는 Supabase Auth에서 관리합니다.

### Q: GDPR 준수가 되나요?

A: Supabase는 GDPR을 준수합니다. 사용자 데이터 삭제 기능을 추가로 구현하세요.

## 14. 추가 리소스

- [Supabase 인증 문서](https://supabase.com/docs/guides/auth)
- [이메일 템플릿 가이드](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [SendGrid 설정](https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-smtp-api)

