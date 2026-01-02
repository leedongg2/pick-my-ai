# 결제 및 크레딧 충전 문제 디버깅 가이드

## 문제 증상
- 모델을 선택하고 결제하기 클릭
- "결제 완료!" 메시지 표시
- 대시보드로 이동
- **하지만 크레딧이 추가되지 않음**

## 즉시 확인 방법

### 1단계: 브라우저 콘솔 열기
- **F12** 키 누르기
- **Console** 탭으로 이동

### 2단계: 결제 시도
1. 모델 선택 페이지에서 모델 선택
2. "결제하기" 버튼 클릭
3. 결제 확인 모달에서 "결제하기" 클릭
4. **콘솔 메시지 확인**

### 3단계: 콘솔 메시지 분석

#### ✅ 정상적인 경우:
```
🛒 결제 시작: { wallet: {...}, selections: [...] }
💳 추가할 크레딧: { gpt5: 10, claude-sonnet: 5 }
✅ 업데이트된 지갑: { 
  userId: "user-123",
  credits: { gpt5: 10, claude-sonnet: 5 },
  transactions: [...]
}
```

#### ❌ 문제가 있는 경우:
```
🛒 결제 시작: { wallet: null, selections: [...] }
⚠️ 지갑이 없음, 초기화 중...
```

또는

```
❌ 사용자 정보 없음!
```

## 문제별 해결 방법

### 문제 1: 지갑이 null인 경우

**원인**: 사용자가 로그인했지만 지갑이 초기화되지 않음

**해결**:
1. 로그아웃
2. 다시 로그인
3. 대시보드 방문 (지갑 자동 초기화)
4. 모델 선택 및 결제 재시도

### 문제 2: 사용자 정보가 없는 경우

**원인**: 로그인 상태가 아니거나 세션 만료

**해결**:
1. 완전히 로그아웃
2. 브라우저 캐시 삭제
   - Chrome: `Ctrl + Shift + Delete`
   - "캐시된 이미지 및 파일" 선택
   - "데이터 삭제"
3. 다시 로그인
4. 결제 재시도

### 문제 3: 크레딧이 추가되었지만 대시보드에 표시 안 됨

**원인**: 로컬 스토리지 동기화 문제

**해결**:
1. 브라우저 개발자 도구 (F12) 열기
2. **Application** 탭으로 이동
3. **Local Storage** → `http://localhost:3000` (또는 3001)
4. `pick-my-ai-storage` 항목 확인
5. 값이 비어있거나 이상하면 **삭제**
6. 페이지 새로고침 (`F5`)
7. 다시 로그인

### 문제 4: selections가 비어있는 경우

**원인**: 모델 선택이 저장되지 않음

**해결**:
1. 모델 선택 페이지로 이동
2. 모델 선택 (수량 +/- 버튼 클릭)
3. 브라우저 콘솔 확인:
   ```javascript
   // 콘솔에서 직접 확인
   const state = JSON.parse(localStorage.getItem('pick-my-ai-storage'));
   console.log('Selections:', state.state.selections);
   ```
4. selections가 비어있으면 → 로그아웃 후 재로그인

## 수동 크레딧 추가 (테스트용)

브라우저 콘솔에서 직접 실행:

```javascript
// 1. 현재 상태 확인
const store = useStore.getState();
console.log('Current wallet:', store.wallet);
console.log('Current user:', store.currentUser);

// 2. 지갑이 없으면 초기화
if (!store.wallet && store.currentUser) {
  store.initWallet(store.currentUser.id);
}

// 3. 크레딧 수동 추가
store.addCredits({
  'gpt5': 10,
  'claude-sonnet': 5,
  'gpt4o': 3
});

// 4. 확인
console.log('Updated wallet:', useStore.getState().wallet);

// 5. 페이지 새로고침
location.reload();
```

## 로컬 스토리지 직접 확인

### 콘솔에서 확인:
```javascript
// 전체 저장된 데이터 확인
const storage = JSON.parse(localStorage.getItem('pick-my-ai-storage'));
console.log('Full storage:', storage);

// 현재 사용자
console.log('Current user:', storage.state.currentUser);

// 사용자별 지갑 데이터
const userId = storage.state.currentUser?.id;
if (userId) {
  const walletKey = `user_${userId}_wallet`;
  console.log('Wallet:', storage.state[walletKey]);
}

// 사용자별 선택 데이터
if (userId) {
  const selectionsKey = `user_${userId}_selections`;
  console.log('Selections:', storage.state[selectionsKey]);
}
```

## 완전 초기화 (최후의 수단)

```javascript
// 주의: 모든 데이터가 삭제됩니다!
localStorage.removeItem('pick-my-ai-storage');
location.reload();
```

## 예상 데이터 구조

### 정상적인 wallet:
```json
{
  "userId": "local_dGVzdEBwaWNrbXlh",
  "credits": {
    "gpt5": 10,
    "claude-sonnet": 5
  },
  "transactions": [
    {
      "id": "1234567890",
      "userId": "local_dGVzdEBwaWNrbXlh",
      "type": "purchase",
      "credits": { "gpt5": 10 },
      "timestamp": "2024-01-01T00:00:00.000Z",
      "description": "크레딧 구매"
    }
  ]
}
```

### 정상적인 selections:
```json
[
  {
    "modelId": "gpt5",
    "quantity": 10
  },
  {
    "modelId": "claude-sonnet",
    "quantity": 5
  }
]
```

## 테스트 시나리오

### 전체 플로우 테스트:
1. ✅ 로그인
2. ✅ 대시보드 확인 (크레딧 0)
3. ✅ 모델 선택 페이지 이동
4. ✅ GPT-5 10회 선택
5. ✅ Claude Sonnet 5회 선택
6. ✅ "결제하기" 버튼 클릭
7. ✅ 확인 모달에서 선택 내역 확인
8. ✅ "결제하기" 클릭
9. ✅ 콘솔에서 메시지 확인:
   - `🛒 결제 시작`
   - `💳 추가할 크레딧`
   - `✅ 업데이트된 지갑`
10. ✅ "결제 완료!" 화면
11. ✅ 2초 후 대시보드로 이동
12. ✅ 대시보드에서 크레딧 확인

각 단계에서 **F12 콘솔**을 열어두고 오류 메시지를 확인하세요!

## 자주 묻는 질문

### Q: 결제는 완료되었다고 하는데 크레딧이 없어요
A: 브라우저 콘솔 (F12)에서 오류 메시지를 확인하고, 위의 "수동 크레딧 추가" 방법을 시도해보세요.

### Q: 모델을 선택했는데 결제 페이지에서 "선택한 모델이 없습니다"라고 나와요
A: 로그아웃 후 재로그인하거나, 로컬 스토리지를 초기화하세요.

### Q: 대시보드에 "지갑을 초기화하는 중입니다" 메시지가 계속 나와요
A: 로그인이 제대로 되지 않았을 수 있습니다. 완전히 로그아웃 후 재로그인하세요.

## 개발자 정보

결제 처리 로직:
- `src/components/Checkout.tsx` - 결제 UI 및 로직
- `src/store/index.ts` - 상태 관리 (addCredits, initWallet)
- `src/components/Dashboard.tsx` - 크레딧 표시

디버그 모드에서 콘솔 로그가 자동으로 출력됩니다:
- `🛒` - 결제 시작
- `⚠️` - 경고
- `💳` - 크레딧 추가
- `✅` - 성공
- `❌` - 오류

