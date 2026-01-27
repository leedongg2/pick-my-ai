# 관리자 기능 설정 가이드

이 문서는 Pick-My-AI 애플리케이션의 관리자 기능(사용자 계정 조회, 크레딧 수정, 상태 확인)을 설정하는 방법을 안내합니다.

## 📋 목차
1. [Supabase Service Role Key 설정](#supabase-service-role-key-설정)
2. [환경 변수 설정](#환경-변수-설정)
3. [관리자 로그인](#관리자-로그인)
4. [관리자 기능 사용](#관리자-기능-사용)
5. [문제 해결](#문제-해결)

---

## Supabase Service Role Key 설정

### 1. Supabase Dashboard에서 Service Role Key 가져오기

1. [Supabase Dashboard](https://app.supabase.com) 접속
2. 프로젝트 선택
3. 좌측 메뉴에서 **Settings** → **API** 클릭
4. **Project API keys** 섹션에서 **service_role** 키 찾기
5. **service_role** 키 복사 (⚠️ **절대 공개하지 마세요!**)

### 2. Service Role Key의 중요성

- **Service Role Key**는 **모든 RLS 정책을 우회**합니다
- 이 키로 **모든 데이터에 접근 및 수정**이 가능합니다
- **절대로 클라이언트 코드나 공개 저장소에 노출하면 안 됩니다**
- **서버 사이드 코드에서만 사용**해야 합니다

---

## 환경 변수 설정

### 1. `.env.local` 파일에 Service Role Key 추가

프로젝트 루트에 `.env.local` 파일을 생성하거나 수정:

```env
# Supabase (사용자 인증 및 데이터베이스)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Supabase Service Role Key (관리자 기능용 - 절대 공개하지 마세요!)
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# 관리자 인증
ADMIN_PASSWORD=your-secure-admin-password
JWT_SECRET=your-jwt-secret-key-at-least-32-characters-long
```

### 2. Netlify 환경 변수 설정 (프로덕션)

1. [Netlify Dashboard](https://app.netlify.com) 접속
2. 프로젝트 선택
3. **Site settings** → **Environment variables** 클릭
4. **Add a variable** 클릭하여 다음 변수 추가:
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Key
   - `ADMIN_PASSWORD`: 관리자 비밀번호
   - `JWT_SECRET`: JWT 시크릿 키

---

## 관리자 로그인

### 1. 관리자 로그인 페이지 접속

```
https://yourdomain.com/admin/login
```

또는 로컬:

```
http://localhost:3000/admin/login
```

### 2. 관리자 비밀번호 입력

- `.env.local`의 `ADMIN_PASSWORD`에 설정한 비밀번호 입력
- 로그인 성공 시 관리자 토큰이 생성되어 24시간 동안 유효

### 3. 관리자 대시보드 접속

로그인 성공 후 자동으로 `/admin` 페이지로 이동

---

## 관리자 기능 사용

### 1. 유저 크레딧 관리

**접근 방법:**
1. 관리자 대시보드 상단 탭에서 **"유저 크레딧 관리"** 클릭
2. 모든 사용자 목록과 크레딧 정보가 표시됩니다

**기능:**
- **사용자 조회**: 모든 사용자의 이메일, 이름, 가입일 확인
- **크레딧 조회**: 각 사용자의 모델별 크레딧 잔액 확인
- **크레딧 수정**: 
  1. 수정하려는 사용자의 **"수정"** 버튼 클릭
  2. JSON 형식으로 크레딧 수정 (예: `{"gpt-4": 100, "claude-3": 50}`)
  3. **"저장"** 버튼 클릭

**크레딧 JSON 형식 예시:**
```json
{
  "gpt-4": 100,
  "gpt-4-turbo": 50,
  "claude-3-opus": 75,
  "claude-3-sonnet": 120,
  "gemini-pro": 200
}
```

### 2. AI 모델 관리

**기능:**
- 모델 활성화/비활성화
- 모델 가격 수정 (Pi-Won 단위)
- 모델 정보 업데이트

### 3. 정책 관리

**기능:**
- 최소 충전 금액 설정
- 환율 메모 작성
- 결제 수수료 메모 작성

### 4. 고객 문의함

**기능:**
- 사용자 피드백 조회
- 피드백 상태 변경 (대기중/처리중/완료)

### 5. 투표 관리

**기능:**
- 새 투표 생성
- 투표 결과 확인
- 투표 종료

---

## 문제 해결

### "권한이 없습니다" 오류

**원인:**
- 관리자 토큰이 만료되었거나 유효하지 않음

**해결:**
1. `/admin/login`에서 다시 로그인
2. 브라우저 로컬 스토리지 확인:
   - `adminAuthenticated`: `"true"`
   - `adminToken`: 토큰 값 존재
   - `adminTokenExpiry`: 만료 시간 확인

### 사용자 목록이 표시되지 않음

**원인:**
- `SUPABASE_SERVICE_ROLE_KEY`가 설정되지 않았거나 잘못됨

**해결:**
1. `.env.local` 파일에 `SUPABASE_SERVICE_ROLE_KEY` 확인
2. Supabase Dashboard에서 올바른 Service Role Key 복사
3. 서버 재시작: `npm run dev`

### 크레딧 수정이 저장되지 않음

**원인:**
- JSON 형식 오류
- API 권한 문제

**해결:**
1. JSON 형식 확인 (중괄호, 쉼표, 따옴표 등)
2. 브라우저 개발자 도구 → Network 탭에서 API 응답 확인
3. 서버 로그 확인

### Supabase RLS 정책 오류

**원인:**
- Service Role Key 대신 Anon Key를 사용하고 있음

**해결:**
- `src/lib/supabaseAdmin.ts`가 올바르게 구현되어 있는지 확인
- API 라우트에서 `supabaseAdmin`을 사용하는지 확인

---

## 보안 권장사항

### 1. Service Role Key 보호

- ✅ **서버 사이드 코드에서만 사용**
- ✅ **환경 변수로 관리**
- ✅ **`.gitignore`에 `.env.local` 추가**
- ❌ **클라이언트 코드에 노출 금지**
- ❌ **공개 저장소에 커밋 금지**

### 2. 관리자 비밀번호

- 강력한 비밀번호 사용 (최소 12자, 대소문자/숫자/특수문자 포함)
- 정기적으로 비밀번호 변경
- 비밀번호 공유 금지

### 3. JWT Secret

- 최소 32자 이상의 랜덤 문자열 사용
- 프로덕션과 개발 환경에서 다른 값 사용

### 4. 관리자 세션

- 토큰 만료 시간: 24시간 (기본값)
- 주기적으로 토큰 만료 확인 (1분마다)
- 로그아웃 시 토큰 삭제

---

## API 엔드포인트

### GET /api/admin/users

**설명:** 모든 사용자와 크레딧 정보 조회

**헤더:**
```
Authorization: Bearer {adminToken}
```

**응답:**
```json
{
  "users": [
    {
      "id": "user-id",
      "email": "user@example.com",
      "name": "User Name",
      "created_at": "2024-01-01T00:00:00Z",
      "user_wallets": [
        {
          "credits": {
            "gpt-4": 100,
            "claude-3": 50
          },
          "updated_at": "2024-01-01T00:00:00Z"
        }
      ]
    }
  ]
}
```

### PATCH /api/admin/users

**설명:** 특정 사용자의 크레딧 수정

**헤더:**
```
Authorization: Bearer {adminToken}
Content-Type: application/json
```

**요청 본문:**
```json
{
  "userId": "user-id",
  "credits": {
    "gpt-4": 100,
    "claude-3": 50
  }
}
```

**응답:**
```json
{
  "success": true,
  "data": [
    {
      "id": "wallet-id",
      "user_id": "user-id",
      "credits": {
        "gpt-4": 100,
        "claude-3": 50
      },
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## 추가 참고 자료

- [Supabase Service Role Key Documentation](https://supabase.com/docs/guides/api/api-keys)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

---

## 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.
