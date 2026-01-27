# 소셜 로그인 설정 가이드

이 문서는 Pick-My-AI 애플리케이션에 Google, GitHub, Naver 소셜 로그인을 설정하는 방법을 안내합니다.

## 📋 목차
1. [Supabase 설정](#supabase-설정)
2. [Google OAuth 설정](#google-oauth-설정)
3. [GitHub OAuth 설정](#github-oauth-설정)
4. [Naver OAuth 설정](#naver-oauth-설정)
5. [테스트](#테스트)

---

## Supabase 설정

### 1. Supabase 대시보드 접속
1. [Supabase Dashboard](https://app.supabase.com)에 로그인
2. 프로젝트 선택
3. 좌측 메뉴에서 **Authentication** → **Providers** 클릭

---

## Google OAuth 설정

### 1. Google Cloud Console에서 OAuth 클라이언트 생성

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택 또는 새 프로젝트 생성
3. **APIs & Services** → **Credentials** 이동
4. **+ CREATE CREDENTIALS** → **OAuth client ID** 선택
5. Application type: **Web application** 선택
6. 이름 입력 (예: Pick-My-AI)
7. **Authorized redirect URIs** 추가:
   ```
   https://[YOUR-SUPABASE-PROJECT-ID].supabase.co/auth/v1/callback
   ```
8. **CREATE** 클릭
9. **Client ID**와 **Client Secret** 복사

### 2. Supabase에 Google Provider 설정

1. Supabase Dashboard → **Authentication** → **Providers**
2. **Google** 찾아서 활성화
3. Google Cloud Console에서 복사한 정보 입력:
   - **Client ID**: 복사한 Client ID
   - **Client Secret**: 복사한 Client Secret
4. **Save** 클릭

---

## GitHub OAuth 설정

### 1. GitHub OAuth App 생성

1. [GitHub Settings](https://github.com/settings/developers) 접속
2. **OAuth Apps** → **New OAuth App** 클릭
3. 정보 입력:
   - **Application name**: Pick-My-AI
   - **Homepage URL**: `https://yourdomain.com` (또는 로컬: `http://localhost:3000`)
   - **Authorization callback URL**:
     ```
     https://[YOUR-SUPABASE-PROJECT-ID].supabase.co/auth/v1/callback
     ```
4. **Register application** 클릭
5. **Client ID** 복사
6. **Generate a new client secret** 클릭하여 **Client Secret** 생성 및 복사

### 2. Supabase에 GitHub Provider 설정

1. Supabase Dashboard → **Authentication** → **Providers**
2. **GitHub** 찾아서 활성화
3. GitHub에서 복사한 정보 입력:
   - **Client ID**: 복사한 Client ID
   - **Client Secret**: 복사한 Client Secret
4. **Save** 클릭

---

## Naver OAuth 설정

### 1. Naver Developers에서 애플리케이션 등록

1. [Naver Developers](https://developers.naver.com/apps/#/register) 접속
2. **애플리케이션 등록** 클릭
3. 정보 입력:
   - **애플리케이션 이름**: Pick-My-AI
   - **사용 API**: 네아로 (네이버 아이디로 로그인) 선택
   - **제공 정보**: 이메일, 닉네임 필수 선택
   - **서비스 URL**: `https://yourdomain.com` (또는 로컬: `http://localhost:3000`)
   - **Callback URL**:
     ```
     https://[YOUR-SUPABASE-PROJECT-ID].supabase.co/auth/v1/callback
     ```
4. **등록하기** 클릭
5. **Client ID**와 **Client Secret** 복사

### 2. Supabase에 Naver Provider 설정

⚠️ **주의**: Supabase는 기본적으로 Naver를 지원하지 않습니다. 대신 **Generic OAuth Provider**를 사용해야 합니다.

1. Supabase Dashboard → **Authentication** → **Providers**
2. 하단의 **Add a new provider** 클릭
3. Provider 정보 입력:
   - **Provider Name**: `naver`
   - **Client ID**: 복사한 Client ID
   - **Client Secret**: 복사한 Client Secret
   - **Authorization URL**:
     ```
     https://nid.naver.com/oauth2.0/authorize
     ```
   - **Token URL**:
     ```
     https://nid.naver.com/oauth2.0/token
     ```
   - **User Info URL**:
     ```
     https://openapi.naver.com/v1/nid/me
     ```
   - **Scopes**: (비워두거나 기본값 사용)
4. **Save** 클릭

---

## 환경 변수 설정

`.env.local` 파일에 다음 환경 변수가 설정되어 있는지 확인:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-SUPABASE-PROJECT-ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

## 테스트

### 1. 로컬 환경에서 테스트

```bash
npm run dev
```

### 2. 로그인 페이지 접속

`http://localhost:3000/login` 접속

### 3. 소셜 로그인 버튼 확인

- **Google로 계속하기** (흰색 배경, Google 로고)
- **GitHub로 계속하기** (흰색 배경, GitHub 로고)
- **네이버로 계속하기** (녹색 배경, Naver 로고)

### 4. 각 버튼 클릭하여 로그인 테스트

1. 버튼 클릭
2. 해당 서비스의 로그인 페이지로 리다이렉트
3. 로그인 및 권한 승인
4. `/auth/callback`으로 리다이렉트
5. 자동으로 `/chat` 페이지로 이동
6. 로그인 성공 토스트 메시지 확인

---

## 문제 해결

### 리다이렉트 오류
- Supabase와 각 OAuth Provider의 Callback URL이 정확히 일치하는지 확인
- URL 끝에 슬래시(`/`)가 없는지 확인

### 사용자 정보가 저장되지 않음
- Supabase의 RLS (Row Level Security) 정책 확인
- `users` 테이블과 `user_wallets` 테이블에 INSERT 권한이 있는지 확인

### Naver 로그인이 작동하지 않음
- Naver Developers에서 애플리케이션 상태가 **검수 중** 또는 **서비스 적용**인지 확인
- 개발 단계에서는 **개발 중** 상태로 테스트 가능

---

## 추가 참고 자료

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Naver Login API Documentation](https://developers.naver.com/docs/login/api/)

---

## 보안 권장사항

1. **Client Secret은 절대 공개하지 마세요**
2. 프로덕션 환경에서는 HTTPS만 사용
3. Callback URL은 정확한 도메인만 허용
4. 정기적으로 OAuth 앱의 권한 및 사용자 목록 검토
5. 불필요한 권한(scope)은 요청하지 않기

---

## 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.
