# Users 테이블 데이터 문제 해결 가이드

## 문제 상황
회원가입을 해도 `public.users` 테이블에 rows가 0개로 표시됨

## 원인
1. **RLS(Row Level Security) 정책 문제**: `auth.uid()`가 회원가입 시점에 제대로 설정되지 않음
2. **Trigger 미작동**: `auth.users`에서 `public.users`로 자동 복사되지 않음
3. **권한 문제**: 클라이언트에서 직접 삽입 시 권한 부족

## 해결 방법

### 🔥 빠른 해결 (권장)

**1단계: Supabase Dashboard 접속**
- 프로젝트 선택 → **SQL Editor** 메뉴

**2단계: FIX_USERS_TABLE.sql 실행**
프로젝트 루트의 `FIX_USERS_TABLE.sql` 파일 내용을 복사하여 실행

또는 아래 SQL을 직접 실행:

```sql
-- RLS 정책 재설정
DROP POLICY IF EXISTS "Users can insert their own data" ON public.users;
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;

-- 모든 인증된 사용자가 삽입 가능하도록
CREATE POLICY "Enable insert for authenticated users only" ON public.users
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable read access for users" ON public.users
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Enable update for users based on user_id" ON public.users
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- user_wallets도 동일하게
DROP POLICY IF EXISTS "Users can insert their own wallet" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can view their own wallet" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can update their own wallet" ON public.user_wallets;

CREATE POLICY "Enable insert for authenticated users on wallets" ON public.user_wallets
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable read access for own wallet" ON public.user_wallets
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Enable update for own wallet" ON public.user_wallets
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
```

**3단계: 기존 사용자 동기화**
```sql
-- auth.users에 있지만 public.users에 없는 사용자 추가
INSERT INTO public.users (id, email, name)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', 'User') as name
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 지갑 생성
INSERT INTO public.user_wallets (user_id, credits)
SELECT id, '{}'::jsonb
FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.user_wallets)
ON CONFLICT (user_id) DO NOTHING;
```

**4단계: 확인**
```sql
-- 데이터 개수 확인
SELECT 'auth.users' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'public.users', COUNT(*) FROM public.users
UNION ALL
SELECT 'user_wallets', COUNT(*) FROM public.user_wallets;
```

### 🔍 문제 진단 방법

**브라우저 개발자 도구로 확인:**
1. F12 키를 눌러 개발자 도구 열기
2. Console 탭으로 이동
3. 회원가입 시도
4. 다음 메시지 확인:
   - ✅ "사용자 정보 저장 성공" → 정상
   - ❌ "사용자 정보 저장 실패" → RLS 정책 문제
   - ❌ "policy" 또는 "permission" 포함 → 권한 문제

**Supabase Dashboard에서 확인:**
1. **Authentication** → **Users** 메뉴
   - 여기에 사용자가 있다면 `auth.users`에는 정상 저장됨
2. **Table Editor** → `users` 테이블
   - 여기에 사용자가 없다면 `public.users` 삽입 실패
3. **Logs** 메뉴
   - 실시간 오류 로그 확인

### 🛠️ 대안 해결 방법

#### 방법 1: RLS 임시 비활성화 (테스트용)
```sql
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets DISABLE ROW LEVEL SECURITY;
```
⚠️ **주의**: 프로덕션 환경에서는 사용하지 마세요!

#### 방법 2: Database Webhook 사용
1. Supabase Dashboard → **Database** → **Webhooks**
2. New Webhook 생성:
   - Events: `INSERT` on `auth.users`
   - HTTP endpoint: 별도 서버리스 함수
   - Function: `public.users`에 데이터 복사

#### 방법 3: Supabase Edge Function 사용
더 고급 방법으로, Edge Function을 만들어 회원가입 후처리

### 📊 데이터 확인 쿼리

```sql
-- 최근 가입한 사용자 10명 확인
SELECT 
    au.id,
    au.email,
    au.created_at as "가입일시 (Auth)",
    pu.name as "이름",
    pu.created_at as "생성일시 (Public)",
    CASE 
        WHEN pu.id IS NULL THEN '❌ public.users에 없음'
        ELSE '✅ 정상'
    END as "상태"
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC
LIMIT 10;

-- 지갑이 없는 사용자 확인
SELECT 
    u.id,
    u.email,
    u.name,
    CASE 
        WHEN w.user_id IS NULL THEN '❌ 지갑 없음'
        ELSE '✅ 지갑 있음'
    END as "지갑 상태"
FROM public.users u
LEFT JOIN public.user_wallets w ON u.id = w.user_id
ORDER BY u.created_at DESC;
```

### 🎯 회원가입 후 즉시 테스트

회원가입 직후 브라우저 콘솔에서:

```javascript
// 현재 세션 확인
const { data: { session } } = await supabase.auth.getSession();
console.log('✅ Session:', session ? 'OK' : '❌ No session');

// 내 정보가 users 테이블에 있는지 확인
const { data: user, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', session.user.id)
  .single();

console.log('User in public.users:', user);
console.log('Error:', error);

// 내 지갑이 있는지 확인
const { data: wallet, error: walletError } = await supabase
  .from('user_wallets')
  .select('*')
  .eq('user_id', session.user.id)
  .single();

console.log('Wallet:', wallet);
console.log('Wallet error:', walletError);
```

### ✅ 정상 작동 확인

다음 사항이 모두 충족되면 정상:

1. ✅ 회원가입 시 브라우저 콘솔에 "✅ 사용자 정보 저장 성공" 표시
2. ✅ 회원가입 시 브라우저 콘솔에 "✅ 지갑 생성 성공" 표시
3. ✅ Supabase Dashboard → Authentication → Users에 사용자 표시
4. ✅ Supabase Dashboard → Table Editor → users에 데이터 표시
5. ✅ Supabase Dashboard → Table Editor → user_wallets에 데이터 표시

### 🚨 여전히 안 되면

1. `.env.local` 파일 확인:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

2. 브라우저 캐시 및 로컬 스토리지 삭제:
   - F12 → Application → Local Storage → 삭제
   - F12 → Application → Cookies → 삭제

3. 개발 서버 재시작:
   ```bash
   # Ctrl+C로 중지 후
   npm run dev
   ```

4. 새 이메일로 회원가입 시도 (기존 이메일은 이미 auth.users에 있을 수 있음)

5. Supabase 프로젝트 상태 확인:
   - Dashboard에서 "Paused" 상태가 아닌지 확인

### 📞 추가 도움

문제가 계속되면 다음 정보를 확인:
1. 브라우저 콘솔의 모든 오류 메시지
2. Supabase Dashboard → Logs의 최근 오류
3. `auth.users` 테이블의 사용자 수
4. `public.users` 테이블의 사용자 수
5. RLS 정책 상태 (활성화/비활성화)

