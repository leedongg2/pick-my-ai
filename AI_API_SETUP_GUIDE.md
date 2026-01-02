# 실제 AI API 사용 설정 가이드

## 🎯 개요

이제 채팅에서 실제 AI API(OpenAI, Anthropic, Perplexity)를 사용합니다!

## 📋 지원하는 AI 모델

### OpenAI (GPT 시리즈)
- **GPT-5** → `gpt-4-turbo-preview`
- **GPT-4o** → `gpt-4o`
- **GPT-4.1** → `gpt-4-turbo`

### Anthropic (Claude 시리즈)
- **Claude Haiku** → `claude-3-haiku-20240307`
- **Claude Sonnet** → `claude-3-5-sonnet-20241022`
- **Claude Opus** → `claude-3-opus-20240229`

### Perplexity
- **Perplexity Sonar** → `sonar`
- **Perplexity Sonar Pro** → `sonar-pro`
- **Perplexity Deep Research** → `sonar-reasoning`

## 🚀 설정 방법

### 1단계: API 키 발급

#### OpenAI API 키
1. https://platform.openai.com/api-keys 접속
2. 로그인 또는 회원가입
3. "Create new secret key" 클릭
4. 키 이름 입력 (예: "Pick-My-AI")
5. API 키 복사 (한 번만 표시됨!)

#### Anthropic API 키
1. https://console.anthropic.com/ 접속
2. 로그인 또는 회원가입
3. "API Keys" 메뉴
4. "Create Key" 클릭
5. API 키 복사

#### Perplexity API 키
1. https://www.perplexity.ai/settings/api 접속
2. 로그인 또는 회원가입
3. "Generate API Key" 클릭
4. API 키 복사

### 2단계: .env.local 파일 생성

프로젝트 루트에 `.env.local` 파일 생성:

```bash
# 프로젝트 루트 (c:\pick-my-ai\)
.env.local
```

### 3단계: API 키 추가

`.env.local` 파일에 다음 내용 추가:

```env
# OpenAI API (GPT 모델용)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx

# Anthropic API (Claude 모델용)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# Perplexity API
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxx

# 모델 이름 설정 (선택사항, 기본값 사용 가능)
GPT5_MODEL=gpt-4-turbo-preview
GPT4O_MODEL=gpt-4o
GPT41_MODEL=gpt-4-turbo

CLAUDE_HAIKU_MODEL=claude-3-haiku-20240307
CLAUDE_SONNET_MODEL=claude-3-5-sonnet-20241022
CLAUDE_OPUS_MODEL=claude-3-opus-20240229

PERPLEXITY_SONAR_MODEL=sonar
PERPLEXITY_SONAR_PRO_MODEL=sonar-pro
PERPLEXITY_DEEP_RESEARCH_MODEL=sonar-reasoning
```

### 4단계: 개발 서버 재시작

```bash
# Ctrl+C로 서버 중지
npm run dev
```

## ✅ 테스트 방법

### 1. 로그인
```
http://localhost:3001/login
```

### 2. 크레딧 충전
```
http://localhost:3001/configurator
```
- 원하는 모델 선택
- 크레딧 구매

### 3. 채팅 시작
```
http://localhost:3001/chat
```
- 모델 선택 (예: GPT-5)
- 메시지 입력: "안녕하세요! 자기소개를 해주세요."
- 전송

### 4. 실제 AI 응답 확인
- ✅ 실제 AI가 답변
- ❌ "[GPT-5] 안녕하세요..." (데모 응답이 아님)

## 💡 데모 모드 vs 실제 모드

### 데모 모드 (API 키 없음)
```
💡 데모 모드: 실제 AI 응답을 받으려면 .env.local 파일에 API 키를 추가하세요.

설정 방법:
1. 프로젝트 루트에 .env.local 파일 생성
2. 다음 환경변수 추가:
   - OPENAI_API_KEY=your_key (GPT 모델용)
   - ANTHROPIC_API_KEY=your_key (Claude 모델용)
   - PERPLEXITY_API_KEY=your_key (Perplexity 모델용)

자세한 내용은 env.example 파일을 참고하세요.
```

