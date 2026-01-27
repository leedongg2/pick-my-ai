# 스트리밍 멈춤 문제 분석

## 🔍 문제 상황
- AI 답변 스트리밍 중 갑자기 멈추는 현상
- 백그라운드 탭 전환 시 멈춤 가능성

## 🧪 원인 분석

### 1. **React State 업데이트 과부하**
**문제**: 매 청크마다 `setDraftContent()` 호출 → 과도한 리렌더링
```typescript
// 현재 코드 (문제)
if (STREAMING_DRAFT_V2) {
  draftContentRef.current = fullContent;
  setDraftContent(draftContentRef.current);  // 매 청크마다 실행
  scrollToBottom();
}
```

**영향**: 
- 브라우저가 렌더링을 따라가지 못함
- 메인 스레드 블로킹
- 스트리밍 루프가 멈춤

### 2. **scrollToBottom() 과부하**
**문제**: 매 청크마다 스크롤 계산 및 실행
```typescript
scrollToBottom();  // 매번 DOM 조작
```

**영향**:
- DOM 레이아웃 재계산 (reflow)
- 성능 저하
- 백그라운드 탭에서 더 심각

### 3. **네트워크 타임아웃 없음**
**문제**: fetch에 타임아웃 설정 없음
```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  // timeout 없음
});
```

**영향**:
- 네트워크 지연 시 무한 대기
- 연결 끊김 감지 불가

### 4. **에러 처리 부족**
**문제**: reader.read() 에러 시 복구 불가
```typescript
while (true) {
  const { done, value } = await reader.read();  // 에러 시 catch로 이동
  // ...
}
```

## 🛠️ 해결 방안

### 1. **Throttle 재도입 (개선된 버전)**
```typescript
// 백그라운드에서도 작동하는 throttle
const THROTTLE_MS = 100;  // 100ms마다 업데이트
let lastUpdate = 0;

if (STREAMING_DRAFT_V2) {
  draftContentRef.current = fullContent;
  const now = Date.now();
  if (now - lastUpdate >= THROTTLE_MS) {
    lastUpdate = now;
    setDraftContent(draftContentRef.current);
    scrollToBottom();
  }
}
```

### 2. **requestIdleCallback 사용**
```typescript
// 브라우저가 여유 있을 때만 업데이트
if (STREAMING_DRAFT_V2) {
  draftContentRef.current = fullContent;
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      setDraftContent(draftContentRef.current);
    });
  } else {
    setDraftContent(draftContentRef.current);
  }
}
```

### 3. **네트워크 타임아웃 추가**
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 60000);  // 60초

const response = await fetch('/api/chat', {
  method: 'POST',
  signal: controller.signal,
  // ...
});

clearTimeout(timeoutId);
```

### 4. **Keep-Alive 메커니즘**
```typescript
// 서버에서 주기적으로 heartbeat 전송
// data: {"type": "heartbeat"}

if (parsed?.type === 'heartbeat') {
  continue;  // 연결 유지 확인
}
```

## 🎯 권장 해결책

### 최우선 수정
1. **Throttle 재도입** (100ms)
2. **네트워크 타임아웃** (60초)
3. **에러 복구 로직**

### 추가 개선
4. **requestIdleCallback** 사용
5. **Web Worker** 고려 (장기)
6. **서버 Keep-Alive**

## 📊 성능 비교

| 방식 | 업데이트 빈도 | 성능 | 백그라운드 |
|------|--------------|------|-----------|
| **현재 (throttle 없음)** | 매 청크 | ❌ 나쁨 | ❌ 멈춤 |
| **Throttle 100ms** | 초당 10회 | ✅ 좋음 | ✅ 작동 |
| **requestIdleCallback** | 가변 | ✅ 최고 | ✅ 작동 |

## 🔧 즉시 적용 가능한 수정

### Chat.tsx 수정
```typescript
// 스트리밍 루프 내부
let lastUpdateTime = 0;
const THROTTLE_MS = 100;

for (const raw of lines) {
  // ... 파싱 로직 ...
  
  if (STREAMING_DRAFT_V2) {
    draftContentRef.current = fullContent;
    const now = Date.now();
    
    // Throttle: 100ms마다만 업데이트
    if (now - lastUpdateTime >= THROTTLE_MS) {
      lastUpdateTime = now;
      setDraftContent(draftContentRef.current);
      
      // 스크롤도 throttle
      if (!userScrolledUpRef.current) {
        scrollToBottom();
      }
    }
  }
}

// 루프 종료 후 마지막 업데이트
setDraftContent(draftContentRef.current);
```

### 네트워크 타임아웃 추가
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => {
  controller.abort();
  toast.error('네트워크 타임아웃');
}, 60000);

try {
  const response = await fetch('/api/chat', {
    method: 'POST',
    signal: controller.signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  
  clearTimeout(timeoutId);
} catch (error) {
  clearTimeout(timeoutId);
  if (error.name === 'AbortError') {
    throw new Error('네트워크 타임아웃');
  }
  throw error;
}
```

## ✅ 테스트 방법

1. **긴 답변 요청** (1000자 이상)
2. **백그라운드 탭 전환** (10초 대기)
3. **다시 탭 복귀** → 답변 계속 진행 확인
4. **네트워크 느린 환경** 시뮬레이션
5. **여러 번 반복 테스트**

## 🚨 주의사항

- Throttle을 너무 길게 하면 (>200ms) 답변이 끊겨 보임
- 너무 짧게 하면 (<50ms) 성능 문제 재발
- **100ms가 최적값**
