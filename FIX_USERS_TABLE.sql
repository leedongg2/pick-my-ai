-- Pick-My-AI: users 테이블 문제 해결 SQL
-- 이 파일을 Supabase Dashboard → SQL Editor에서 실행하세요

-- 1단계: 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own data" ON public.users;

DROP POLICY IF EXISTS "Users can view their own wallet" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can update their own wallet" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can insert their own wallet" ON public.user_wallets;

-- 2단계: 임시로 RLS 비활성화 (테스트용)
-- 주의: 프로덕션에서는 사용하지 마세요!
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets DISABLE ROW LEVEL SECURITY;

-- 또는 더 안전한 방법: Service Role로 삽입 가능하도록 정책 변경
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- 3단계: 새로운 정책 생성 (더 관대한 정책)
-- 모든 인증된 사용자가 자신의 데이터를 삽입할 수 있도록
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

-- user_wallets 정책
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

-- 4단계: 기존 auth.users를 public.users로 동기화
INSERT INTO public.users (id, email, name)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', 'User') as name
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 5단계: 각 사용자에 대해 지갑 생성
INSERT INTO public.user_wallets (user_id, credits)
SELECT id, '{}'::jsonb
FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.user_wallets)
ON CONFLICT (user_id) DO NOTHING;

-- 6단계: 확인
SELECT 'auth.users count:' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'public.users count:', COUNT(*) FROM public.users
UNION ALL
SELECT 'public.user_wallets count:', COUNT(*) FROM public.user_wallets;

-- 7단계: 최근 사용자 확인
SELECT 
    au.id,
    au.email,
    au.created_at as auth_created_at,
    pu.name,
    pu.created_at as public_created_at,
    CASE 
        WHEN pu.id IS NULL THEN 'Missing in public.users'
        ELSE 'OK'
    END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC
LIMIT 10;

