-- 이메일 중복 확인 함수 생성
-- Supabase Dashboard → SQL Editor에서 실행하세요

-- auth.users 테이블에서 이메일이 존재하는지 확인하는 함수
CREATE OR REPLACE FUNCTION check_email_exists(check_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  email_count integer;
BEGIN
  -- auth.users 테이블에서 이메일 확인
  SELECT COUNT(*) INTO email_count
  FROM auth.users
  WHERE email = check_email;
  
  -- 존재하면 true, 없으면 false 반환
  RETURN email_count > 0;
END;
$$;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION check_email_exists(text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_email_exists(text) TO anon;

-- 테스트
-- SELECT check_email_exists('test@example.com');

