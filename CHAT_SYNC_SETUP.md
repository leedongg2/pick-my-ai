# 채팅 세션 클라우드 동기화 설정 가이드

이 문서는 Pick-My-AI의 채팅 세션을 Supabase에 저장하여 다른 기기/브라우저에서도 동기화되도록 설정하는 방법을 안내합니다.

## 📋 목차
1. [개요](#개요)
2. [Supabase 테이블 생성](#supabase-테이블-생성)
3. [기능 확인](#기능-확인)
4. [작동 방식](#작동-방식)
5. [문제 해결](#문제-해결)

---

## 개요

### 기존 방식 (LocalStorage)
- ❌ 브라우저별로 데이터 저장
- ❌ 다른 기기에서 접근 불가
- ❌ 브라우저 캐시 삭제 시 데이터 손실

### 새로운 방식 (Supabase 동기화)
- ✅ 클라우드에 데이터 저장
- ✅ 모든 기기/브라우저에서 동기화
- ✅ 데이터 영구 보존
- ✅ 자동 백업

---

## Supabase 테이블 생성

### 1. Supabase Dashboard 접속

1. [Supabase Dashboard](https://app.supabase.com) 접속
2. 프로젝트 선택
3. 좌측 메뉴에서 **SQL Editor** 클릭

### 2. SQL 스크립트 실행

프로젝트 루트의 `supabase_chat_sessions_schema.sql` 파일 내용을 복사하여 SQL Editor에 붙여넣고 실행:

```sql
-- 채팅 세션 테이블 생성
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  title TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_starred BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, session_id)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON public.chat_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_session_id ON public.chat_sessions(session_id);

-- RLS (Row Level Security) 정책 활성화
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 채팅 세션만 조회 가능
CREATE POLICY "Users can view own chat sessions"
  ON public.chat_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 채팅 세션만 생성 가능
CREATE POLICY "Users can create own chat sessions"
  ON public.chat_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 채팅 세션만 수정 가능
CREATE POLICY "Users can update own chat sessions"
  ON public.chat_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 채팅 세션만 삭제 가능
CREATE POLICY "Users can delete own chat sessions"
  ON public.chat_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_chat_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_sessions_updated_at();
```

### 3. 테이블 생성 확인

1. 좌측 메뉴에서 **Table Editor** 클릭
2. `chat_sessions` 테이블이 생성되었는지 확인
3. 테이블 구조 확인:
   - `id`: 고유 ID (UUID)
   - `user_id`: 사용자 ID (users 테이블 참조)
   - `session_id`: 클라이언트 세션 ID
   - `title`: 채팅 세션 제목
   - `messages`: 메시지 배열 (JSON)
   - `created_at`: 생성 시간
   - `updated_at`: 수정 시간
   - `is_starred`: 즐겨찾기 여부

---

## 기능 확인

### 1. 로그인 후 채팅 시작

1. Pick-My-AI에 로그인
2. 새 채팅 시작
3. AI와 대화

### 2. 자동 동기화 확인

채팅 메시지를 보낼 때마다:
- ✅ LocalStorage에 즉시 저장
- ✅ 2초 후 Supabase에 자동 동기화 (debounced)

### 3. 다른 기기/브라우저에서 확인

1. 다른 기기 또는 브라우저에서 Pick-My-AI 접속
2. 같은 계정으로 로그인
3. 이전 채팅 세션이 모두 표시되는지 확인

### 4. Supabase에서 직접 확인

1. Supabase Dashboard → **Table Editor**
2. `chat_sessions` 테이블 선택
3. 저장된 채팅 세션 확인

---

## 작동 방식

### 자동 동기화 흐름

```
사용자 메시지 전송
    ↓
LocalStorage에 즉시 저장 (빠른 응답)
    ↓
2초 대기 (debounce)
    ↓
Supabase에 동기화
    ↓
다른 기기에서 로그인 시 자동 로드
```

### API 엔드포인트

#### GET /api/chat-sessions
- **설명**: 사용자의 모든 채팅 세션 불러오기
- **인증**: Bearer Token 필요
- **응답**: 채팅 세션 배열

#### POST /api/chat-sessions
- **설명**: 채팅 세션 저장/업데이트
- **인증**: Bearer Token 필요
- **요청 본문**:
  ```json
  {
    "sessionId": "session-123",
    "title": "채팅 제목",
    "messages": [...],
    "isStarred": false
  }
  ```

#### DELETE /api/chat-sessions
- **설명**: 채팅 세션 삭제
- **인증**: Bearer Token 필요
- **요청 본문**:
  ```json
  {
    "sessionId": "session-123"
  }
  ```

### 동기화 최적화

1. **Debouncing**: 2초 동안 추가 메시지가 없을 때만 동기화
2. **Queue System**: 여러 동기화 요청을 순차적으로 처리
3. **Lazy Loading**: 채팅 동기화 라이브러리는 필요할 때만 로드

---

## 문제 해결

### 채팅 세션이 동기화되지 않음

**원인:**
- 로그인하지 않음
- Supabase 테이블이 생성되지 않음
- 네트워크 오류

**해결:**
1. 로그인 상태 확인
2. Supabase Dashboard에서 `chat_sessions` 테이블 확인
3. 브라우저 개발자 도구 → Network 탭에서 API 요청 확인
4. Console 탭에서 오류 메시지 확인

### 다른 기기에서 채팅이 표시되지 않음

**원인:**
- 다른 계정으로 로그인
- 동기화가 완료되지 않음

**해결:**
1. 같은 이메일 계정으로 로그인했는지 확인
2. 첫 번째 기기에서 메시지 전송 후 2초 대기
3. 두 번째 기기에서 페이지 새로고침

### RLS 정책 오류

**증상**: "new row violates row-level security policy" 오류

**해결:**
1. Supabase Dashboard → **Authentication** → **Policies**
2. `chat_sessions` 테이블의 RLS 정책 확인
3. 위의 SQL 스크립트를 다시 실행하여 정책 재생성

### 메시지가 중복 저장됨

**원인:**
- 동기화 로직 중복 호출

**해결:**
- 이미 구현된 debounce와 queue 시스템이 이를 방지
- 문제가 지속되면 브라우저 캐시 삭제 후 재시도

---

## 데이터 마이그레이션

### 기존 LocalStorage 데이터를 Supabase로 이전

현재 LocalStorage에 저장된 채팅 세션은 다음 로그인 시 자동으로 Supabase에 동기화됩니다:

1. 로그인
2. 기존 채팅 세션 열기
3. 새 메시지 전송 (또는 제목 수정)
4. 자동으로 Supabase에 저장됨

---

## 보안 및 프라이버시

### Row Level Security (RLS)

- ✅ 사용자는 **자신의 채팅 세션만** 조회/수정/삭제 가능
- ✅ 다른 사용자의 채팅 세션은 절대 접근 불가
- ✅ Supabase의 RLS 정책으로 데이터베이스 레벨에서 보호

### 데이터 암호화

- ✅ HTTPS를 통한 전송 중 암호화
- ✅ Supabase의 저장 시 암호화 (at-rest encryption)

### 데이터 삭제

- 사용자 계정 삭제 시 모든 채팅 세션 자동 삭제 (`ON DELETE CASCADE`)

---

## 성능 최적화

### 인덱스

- `user_id`: 사용자별 채팅 세션 빠른 조회
- `updated_at`: 최신 채팅 세션 정렬
- `session_id`: 특정 세션 빠른 검색

### 쿼리 최적화

- 최신 채팅 세션부터 정렬 (`ORDER BY updated_at DESC`)
- 필요한 컬럼만 선택 (`SELECT *`)

---

## 추가 기능 (향후 개선)

### 계획된 기능

- [ ] 채팅 세션 검색
- [ ] 채팅 세션 태그/카테고리
- [ ] 채팅 세션 공유
- [ ] 채팅 세션 내보내기 (JSON, PDF)
- [ ] 채팅 세션 아카이브
- [ ] 실시간 동기화 (Supabase Realtime)

---

## 참고 자료

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

---

## 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.
