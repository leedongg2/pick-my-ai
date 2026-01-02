# Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 가입하고 새 프로젝트를 생성합니다.
2. 프로젝트 생성 후 **Settings > API**에서 다음 정보를 확인합니다:
   - `Project URL` (NEXT_PUBLIC_SUPABASE_URL)
   - `anon public key` (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - `service_role key` (SUPABASE_SERVICE_ROLE_KEY)

## 2. 데이터베이스 스키마 생성

1. Supabase 대시보드에서 **SQL Editor**로 이동
2. `supabase-setup.sql` 파일의 내용을 복사하여 실행
3. 다음 테이블들이 생성됩니다:
   - `users` - 사용자 정보
   - `user_wallets` - 사용자 지갑 (AI 크레딧)
   - `transactions` - 거래 내역
   - `chat_sessions` - 채팅 세션

## 3. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가합니다:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI API Keys (선택사항)
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
PERPLEXITY_API_KEY=your_perplexity_api_key
```

## 4. 인증 설정

### Supabase Auth 설정
1. Supabase 대시보드에서 **Authentication > Providers**로 이동
2. Email 인증을 활성화합니다
3. (선택) 소셜 로그인 제공자를 추가할 수 있습니다

### 이메일 확인 설정 (선택)
- **Authentication > Email Templates**에서 이메일 템플릿을 커스터마이징할 수 있습니다
- 개발 중에는 이메일 확인을 비활성화할 수 있습니다:
  - **Authentication > Settings**
  - "Enable email confirmations" 체크 해제

## 5. Row Level Security (RLS) 정책

`supabase-setup.sql`에는 기본적인 RLS 정책이 포함되어 있습니다:
- 사용자는 자신의 데이터만 읽고 쓸 수 있습니다
- 모든 테이블에 적절한 보안 정책이 적용되어 있습니다

## 6. 테스트

### 로컬 개발
```bash
npm run dev
```

### 회원가입 테스트
1. 브라우저에서 `http://localhost:3000/login?mode=signup` 접속
2. 이메일, 비밀번호, 이름 입력
3. 회원가입 버튼 클릭
4. Supabase 대시보드의 **Authentication > Users**에서 사용자 확인

### 로그인 테스트
1. 등록한 이메일과 비밀번호로 로그인
2. 대시보드로 이동되는지 확인

## 7. Fallback 모드

Supabase가 설정되지 않은 경우, 앱은 자동으로 로컬 스토리지 기반의 인증으로 폴백됩니다:
- 개발 중에 빠르게 테스트 가능
- 데모 계정: `demo@pickmyai.com` / `demo1234`

## 8. 프로덕션 배포

### Vercel 배포
1. Vercel에 프로젝트 연결
2. Environment Variables에 Supabase 키 추가:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 보안 체크리스트
- ✅ RLS 정책이 모든 테이블에 활성화되어 있는지 확인
- ✅ `service_role` 키는 절대 클라이언트에 노출하지 않기
- ✅ API 키를 `.env.local` 파일에만 저장 (Git에 커밋하지 않기)
- ✅ 프로덕션에서 이메일 확인 활성화

## 9. 데이터베이스 스키마

### users 테이블
```sql
id: UUID (Primary Key)
email: TEXT (Unique)
name: TEXT
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

### user_wallets 테이블
```sql
id: UUID (Primary Key)
user_id: UUID (Foreign Key -> users.id)
credits: JSONB (모델별 크레딧 저장)
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

### transactions 테이블
```sql
id: UUID (Primary Key)
user_id: UUID (Foreign Key -> users.id)
type: TEXT ('purchase' | 'usage')
model_id: TEXT (nullable)
amount: NUMERIC (nullable)
credits: JSONB (nullable)
description: TEXT (nullable)
created_at: TIMESTAMP
```

### chat_sessions 테이블
```sql
id: UUID (Primary Key)
user_id: UUID (Foreign Key -> users.id)
title: TEXT
messages: JSONB
default_model_id: TEXT (nullable)
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

## 10. 문제 해결

### "Invalid API key" 오류
- `.env.local` 파일의 키가 올바른지 확인
- 서버를 재시작 (환경 변수 변경 후)

### 사용자가 데이터베이스에 저장되지 않음
- `supabase-setup.sql` 스크립트가 실행되었는지 확인
- RLS 정책이 올바르게 설정되었는지 확인

### 로그인 후 리다이렉트 안 됨
- 브라우저 콘솔에서 오류 확인
- Supabase 대시보드의 Logs에서 오류 확인

## 추가 리소스
- [Supabase 공식 문서](https://supabase.com/docs)
- [Next.js + Supabase 가이드](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Row Level Security 가이드](https://supabase.com/docs/guides/auth/row-level-security)

