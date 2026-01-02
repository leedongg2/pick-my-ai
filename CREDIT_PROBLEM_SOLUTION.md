# 크레딧 충전 문제 완전 해결 가이드

## 🔥 즉시 해결 방법

### 1단계: 디버그 페이지 접속
```
http://localhost:3001/debug
```

### 2단계: 테스트 실행
1. **"지갑 초기화 테스트"** ㄱ버튼 클릭
2. **"크레딧 추가 테스트"** 버튼 클릭
3. **현재 상태** 섹션에서 `wallet.credits` 확인

### 3단계: 결과 확인

#### ✅ 성공한 경우:
```json
{
  "wallet": {
    "userId": "local_...",
    "credits": {
      "gpt5": 10,
      "claude-sonnet": 5
    },
    "transactions": [...]
  }
}
```

#### ❌ 실패한 경우:
- `wallet: null` → 로그아웃 후 재로그인
- `credits: {}` → "로컬 스토리지 삭제" 후 재시도

## 📋 변경된 파일들

### 1. `src/store/index.ts`
**변경 사항:**
- `addCredits` 함수를 완전히 재작성
- `get()` 사용으로 최신 상태 보장
- 상세한 콘솔 로깅 추가
- 각 모델별 크레딧 추가 과정 추적

**주요 로그:**
```
💰 addCredits 시작: { currentCredits: {...}, toAdcd: {...} }
  ✅ gpt5: 10 (추가: +10)
  ✅ claude-sonnet: 5 (추가: +5)
💳 업데이트된 지갑: {...}
📦 저장 후 확인: {...}
```

### 2. `src/components/Checkout.tsx`
**변경 사항:**
- 사용자 인증 검증 강화
- 선택 모델 검증
- 지갑 초기화 재시도 로직 (최대 10회)
- 크레딧 추가 후 검증
- 성공 메시지 개선

**주요 로그:**
```
🛒 결제 시작: { wallet, selections, currentUser, isAuthenticated }
⚠️ 지갑이 없음, 초기화 중...
✅ 지갑 초기화 완료: {...}
💳 추가할 크레딧: {...}
✅ 최종 지갑 상태: {...}
```

### 3. `src/app/debug/page.tsx` (NEW!)
**기능:**
- 실시간 상태 모니터링
- 지갑 초기화 테스트
- 크레딧 추가 테스트
- 로컬 스토리지 검사 및 삭제
- 로그 기록

## 🧪 완전한 테스트 시나리오

### 시나리오 1: 처음 사용하는 사용자

1. **회원가입 또는 로그인**
   ```
   http://localhost:3001/login
   ```

2. **디버그 페이지 방문**
   ```
   http://localhost:3001/debug
   ```

3. **현재 상태 확인**
   - `isAuthenticated: true` 확인
   - `currentUser` 정보 확인
   - `wallet: null` 인 것이 정상

4. **"지갑 초기화 테스트"** 클릭
   - 로그: "✅ 지갑 초기화 완료"
   - 현재 상태에 `wallet` 표시

5. **"크레딧 추가 테스트"** 클릭
   - 로그: "✅ 크레딧 추가 완료"
   - `wallet.credits`에 `gpt5: 10, claude-sonnet: 5` 표시

6. **대시보드 확인**
   ```
   http://localhost:3001/dashboard
   ```
   - GPT-5: 10회
   - Claude Sonnet: 5회 표시

7. **실제 결제 테스트**
   ```
   http://localhost:3001/configurator
   ```
   - 모델 선택
   - 결제하기 클릭
   - F12 콘솔에서 로그 확인

### 시나리오 2: 크레딧이 추가되지 않는 경우

1. **F12 콘솔 열기**

2. **결제 시도**

3. **콘솔 로그 확인**

   #### Case A: 지갑이 null
   ```
   🛒 결제 시작: { wallet: null, ... }
   ⚠️ 지갑이 없음, 초기화 중...
   ```
   **해결**: 로그아웃 → 재로그인

   #### Case B: selections 비어있음
   ```
   🛒 결제 시작: { ..., selections: [] }
   ❌ 선택한 모델이 없음!
   ```
   **해결**: 모델 선택 페이지에서 다시 선택

   #### Case C: 크레딧 추가 시도 없음
   ```
   🛒 결제 시작: {...}
   [그 다음 로그 없음]
   ```
   **해결**: 디버그 페이지에서 테스트

   #### Case D: addCredits 오류
   ```
   ❌ addCredits: 지갑이 없습니다!
   ```
   **해결**: `/debug` 페이지에서 지갑 초기화

### 시나리오 3: 완전 초기화

1. **디버그 페이지 방문**
   ```
   http://localhost:3001/debug
   ```

2. **"로컬 스토리지 삭제"** 클릭
   - 페이지 자동 새로고침

3. **다시 로그인**

4. **테스트 반복**

## 🔍 상세 디버깅

### 브라우저 콘솔에서 수동 확인

