# Supabase 사용자 데이터 문제 해결 가이드

## 문제: 회원가입 후 users 테이블에 데이터가 표시되지 않음

### 원인
1. RLS(Row Level Security) 정책 미설정
2. Trigger 미작동
3. 권한 문제

## 해결 방법

### 1단계: RLS 정책 확인 및 재설정

Supabase Dashboard → SQL Editor에서 다음 SQL을 실행:

```sql
-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own data" ON public.users;

-- 정책 재생성
CREATE POLICY "Users can view their own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own data" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- user_wallets 정책
DROP POLICY IF EXISTS "Users can view their own wallet" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can update their own wallet" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can insert their own wallet" ON public.user_wallets;

CREATE POLICY "Users can view their own wallet" ON public.user_wallets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet" ON public.user_wallets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet" ON public.user_wallets
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 2단계: 테이블 구조 확인

```sql
-- users 테이블 구조 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND table_schema = 'public';

-- RLS 활성화 확인
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('users', 'user_wallets');
```

### 3단계: 수동으로 테스트 데이터 삽입

```sql
-- 현재 인증된 사용자의 ID 확인
SELECT auth.uid();

-- 테스트 삽입 (auth.uid()를 실제 사용자 ID로 교체)
INSERT INTO public.users (id, email, name)
VALUES ('YOUR-USER-ID-HERE', 'test@example.com', 'Test User');

INSERT INTO public.user_wallets (user_id, credits)
VALUES ('YOUR-USER-ID-HERE', '{}');
```

### 4단계: Trigger 설정 (선택사항)

Trigger를 사용하고 싶다면:

```sql
-- auth.users에 직접 trigger를 걸 수는 없으므로
-- Database Webhooks를 사용하거나
-- 클라이언트 코드에서 직접 처리 (현재 방식)

-- 대신 public.users에서 wallet을 자동 생성하는 trigger는 유지
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_wallets (user_id, credits)
    VALUES (NEW.id, '{}')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_created ON public.users;
CREATE TRIGGER on_user_created
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_wallet();
```

### 5단계: 확인

브라우저 콘솔에서 회원가입 시 에러 로그 확인:

1. F12 (개발자 도구) 열기
2. Console 탭 확인
3. 회원가입 시도
4. "사용자 정보 저장 실패" 또는 "지갑 생성 실패" 메시지 확인

### 6단계: 데이터 확인

```sql
-- auth.users 확인
SELECT id, email, created_at, raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- public.users 확인
SELECT id, email, name, created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 5;

-- user_wallets 확인
SELECT user_id, credits, created_at
FROM public.user_wallets
ORDER BY created_at DESC
LIMIT 5;
```

## 일반적인 오류와 해결책

### 오류 1: "new row violates row-level security policy"
**해결**: RLS 정책이 올바르게 설정되지 않음. 위의 1단계 재실행.

### 오류 2: "duplicate key value violates unique constraint"
**해결**: 사용자가 이미 존재함. 정상적인 동작.

### 오류 3: "permission denied for table users"
**해결**: 
1. Supabase Dashboard → Database → Tables → users → RLS 확인
2. RLS가 활성화되어 있는지 확인
3. 정책이 올바르게 설정되어 있는지 확인

### 오류 4: "relation 'users' does not exist"
**해결**: 테이블이 생성되지 않음. `supabase-setup.sql` 전체 재실행.

## 수동 데이터 확인 및 수정

### 특정 사용자의 데이터 확인
```sql
-- auth.users에서 사용자 찾기
SELECT id, email, raw_user_meta_data->>'name' as name
FROM auth.users
WHERE email = 'your-email@example.com';

-- public.users에 해당 사용자가 있는지 확인
SELECT * FROM public.users WHERE email = 'your-email@example.com';

-- 없다면 수동으로 추가
INSERT INTO public.users (id, email, name)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'name', 'User')
FROM auth.users
WHERE email = 'your-email@example.com'
AND id NOT IN (SELECT id FROM public.users);
```

### 모든 auth.users를 public.users에 동기화
```sql
-- auth.users에는 있지만 public.users에는 없는 사용자들을 추가
INSERT INTO public.users (id, email, name)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', 'User') as name
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- 각 사용자에 대해 지갑 생성
INSERT INTO public.user_wallets (user_id, credits)
SELECT id, '{}'::jsonb
FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.user_wallets);
```

## 비밀번호는 어디에 저장되나요?

**중요**: 비밀번호는 `auth.users` 테이블에 암호화되어 저장됩니다.

- `public.users` 테이블에는 **비밀번호가 저장되지 않습니다**.
- 비밀번호는 Supabase Auth가 관리하며, 직접 접근할 수 없습니다.
- `public.users`에는 id, email, name만 저장됩니다.

### auth.users 테이블 확인 (읽기 전용)

```sql
-- auth.users는 관리자만 볼 수 있음
-- Supabase Dashboard → Authentication → Users에서 확인
```

## 테스트 계정 생성

```sql
-- SQL로 직접 생성할 수 없습니다.
-- 웹 인터페이스에서 회원가입하거나
-- Supabase Dashboard → Authentication → Users → Add user 사용
```

## 추가 디버깅

브라우저 콘솔에서:

```javascript
// 현재 세션 확인
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);

// 현재 사용자 ID 확인
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);

// users 테이블에서 내 정보 확인
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', user.id);
console.log('User data:', data, 'Error:', error);
```

## 문제가 계속되면

1. `.env.local` 파일에서 Supabase URL과 Key가 올바른지 확인
2. Supabase 프로젝트가 활성화되어 있는지 확인
3. 브라우저 캐시와 로컬 스토리지 삭제 후 재시도
4. 새로운 테스트 이메일로 회원가입 시도
5. Supabase Dashboard → Logs에서 에러 로그 확인

