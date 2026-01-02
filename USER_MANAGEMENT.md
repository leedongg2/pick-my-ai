# 사용자 관리 시스템

## 개요

Pick-My-AI는 사용자별로 독립적인 데이터를 관리합니다. 각 사용자는:
- ✅ 독립적인 지갑 (크레딧)
- ✅ 독립적인 모델 선택 내역
- ✅ 독립적인 채팅 세션
- ✅ 독립적인 거래 내역

## 데이터 분리 메커니즘

### 1. 사용자 식별

각 사용자는 고유한 ID를 가집니다:
- **Supabase 사용 시**: Supabase Auth의 UUID 사용
- **로컬 모드**: 이메일 기반 고유 ID 생성 (`local_[base64_email]`)

### 2. 데이터 저장 구조

로컬 스토리지에 다음과 같이 저장됩니다:

```javascript
{
  currentUser: { id: "user_123", email: "...", name: "..." },
  isAuthenticated: true,
  user_user_123_selections: [...],      // 사용자별 모델 선택
  user_user_123_wallet: {...},          // 사용자별 지갑
  user_user_123_chatSessions: [...],    // 사용자별 채팅
  user_user_123_currentSessionId: "...", // 사용자별 현재 세션
}
```

### 3. 데이터 로드 프로세스

**로그인 시:**
1. 사용자 인증 확인
2. 사용자 ID 확인
3. `user_${userId}_*` 키로 해당 사용자 데이터 로드
4. 스토어 상태에 반영

**로그아웃 시:**
1. 현재 사용자 데이터는 로컬 스토리지에 유지
2. 스토어 상태만 초기화
3. 다시 로그인하면 해당 사용자 데이터 복원

## 테스트 계정

### 데모 계정 1
```
이메일: demo@pickmyai.com
비밀번호: demo1234
이름: 데모 사용자
```

### 테스트 계정 2
```
이메일: test@pickmyai.com
비밀번호: test1234
이름: 테스트 사용자
```

## 테스트 시나리오

### 시나리오 1: 사용자별 데이터 분리 확인

1. **데모 계정으로 로그인**
   ```
   - 로그인: demo@pickmyai.com / demo1234
   - AI 모델 선택 (예: GPT-5 10회)
   - 결제 진행
   - 대시보드에서 크레딧 확인
   ```

2. **로그아웃 후 테스트 계정으로 로그인**
   ```
   - 로그아웃
   - 로그인: test@pickmyai.com / test1234
   - 대시보드 확인 → 비어있어야 함 ✅
   - 다른 AI 모델 선택 (예: Claude Sonnet 5회)
   - 결제 진행
   ```

3. **다시 데모 계정으로 로그인**
   ```
   - 로그아웃
   - 로그인: demo@pickmyai.com / demo1234
   - 대시보드 확인 → GPT-5 10회가 그대로 있어야 함 ✅
   ```

### 시나리오 2: 신규 회원가입

1. **새 계정 생성**
   ```
   - 회원가입: newuser@test.com / password123 / 홍길동
   - 자동으로 빈 지갑 생성
   - 대시보드 → 크레딧 0
   ```

2. **데이터 독립성 확인**
   ```
   - 모델 선택 및 결제
   - 로그아웃
   - 데모 계정으로 로그인
   - 각 계정의 데이터가 독립적으로 유지되는지 확인
   ```

## 구현 세부사항

### 로그인 함수

```typescript
login: async (email, password) => {
  // 1. 사용자 인증
  // 2. 사용자 ID 획득
  // 3. 로컬 스토리지에서 user_${userId}_* 데이터 로드
  // 4. 스토어 상태 업데이트
  // 5. 지갑 없으면 초기화
}
```

### 데이터 저장 (partialize)

```typescript
partialize: (state) => {
  if (!state.currentUser) return { /* 빈 상태 */ };
  
  return {
    currentUser: state.currentUser,
    isAuthenticated: state.isAuthenticated,
    [`user_${state.currentUser.id}_selections`]: state.selections,
    [`user_${state.currentUser.id}_wallet`]: state.wallet,
    // ...
  };
}
```

### 데이터 복원 (onRehydrateStorage)

```typescript
onRehydrateStorage: () => (state) => {
  if (state?.currentUser) {
    const userId = state.currentUser.id;
    // localStorage에서 user_${userId}_* 데이터 로드
    // 스토어 상태에 반영
  }
}
```

## 주의사항

### ⚠️ 로컬 스토리지 제한
- 브라우저 로컬 스토리지는 약 5-10MB 제한
- 대량의 채팅 메시지는 주의 필요
- 프로덕션에서는 Supabase 사용 권장

### ⚠️ 보안
- 로컬 모드는 개발/테스트용
- 프로덕션에서는 반드시 Supabase 사용
- 비밀번호는 평문 저장 금지 (현재는 데모용)

### ⚠️ 브라우저 간 동기화
- 로컬 스토리지는 브라우저별로 독립적
- 다른 브라우저/기기에서는 데이터 공유 안 됨
- Supabase 사용 시 모든 기기에서 동기화 가능

## Supabase 마이그레이션

로컬 모드에서 Supabase로 전환하려면:

1. **Supabase 설정**
   ```bash
   # .env.local 파일 생성
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

2. **데이터베이스 스키마 생성**
   ```sql
   # supabase-setup.sql 실행
   ```

3. **자동 전환**
   - 환경 변수 설정 후 재시작
   - 자동으로 Supabase 사용
   - 기존 로컬 데이터는 유지되지만 Supabase로 이관 필요

## 디버깅

### 로컬 스토리지 확인

**Chrome DevTools:**
```javascript
// 전체 데이터 확인
localStorage.getItem('pick-my-ai-storage')

// 특정 사용자 데이터 확인
const storage = JSON.parse(localStorage.getItem('pick-my-ai-storage'))
console.log(storage.state)
```

### 데이터 초기화

```javascript
// 모든 데이터 삭제 (개발 중)
localStorage.removeItem('pick-my-ai-storage')

// 페이지 새로고침
location.reload()
```

### 현재 사용자 확인

```javascript
// 콘솔에서 현재 사용자 확인
const storage = JSON.parse(localStorage.getItem('pick-my-ai-storage'))
console.log('Current User:', storage.state.currentUser)
console.log('User Data Keys:', Object.keys(storage.state).filter(k => k.startsWith('user_')))
```

## FAQ

### Q: 사용자를 전환하면 이전 데이터가 사라지나요?
A: 아니요. 각 사용자의 데이터는 로컬 스토리지에 별도로 저장됩니다. 다시 로그인하면 복원됩니다.

### Q: 로컬 스토리지가 가득 차면?
A: 채팅 메시지를 정리하거나 Supabase로 전환하세요.

### Q: 다른 기기에서도 같은 데이터를 볼 수 있나요?
A: 로컬 모드에서는 불가능합니다. Supabase를 사용하면 가능합니다.

### Q: 비밀번호를 잊어버렸어요
A: 현재는 비밀번호 복구 기능이 없습니다. 새 계정을 만드세요. (프로덕션에서는 이메일 인증 추가 필요)

