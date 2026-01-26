# API 키 로테이션 및 보안 가이드

## 📋 개요

이 시스템은 API Rate Limit을 자동으로 관리하고, 여러 개의 API 키를 순환하여 사용합니다.
**보안 강화**: API 키 검증, 암호화, 요청 모니터링, IP 차단 등 다층 보안 시스템이 적용되어 있습니다.

## 🔑 API 키 설정

### 환경 변수 설정

각 AI 프로바이더당 **최대 3개**의 API 키를 설정할 수 있습니다.

```bash
# .env 파일에 추가

# OpenAI (최대 3개)
OPENAI_API_KEY_1=sk-proj-xxxxx
OPENAI_API_KEY_2=sk-proj-yyyyy
OPENAI_API_KEY_3=sk-proj-zzzzz

# Anthropic (최대 3개)
ANTHROPIC_API_KEY_1=sk-ant-xxxxx
ANTHROPIC_API_KEY_2=sk-ant-yyyyy
ANTHROPIC_API_KEY_3=sk-ant-zzzzz

# Google Gemini (최대 3개)
GOOGLE_API_KEY_1=AIzaSyxxxxx
GOOGLE_API_KEY_2=AIzaSyyyyyy
GOOGLE_API_KEY_3=AIzaSyzzzzz

# Perplexity (최대 3개)
PERPLEXITY_API_KEY_1=pplx-xxxxx
PERPLEXITY_API_KEY_2=pplx-yyyyy
PERPLEXITY_API_KEY_3=pplx-zzzzz

# 보안 설정 (필수)
ENCRYPTION_KEY=your-64-character-encryption-key-here-minimum-64-chars
NEXT_PUBLIC_ENABLE_CONSOLE=false
```

### 보안 요구사항

#### 1. 암호화 키 설정 (프로덕션 필수)
```bash
# 64자 이상의 랜덤 문자열 생성
ENCRYPTION_KEY=$(openssl rand -hex 32)
```

#### 2. API 키 형식 검증
- **OpenAI**: `sk-[20자 이상]`
- **Anthropic**: `sk-ant-[20자 이상]`
- **Google**: `AIza[35자]`
- **Perplexity**: `pplx-[20자 이상]`

잘못된 형식의 API 키는 자동으로 거부됩니다.

### 하위 호환성

기존 단일 키 방식도 계속 지원됩니다:

```bash
OPENAI_API_KEY=sk-proj-xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
GOOGLE_API_KEY=AIzaSyxxxxx
PERPLEXITY_API_KEY=pplx-xxxxx
```

## 🔄 작동 방식

### 1. 자동 키 로테이션

```
요청 → 키1 사용 → 성공 ✓
요청 → 키1 사용 → 429 에러 → 키2 사용 → 성공 ✓
요청 → 키1 사용 → 429 에러 → 키2 사용 → 429 에러 → 키3 사용 → 성공 ✓
```

### 2. Rate Limit 감지

시스템은 두 가지 유형의 Rate Limit을 자동으로 감지합니다:

#### 분단위 제한 (Minute Limit)
- **감지**: 에러 메시지에 "minute" 또는 "분당" 포함
- **대기 시간**: 1분
- **메시지**: "분당 요청 한도를 초과했습니다. 1분 후에 다시 시도해주세요."

#### 일단위 제한 (Daily Limit)
- **감지**: 에러 메시지에 "day", "daily", "일일", "내일" 포함
- **대기 시간**: 다음날 자정(UTC)까지
- **메시지**: "일일 요청 한도를 초과했습니다. 내일 다시 시도해주세요."

### 3. 모든 키가 제한된 경우

모든 키가 Rate Limit에 걸린 경우, 가장 먼저 제한이 풀리는 키를 자동으로 선택합니다.

```
키1: 제한 (1분 후 해제)
키2: 제한 (5분 후 해제)
키3: 제한 (내일 해제)

→ 시스템이 키1을 선택하고 1분 대기
```

## 📊 Rate Limit 처리 흐름

```
┌─────────────────┐
│  API 요청 시작   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  키1 사용 시도   │
└────────┬────────┘
         │
    ┌────┴────┐
    │  성공?   │
    └────┬────┘
         │
    ┌────┴────────────────┐
    │                     │
   YES                   NO (429)
    │                     │
    ▼                     ▼
┌─────────┐      ┌──────────────────┐
│ 응답 반환│      │ 키1을 제한 목록에 │
└─────────┘      │     추가         │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ 키2 사용 가능?    │
                 └────────┬─────────┘
                          │
                     ┌────┴────┐
                     │         │
                    YES       NO
                     │         │
                     ▼         ▼
            ┌──────────────┐  ┌──────────────────┐
            │ 키2로 재시도  │  │ 키3 사용 가능?    │
            └──────────────┘  └────────┬─────────┘
                                       │
                                  ┌────┴────┐
                                  │         │
                                 YES       NO
                                  │         │
                                  ▼         ▼
                         ┌──────────────┐  ┌──────────────────┐
                         │ 키3로 재시도  │  │ 가장 빨리 풀리는 │
                         └──────────────┘  │ 키 대기 메시지   │
                                           └──────────────────┘
```

## 💡 사용 예시

### 예시 1: 단일 키만 설정

```bash
# .env
OPENAI_API_KEY_1=sk-proj-xxxxx
```