### 실제 모드 (API 키 설정됨)
```
[실제 AI의 답변]
안녕하세요! 저는 GPT-4 기반의 AI 어시스턴트입니다. 
다양한 주제에 대해 대화하고 도움을 드릴 수 있습니다...
```

## 🔧 API 라우트 구조

### `/api/chat` - POST

**요청:**
```json
{
  "modelId": "gpt5",
  "messages": [
    {
      "role": "user",
      "content": "안녕하세요!"
    }
  ]
}
```

**응답 (성공):**
```json
{
  "content": "안녕하세요! 무엇을 도와드릴까요?"
}
```

**응답 (오류):**
```json
{
  "error": "OpenAI API 키가 설정되지 않았습니다."
}
```

## 🎨 Chat 컴포넌트 로직

```typescript
// 1. 사용자 메시지 전송
handleSendMessage()

// 2. 크레딧 확인 및 차감
if (credits <= 0) return;
useCredit(modelId);

// 3. 대화 히스토리 구성
const conversationHistory = [
  { role: 'user', content: '이전 메시지' },
  { role: 'assistant', content: '이전 답변' },
  { role: 'user', content: '새 메시지' }
];

// 4. API 호출
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    modelId: 'gpt5',
    messages: conversationHistory
  })
});

// 5. 응답 처리
const data = await response.json();
addMessage(sessionId, {
  role: 'assistant',
  content: data.content
});
```

## 💰 비용 안내

### OpenAI 가격 (2024년 기준)
- GPT-4 Turbo: $0.01/1K tokens (input), $0.03/1K tokens (output)
- GPT-4o: $0.005/1K tokens (input), $0.015/1K tokens (output)

### Anthropic 가격
- Claude 3 Haiku: $0.25/1M tokens (input), $1.25/1M tokens (output)
- Claude 3.5 Sonnet: $3/1M tokens (input), $15/1M tokens (output)
- Claude 3 Opus: $15/1M tokens (input), $75/1M tokens (output)

### Perplexity 가격
- API 사용 시 과금 방식 확인 필요

## 🛡️ 보안 주의사항

### ✅ DO:
- `.env.local` 파일에만 API 키 저장
- `.gitignore`에 `.env.local` 포함 확인
- API 키는 절대 공개 저장소에 커밋하지 않기

### ❌ DON'T:
- 프론트엔드 코드에 API 키 하드코딩
- API 키를 Git에 커밋
- API 키를 다른 사람과 공유

## 🔍 디버깅

### API 호출 확인
```javascript
// 브라우저 콘솔 (F12)
// Network 탭에서 확인:
- POST /api/chat
- Request Payload: { modelId, messages }
- Response: { content } or { error }
```

### 오류 메시지

#### "API 키가 설정되지 않았습니다"
→ `.env.local` 파일 확인 및 서버 재시작

#### "API 호출 실패"
→ API 키가 유효한지 확인
→ API 사용량 한도 확인

#### "응답 생성 중 오류가 발생했습니다"
→ 콘솔에서 상세 오류 확인
→ API 키 권한 확인

## 📚 추가 리소스

### API 문서
- OpenAI: https://platform.openai.com/docs
- Anthropic: https://docs.anthropic.com
- Perplexity: https://docs.perplexity.ai

### API 대시보드
- OpenAI: https://platform.openai.com/usage
- Anthropic: https://console.anthropic.com
- Perplexity: https://www.perplexity.ai/settings/api

## 🎉 완료!

이제 실제 AI와 대화할 수 있습니다!

1. ✅ API 키 발급
2. ✅ `.env.local` 파일 생성
3. ✅ API 키 추가
4. ✅ 서버 재시작
5. ✅ 채팅 테스트

궁금한 점이 있으면 문의하세요! 🚀

