-- 사용자 삭제 시 auth.users와 public.users 동시 삭제 설정
-- Supabase Dashboard → SQL Editor에서 실행하세요

-- 1. 기존 제약 조건 확인
-- public.users 테이블은 auth.users를 참조하므로
-- auth.users를 삭제하면 public.users도 자동 삭제됨 (ON DELETE CASCADE)

-- 2. public.users에서 삭제 시 auth.users도 삭제하는 함수
CREATE OR REPLACE FUNCTION delete_user_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- public.users에서 삭제 시 auth.users도 삭제
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger 생성 (선택사항 - 주의해서 사용)
-- 이 트리거를 활성화하면 public.users 삭제 시 auth.users도 자동 삭제됨
-- DROP TRIGGER IF EXISTS on_public_user_deleted ON public.users;
-- CREATE TRIGGER on_public_user_deleted
--   BEFORE DELETE ON public.users
--   FOR EACH ROW
--   EXECUTE FUNCTION delete_user_from_auth();

-- 4. 더 안전한 방법: 사용자 완전 삭제 함수
CREATE OR REPLACE FUNCTION completely_delete_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. public.users 삭제 (관련 테이블도 CASCADE로 삭제됨)
  DELETE FROM public.users WHERE id = user_id;
  
  -- 2. auth.users 삭제
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;

-- 5. 이메일로 사용자 완전 삭제 함수
CREATE OR REPLACE FUNCTION completely_delete_user_by_email(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- 이메일로 사용자 ID 찾기
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF target_user_id IS NOT NULL THEN
    -- public.users 삭제
    DELETE FROM public.users WHERE id = target_user_id;
    
    -- auth.users 삭제
    DELETE FROM auth.users WHERE id = target_user_id;
  END IF;
END;
$$;

-- 권한 부여 (관리자만 실행 가능하도록)
-- GRANT EXECUTE ON FUNCTION completely_delete_user(uuid) TO authenticated;
-- GRANT EXECUTE ON FUNCTION completely_delete_user_by_email(text) TO authenticated;

-- 6. 사용 예시
-- SELECT completely_delete_user('user-uuid-here');
-- SELECT completely_delete_user_by_email('user@example.com');

-- 7. 확인용: 양쪽 테이블의 사용자 비교
SELECT 
    au.id,
    au.email as auth_email,
    pu.email as public_email,
    CASE 
        WHEN pu.id IS NULL THEN '❌ public.users에 없음'
        ELSE '✅ 정상'
    END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC;

-- 8. public.users에만 있고 auth.users에 없는 경우 (정리 필요)
SELECT 
    pu.id,
    pu.email,
    '❌ auth.users에 없음 (고아 레코드)' as status
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL;

-- 9. 고아 레코드 정리 (public.users에만 있는 경우)
-- DELETE FROM public.users 
-- WHERE id NOT IN (SELECT id FROM auth.users);