**결과**: 
- 키1이 429 에러 발생 시 즉시 에러 메시지 표시
- "분당 요청 한도를 초과했습니다. 1분 후에 다시 시도해주세요."

### 예시 2: 3개 키 모두 설정

```bash
# .env
OPENAI_API_KEY_1=sk-proj-xxxxx
OPENAI_API_KEY_2=sk-proj-yyyyy
OPENAI_API_KEY_3=sk-proj-zzzzz
```

**결과**:
- 키1이 429 에러 → 자동으로 키2 사용
- 키2도 429 에러 → 자동으로 키3 사용
- 키3도 429 에러 → 가장 빨리 풀리는 키 대기

### 예시 3: 혼합 제한 상황

```
시나리오:
- 키1: 분단위 제한 (1분 후 해제)
- 키2: 일단위 제한 (내일 해제)
- 키3: 사용 가능

결과:
→ 키3 즉시 사용
```

```
시나리오:
- 키1: 분단위 제한 (1분 후 해제)
- 키2: 분단위 제한 (3분 후 해제)
- 키3: 일단위 제한 (내일 해제)

결과:
→ "분당 요청 한도를 초과했습니다. 1분 후에 다시 시도해주세요."
→ 1분 후 자동으로 키1 사용 재개
```

## 🔍 디버깅

### 키 상태 확인

개발 환경에서 콘솔 로그를 통해 키 로테이션 상태를 확인할 수 있습니다:

```
OpenAI Rate Limit 감지. 다른 키로 재시도 중... (1/3)
Anthropic Rate Limit 감지. 다른 키로 재시도 중... (2/3)
```

### 로그 메시지

- `(1/3)`: 첫 번째 재시도 (키2 사용)
- `(2/3)`: 두 번째 재시도 (키3 사용)
- `(3/3)`: 세 번째 재시도 (모든 키 소진)

## ⚙️ 고급 설정

### Rate Limit 타입 커스터마이징

`src/lib/apiKeyRotation.ts` 파일에서 Rate Limit 감지 로직을 수정할 수 있습니다:

```typescript
export function parseRateLimitError(error: any): {
  isRateLimit: boolean;
  resetTime?: number;
  rateLimitType?: 'minute' | 'day';
} {
  // 커스텀 로직 추가
}
```

### 재시도 횟수 조정

`src/app/api/chat/route.ts`에서 재시도 횟수를 변경할 수 있습니다:

```typescript
// 기본값: 3회
if (response.status === 429 && retryCount < 3) {
  // 5회로 변경하려면
  if (response.status === 429 && retryCount < 5) {
```

## 📈 모니터링

### 키 사용 통계

시스템은 각 키의 상태를 메모리에 저장합니다:

```typescript
import { apiKeyManager } from '@/lib/apiKeyRotation';

// 키 상태 조회
const status = apiKeyManager.getKeyPoolStatus('openai');
console.log(status);

// 출력 예시:
// [
//   { key: 'sk-proj-xx...', isAvailable: true },
//   { key: 'sk-proj-yy...', isAvailable: false, rateLimitResetTime: 1234567890, rateLimitType: 'minute' },
//   { key: 'sk-proj-zz...', isAvailable: false, rateLimitResetTime: 1234567890, rateLimitType: 'day' }
// ]
```

## 🚨 주의사항

### 1. API 키 보안

- **절대로** API 키를 Git에 커밋하지 마세요
- `.env` 파일은 `.gitignore`에 포함되어 있습니다
- 프로덕션에서는 환경 변수 관리 서비스를 사용하세요

### 2. 비용 관리

- 여러 키를 사용하면 전체 사용량이 증가할 수 있습니다
- 각 키의 사용량을 정기적으로 모니터링하세요
- 예산 알림을 설정하세요

### 3. Rate Limit 정책

각 프로바이더의 Rate Limit 정책을 확인하세요:

- **OpenAI**: 분당 요청 수, 일일 토큰 수
- **Anthropic**: 분당 요청 수, 일일 요청 수
- **Google Gemini**: 분당 요청 수, 일일 요청 수
- **Perplexity**: 분당 요청 수, 일일 요청 수

## 🔧 문제 해결

### Q: 키가 3개인데도 즉시 에러가 발생합니다

**A**: 다음을 확인하세요:
1. 환경 변수가 올바르게 설정되었는지 확인
2. 서버를 재시작했는지 확인
3. 키 형식이 올바른지 확인

### Q: "내일 다시 시도해주세요" 메시지가 계속 나옵니다

**A**: 모든 키가 일일 제한에 도달했습니다. 다음 중 하나를 수행하세요:
1. 추가 API 키 구매
2. 다음날까지 대기
3. 다른 프로바이더 사용

### Q: 키 로테이션이 작동하지 않습니다

**A**: 
1. 콘솔 로그를 확인하세요
2. 환경 변수 이름이 정확한지 확인하세요 (`OPENAI_API_KEY_1`, `OPENAI_API_KEY_2`, `OPENAI_API_KEY_3`)
3. 서버를 재시작하세요

## 📚 관련 문서

- [SECURITY.md](./SECURITY.md) - 보안 가이드
- [.env.example](./.env.example) - 환경 변수 예제
- [API 프로바이더 문서](https://platform.openai.com/docs/guides/rate-limits)

---

**작성일**: 2025-10-18  
**버전**: 1.0.0
