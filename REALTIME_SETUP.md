# Supabase Realtime 설정 가이드

## 개요
이 프로젝트는 Supabase Realtime을 사용하여 사용자의 크레딧과 거래 내역을 실시간으로 동기화합니다.

## 설정 방법

### 1. Supabase 대시보드에서 Realtime 활성화

1. [Supabase 대시보드](https://app.supabase.com)에 로그인
2. 프로젝트 선택
3. 좌측 메뉴에서 **SQL Editor** 클릭
4. 새 쿼리 생성
5. 다음 SQL 실행:

```sql
-- user_wallets 테이블에 Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE user_wallets;

-- transactions 테이블에 Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
```

6. 활성화 확인:

```sql
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

### 2. 환경 변수 확인

`.env.local` 파일에 다음 환경 변수가 설정되어 있는지 확인:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 작동 방식

#### 자동 구독
- 사용자가 로그인하면 자동으로 Realtime 구독이 시작됩니다
- `SessionInitializer` 컴포넌트가 `initializeRealtimeSync(userId)` 호출
- 로그아웃 시 자동으로 구독이 해제됩니다

#### 실시간 동기화 대상
1. **user_wallets 테이블**: 크레딧 변경 사항
2. **transactions 테이블**: 새로운 거래 내역

#### 구현 파일
- `src/lib/realtimeSync.ts`: Realtime 구독 로직
- `src/components/SessionInitializer.tsx`: 구독 초기화
- `src/store/index.ts`: 로그아웃 시 구독 해제

## 테스트 방법

### 1. 크레딧 변경 테스트

Supabase 대시보드에서 직접 데이터 변경:

```sql
-- 특정 사용자의 크레딧 업데이트
UPDATE user_wallets 
SET credits = '{"gpt4": 10, "claude3": 5}'::jsonb
WHERE user_id = 'your_user_id';
```

앱에서 즉시 크레딧이 업데이트되는 것을 확인할 수 있습니다.

### 2. 거래 내역 테스트

```sql
-- 새 거래 추가
INSERT INTO transactions (user_id, type, model_id, amount, description)
VALUES ('your_user_id', 'purchase', 'gpt4', 100, '테스트 구매');
```

앱의 대시보드에서 즉시 거래 내역이 추가되는 것을 확인할 수 있습니다.

## 디버깅

개발 모드에서는 콘솔에 다음과 같은 로그가 출력됩니다:

```
🚀 Initializing realtime sync for user: [userId]
💰 Wallet subscription status: SUBSCRIBED
📊 Transactions subscription status: SUBSCRIBED
💰 Wallet update received: [payload]
📊 Transaction update received: [payload]
```

## 주의사항

1. **RLS (Row Level Security)**: Realtime이 작동하려면 RLS 정책이 올바르게 설정되어야 합니다
2. **네트워크**: WebSocket 연결이 필요하므로 방화벽 설정을 확인하세요
3. **구독 해제**: 컴포넌트 언마운트 시 자동으로 구독이 해제되므로 메모리 누수 걱정 없습니다

## 문제 해결

### Realtime이 작동하지 않는 경우

1. Supabase 대시보드에서 Realtime이 활성화되어 있는지 확인
2. 브라우저 콘솔에서 WebSocket 연결 오류 확인
3. RLS 정책 확인
4. 환경 변수가 올바르게 설정되어 있는지 확인

### 연결 상태 확인

```javascript
// 브라우저 콘솔에서 실행
console.log(supabase.getChannels());
```

활성화된 채널 목록이 표시되어야 합니다.
