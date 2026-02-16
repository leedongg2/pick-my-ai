-- Supabase Realtime 활성화 설정
-- 이 SQL을 Supabase 대시보드의 SQL Editor에서 실행하세요

-- 1. user_wallets 테이블에 Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE user_wallets;

-- 2. transactions 테이블에 Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

-- 3. Realtime이 제대로 활성화되었는지 확인
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- 참고: 만약 테이블이 아직 생성되지 않았다면 먼저 테이블을 생성해야 합니다
-- 테이블이 이미 존재한다면 위의 ALTER PUBLICATION 명령만 실행하면 됩니다
