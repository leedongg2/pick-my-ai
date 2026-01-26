# Supabase 인증 및 크레딧 시스템 가이드

## 개요
Pick-My-AI는 Supabase를 사용하여 사용자 인증 및 크레딧 관리를 처리합니다. 이 가이드는 Supabase를 설정하고 시스템을 활성화하는 방법을 설명합니다.

## 1. Supabase 프로젝트 설정

### 1.1 Supabase 계정 생성
1. [Supabase](https://supabase.com)에 접속하여 계정 생성
2. 새 프로젝트 생성
3. 데이터베이스 비밀번호 설정 (안전한 곳에 보관)

### 1.2 API 키 확인
프로젝트 생성 후 **Settings > API**에서 다음 정보 확인:
- `Project URL` (NEXT_PUBLIC_SUPABASE_URL)
- `anon public key` (NEXT_PUBLIC_SUPABASE_ANON_KEY)

## 2. 데이터베이스 스키마 생성

### 2.1 SQL Editor 실행
1. Supabase Dashboard에서 **SQL Editor** 메뉴로 이동
2. `supabase-setup.sql` 파일의 내용을 복사하여 붙여넣기
3. **RUN** 버튼 클릭하여 실행

이 스크립트는 다음을 생성합니다:
- `users` 테이블: 사용자 기본 정보
- `user_wallets` 테이블: 사용자별 크레딧
- `transactions` 테이블: 크레딧 사용/충전 내역
- `chat_sessions` 테이블: 채팅 세션 저장
- RLS (Row Level Security) 정책
- 자동 트리거 (지갑 생성 등)

### 2.2 스키마 확인
**Table Editor**에서 다음 테이블이 생성되었는지 확인:
- ✅ users
- ✅ user_wallets
- ✅ transactions
- ✅ chat_sessions

## 3. 환경 변수 설정

### 3.1 `.env.local` 파일 생성
프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용 추가:

```bash
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# AI API 키들 (선택사항)
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_API_KEY=your_google_api_key
PERPLEXITY_API_KEY=your_perplexity_api_key
```

### 3.2 개발 서버 재시작
```bash
npm run dev
```

## 4. 시스템 작동 방식

### 4.1 회원가입
1. 사용자가 이메일/비밀번호/이름 입력
2. Supabase Auth에 사용자 생성
3. `auth.users` 테이블에 자동 저장
4. 트리거가 `public.users` 테이블에 사용자 정보 복사
5. 또 다른 트리거가 `user_wallets` 테이블에 빈 지갑 생성
6. 이메일 인증 링크 전송

### 4.2 로그인
1. 사용자가 이메일/비밀번호 입력
2. Supabase Auth로 인증
3. 세션 토큰 발급
4. `/api/wallet`에서 사용자 크레딧 로드
5. Zustand store에 크레딧 저장

### 4.3 크레딧 구매
1. 사용자가 모델 선택 및 구매
2. `store.addCredits()` 호출
3. 로컬 state 업데이트
4. `/api/wallet` POST로 Supabase 동기화
5. `user_wallets` 테이블 업데이트
6. `transactions` 테이블에 구매 기록 저장

### 4.4 크레딧 사용
1. 사용자가 AI 채팅 전송
2. `store.deductCredit()` 호출
3. 크레딧 1개 차감
4. `/api/wallet` POST로 Supabase 동기화
5. `transactions` 테이블에 사용 기록 저장

## 5. 데이터 구조

### 5.1 user_wallets.credits (JSONB)
```json
{
  "gpt4o": 100,
  "claude35sonnet": 50,
  "gemini3": 30
}
```

### 5.2 transactions 레코드
```json
{
  "id": "uuid",
  "user_id": "user-uuid",
  "type": "purchase" | "usage",
  "credits": {
    "gpt4o": 100
  },
  "description": "크레딧 구매",
  "created_at": "2025-01-26T10:00:00Z"
}
```

## 6. 로컬 모드 vs Supabase 모드

### 6.1 로컬 모드 (Supabase 미설정)
- `.env.local`에 Supabase 환경변수가 없는 경우
- 로컬 메모리에 사용자 저장
- localStorage에 크레딧 저장
- 브라우저 새로고침 시 데이터 유지
- 단일 브라우저에서만 사용 가능

### 6.2 Supabase 모드 (설정 완료)
- `.env.local`에 Supabase 환경변수 존재
- Supabase Auth로 사용자 관리
- 데이터베이스에 크레딧 저장
- 여러 기기에서 동일한 계정 사용 가능
- 이메일 인증 지원

## 7. API 엔드포인트

### 7.1 GET /api/wallet
**설명**: 사용자 지갑 조회

**헤더**:
```
Authorization: Bearer {access_token}
```

**응답**:
```json
{
  "wallet": {
    "id": "uuid",
    "user_id": "user-uuid",
    "credits": {
      "gpt4o": 100
    },
    "created_at": "2025-01-26T10:00:00Z",
    "updated_at": "2025-01-26T10:00:00Z"
  }
}
```

### 7.2 POST /api/wallet
**설명**: 크레딧 추가/차감

**헤더**:
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**요청 본문**:
```json
{
  "credits": {
    "gpt4o": 100
  },
  "type": "purchase",
  "description": "크레딧 구매"
}
```

**응답**:
```json
{
  "wallet": {
    "id": "uuid",
    "user_id": "user-uuid",
    "credits": {
      "gpt4o": 200
    },
    "updated_at": "2025-01-26T10:00:00Z"
  }
}
```

### 7.3 PATCH /api/wallet
**설명**: 크레딧 직접 설정 (관리자용)

**헤더**:
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**요청 본문**:
```json
{
  "credits": {
    "gpt4o": 1000,
    "claude35sonnet": 500
  }
}
```

## 8. 보안 설정

### 8.1 RLS (Row Level Security)
모든 테이블에 RLS가 활성화되어 있습니다:
- 사용자는 자신의 데이터만 조회/수정 가능
- 다른 사용자의 크레딧이나 채팅 내역 접근 불가

### 8.2 인증 토큰
- JWT 토큰 기반 인증
- 토큰은 HTTP-only 쿠키에 저장 (권장)
- 자동 갱신 지원

## 9. 트러블슈팅

### 9.1 "지갑 조회 실패" 오류
**원인**: RLS 정책 누락

**해결**:
```sql
-- SQL Editor에서 실행
CREATE POLICY "Users can view their own wallet" ON public.user_wallets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet" ON public.user_wallets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet" ON public.user_wallets
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 9.2 "사용자 정보 저장 실패" 오류
**원인**: users 테이블 트리거 누락

**해결**: `supabase-setup.sql` 파일 다시 실행

### 9.3 크레딧이 동기화되지 않음
**원인**: 환경변수 미설정 또는 세션 만료

**해결**:
1. `.env.local` 파일 확인
2. 브라우저 새로고침
3. 다시 로그인

### 9.4 이메일 인증이 작동하지 않음
**원인**: Supabase 이메일 설정 필요

**해결**:
1. Supabase Dashboard > Authentication > Email Templates
2. 이메일 템플릿 확인
3. SMTP 설정 (선택사항, 기본은 Supabase 제공 이메일)

## 10. 모니터링

### 10.1 사용자 확인
Supabase Dashboard > Authentication > Users

### 10.2 크레딧 확인
Supabase Dashboard > Table Editor > user_wallets

### 10.3 거래 내역 확인
Supabase Dashboard > Table Editor > transactions

## 11. 마이그레이션

### 11.1 로컬 → Supabase 이동
로컬 모드에서 Supabase 모드로 전환 시:
1. Supabase 설정 완료
2. 사용자는 새로 회원가입 필요
3. 기존 localStorage 데이터는 유지되지만 Supabase와 별개

### 11.2 데이터 백업
```sql
-- 모든 테이블 백업
COPY (SELECT * FROM public.users) TO '/tmp/users.csv' WITH CSV HEADER;
COPY (SELECT * FROM public.user_wallets) TO '/tmp/wallets.csv' WITH CSV HEADER;
COPY (SELECT * FROM public.transactions) TO '/tmp/transactions.csv' WITH CSV HEADER;
```

## 12. 프로덕션 배포

### 12.1 Vercel 환경변수 설정
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 12.2 도메인 설정
Supabase Dashboard > Authentication > URL Configuration에서:
- Site URL: `https://your-domain.com`
- Redirect URLs: `https://your-domain.com/auth/callback`

### 12.3 보안 체크리스트
- ✅ RLS 정책 활성화 확인
- ✅ HTTPS 사용
- ✅ 환경변수 안전하게 관리
- ✅ API 키 노출 방지
- ✅ 이메일 인증 활성화

## 13. 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [Next.js + Supabase 가이드](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [RLS 정책 가이드](https://supabase.com/docs/guides/auth/row-level-security)

## 14. 지원

문제가 발생하면:
1. 콘솔 로그 확인 (개발 모드에서만)
2. Supabase Dashboard > Logs 확인
3. 이슈 생성 또는 문의
