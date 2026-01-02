# 사용자 완전 삭제 가이드

## 문제 상황
`public.users` 테이블에서 사용자를 삭제해도 `auth.users`에는 여전히 남아있어서 해당 이메일이 "이미 사용 중"으로 표시됨

## 원인
- Supabase는 두 개의 테이블을 사용:
  1. `auth.users` - 인증 정보 (이메일, 비밀번호)
  2. `public.users` - 사용자 프로필 정보 (이름 등)
- `public.users`만 삭제하면 `auth.users`에는 여전히 남아있음
- 이메일 중복 확인은 `auth.users`를 기준으로 함

## 해결 방법

### 방법 1: Supabase Dashboard에서 삭제 (권장)

#### 1단계: Authentication에서 삭제
1. **Supabase Dashboard** → **Authentication** → **Users**
2. 삭제할 사용자 찾기
3. **...** (메뉴) → **Delete user** 클릭
4. 확인

✅ 이렇게 하면 `auth.users`와 `public.users` 모두 삭제됨 (CASCADE)

#### 2단계: 확인
- **Table Editor** → `users` 테이블에서도 삭제되었는지 확인

### 방법 2: SQL로 완전 삭제

**Supabase Dashboard** → **SQL Editor**:

```sql
-- 이메일로 사용자 완전 삭제
SELECT completely_delete_user_by_email('user@example.com');

-- 또는 UUID로 삭제
SELECT completely_delete_user('user-uuid-here');
```

먼저 `FIX_USER_DELETION.sql` 파일을 실행해야 합니다.

### 방법 3: 수동 삭제

```sql
-- 1. 사용자 ID 찾기
SELECT id, email FROM auth.users WHERE email = 'user@example.com';

-- 2. public.users에서 삭제
DELETE FROM public.users WHERE id = 'user-uuid-here';

-- 3. auth.users에서 삭제
DELETE FROM auth.users WHERE id = 'user-uuid-here';
```

## 자동 삭제 설정 (프로덕션 비권장)

현재 설정:
- `auth.users` 삭제 → `public.users` 자동 삭제 ✅ (ON DELETE CASCADE)
- `public.users` 삭제 → `auth.users`는 남아있음 ❌

자동으로 양방향 삭제하려면 (주의 필요):

```sql
-- Trigger 활성화 (FIX_USER_DELETION.sql에 포함)
DROP TRIGGER IF EXISTS on_public_user_deleted ON public.users;
CREATE TRIGGER on_public_user_deleted
  BEFORE DELETE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION delete_user_from_auth();
```

⚠️ **경고**: 이 트리거는 실수로 데이터를 삭제할 위험이 있으므로 프로덕션에서는 비권장

## 올바른 삭제 순서

### ❌ 잘못된 방법
```
1. Table Editor → users 테이블에서 삭제
2. auth.users에는 여전히 남아있음
3. 이메일이 "사용 중"으로 표시됨
```

### ✅ 올바른 방법
```
1. Authentication → Users에서 삭제
2. 또는 SQL 함수 사용
3. 양쪽 테이블에서 모두 삭제됨
```

## 현재 상태 확인

### 불일치 확인
```sql
-- auth.users에는 있지만 public.users에 없는 경우
SELECT 
    au.id,
    au.email,
    '❌ public.users에 없음' as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- public.users에는 있지만 auth.users에 없는 경우 (고아 레코드)
SELECT 
    pu.id,
    pu.email,
    '❌ auth.users에 없음' as status
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL;
```

### 불일치 정리
```sql
-- public.users의 고아 레코드 삭제
DELETE FROM public.users 
WHERE id NOT IN (SELECT id FROM auth.users);

-- 또는 auth.users에 있지만 public.users에 없는 경우 동기화
INSERT INTO public.users (id, email, name)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', 'User') as name
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;
```

## 테스트 시나리오

### 1. 사용자 생성
```
이메일: test-delete@example.com
비밀번호: password123
```

### 2. 삭제 (Authentication에서)
1. Dashboard → Authentication → Users
2. test-delete@example.com 찾기
3. Delete 클릭

### 3. 재가입 시도
```
같은 이메일로 회원가입 시도
✅ 정상적으로 가입되어야 함
```

## 예방 조치

### 1. 삭제 전 확인
```sql
-- 삭제할 사용자의 모든 데이터 확인
SELECT 
    u.id,
    u.email,
    u.name,
    COUNT(DISTINCT w.id) as wallets,
    COUNT(DISTINCT t.id) as transactions,
    COUNT(DISTINCT c.id) as chat_sessions
FROM auth.users au
JOIN public.users u ON au.id = u.id
LEFT JOIN public.user_wallets w ON u.id = w.user_id
LEFT JOIN public.transactions t ON u.id = t.user_id
LEFT JOIN public.chat_sessions c ON u.id = c.user_id
WHERE u.email = 'user@example.com'
GROUP BY u.id, u.email, u.name;
```

### 2. 백업
```sql
-- 삭제 전 백업 (선택사항)
CREATE TABLE users_backup AS 
SELECT * FROM public.users WHERE email = 'user@example.com';
```

## 관리자 기능 추가 (향후)

`src/components/Admin.tsx`에 사용자 관리 기능 추가 예정:
- 사용자 목록 조회
- 사용자 검색
- 사용자 완전 삭제 버튼
- 삭제 확인 모달

## 빠른 해결책

**지금 당장 문제를 해결하려면:**

1. **Supabase Dashboard** 열기
2. **Authentication** → **Users** 메뉴
3. 삭제하려는 이메일 찾기
4. **Delete user** 클릭
5. 같은 이메일로 재가입 시도 ✅

이게 가장 빠르고 안전한 방법입니다!

## 요약

| 삭제 방법 | auth.users | public.users | 권장도 |
|----------|-----------|-------------|-------|
| Authentication UI | ✅ 삭제 | ✅ 삭제 (CASCADE) | ⭐⭐⭐⭐⭐ |
| SQL 함수 | ✅ 삭제 | ✅ 삭제 | ⭐⭐⭐⭐ |
| Table Editor (users) | ❌ 남음 | ✅ 삭제 | ❌ 비권장 |
| 수동 SQL | ✅ 삭제 | ✅ 삭제 | ⭐⭐⭐ |

**결론**: 항상 **Authentication → Users**에서 삭제하세요!