```javascript
// 1. 현재 상태 확인
console.log('Current state:', useStore.getState());

// 2. 지갑 확인
const wallet = useStore.getState().wallet;
console.log('Wallet:', wallet);

// 3. 사용자 확인
const user = useStore.getState().currentUser;
console.log('User:', user);

// 4. 선택 확인
const selections = useStore.getState().selections;
console.log('Selections:', selections);

// 5. 로컬 스토리지 직접 확인
const storage = JSON.parse(localStorage.getItem('pick-my-ai-storage'));
console.log('Storage:', storage);

// 6. 사용자별 데이터 확인
if (user) {
  const userWallet = storage.state[`user_${user.id}_wallet`];
  console.log('User wallet:', userWallet);
}
```

### 수동 크레딧 추가

```javascript
// 브라우저 콘솔에서 실행
const store = useStore.getState();

// 1. 지갑 초기화 (필요시)
if (!store.wallet && store.currentUser) {
  store.initWallet(store.currentUser.id);
  console.log('지갑 초기화 완료');
}

// 2. 크레딧 추가
store.addCredits({
  'gpt5': 10,
  'claude-sonnet': 5,
  'gpt4o': 3
});

console.log('크레딧 추가 완료');

// 3. 확인
console.log('최종 지갑:', useStore.getState().wallet);

// 4. 페이지 새로고침
setTimeout(() => location.reload(), 1000);
```

## 📊 예상 동작 플로우

### 정상 플로우:
```
1. 로그인
   ↓
2. 지갑 자동 초기화 (login 시)
   ↓
3. 모델 선택
   ↓
4. 결제하기 클릭
   ↓
5. 🛒 결제 시작 로그
   ↓
6. 💳 추가할 크레딧 로그
   ↓
7. 💰 addCredits 시작 로그
   ↓
8. ✅ 각 모델별 추가 로그
   ↓
9. 💳 업데이트된 지갑 로그
   ↓
10. 📦 저장 후 확인 로그
   ↓
11. ✅ 최종 지갑 상태 로그
   ↓
12. 결제 완료 토스트
   ↓
13. 대시보드로 이동
   ↓
14. 크레딧 표시 ✅
```

### 문제가 있는 플로우:
```
1. 로그인
   ↓
2. [문제] 지갑 초기화 안 됨
   ↓
3. 모델 선택
   ↓
4. 결제하기 클릭
   ↓
5. 🛒 결제 시작 로그 (wallet: null)
   ↓
6. ⚠️ 지갑이 없음, 초기화 중...
   ↓
7. [문제] 지갑 초기화 실패
   ↓
8. ❌ 오류 메시지
```

## 🛠️ 문제별 해결책

### 문제 1: 지갑이 계속 null
**증상**: 디버그 페이지에서 `wallet: null`

**해결**:
1. 로그아웃
2. 브라우저 캐시 삭제 (Ctrl+Shift+Delete)
3. `/debug` 접속 → "로컬 스토리지 삭제"
4. 재로그인
5. `/debug` 접속 → "지갑 초기화 테스트"

### 문제 2: 크레딧이 추가되지만 사라짐
**증상**: 결제 직후 크레딧 표시, 새로고침 후 사라짐

**해결**:
```javascript
// F12 콘솔에서
const storage = JSON.parse(localStorage.getItem('pick-my-ai-storage'));
const user = storage.state.currentUser;
console.log('User ID:', user.id);
console.log('Wallet key:', `user_${user.id}_wallet`);
console.log('Wallet data:', storage.state[`user_${user.id}_wallet`]);
```

persist 설정 문제일 수 있으므로 로컬 스토리지 삭제 후 재시도

### 문제 3: 선택한 모델이 사라짐
**증상**: 모델 선택 후 결제 페이지에서 "선택한 모델이 없습니다"

**해결**:
1. `/debug` 접속
2. "로컬 스토리지 확인" 클릭
3. `user_${userId}_selections` 값 확인
4. 비어있으면 로컬 스토리지 삭제 후 재로그인

## ✅ 최종 체크리스트

결제 전 확인사항:
- [ ] 로그인 상태 (`isAuthenticated: true`)
- [ ] 사용자 정보 존재 (`currentUser` 있음)
- [ ] 지갑 초기화됨 (`wallet` 있음)
- [ ] 모델 선택됨 (`selections.length > 0`)

결제 후 확인사항:
- [ ] 콘솔에 `💳 추가할 크레딧` 로그 표시
- [ ] 콘솔에 `💰 addCredits 시작` 로그 표시
- [ ] 콘솔에 `✅ [모델명]: X회` 로그들 표시
- [ ] 콘솔에 `💳 업데이트된 지갑` 로그 표시
- [ ] 콘솔에 `✅ 최종 지갑 상태` 로그 표시
- [ ] 토스트: "결제 완료! X개 모델, 총 Y회 크레딧 충전"
- [ ] 대시보드에서 크레딧 표시

## 🚨 긴급 복구

모든 방법이 실패하면:

```javascript
// F12 콘솔에서 실행
// 1. 완전 초기화
localStorage.clear();

// 2. 페이지 새로고침
location.href = '/login';

// 3. 로그인 후
location.href = '/debug';

// 4. 테스트 실행
```

## 📞 추가 지원

문제가 계속되면 다음 정보를 제공해주세요:
1. `/debug` 페이지의 "현재 상태" 스크린샷
2. F12 콘솔의 모든 로그 (결제 시도 시)
3. "로컬 스토리지 확인" 버튼 클릭 후 로그
4. 브라우저 종류 및 버전

