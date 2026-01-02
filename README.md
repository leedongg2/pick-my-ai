# Pick-My-AI - 커스텀 AI 선택 플랫폼

## 🚀 프로젝트 소개

**"AI, 내가 고르고 내가 정한다"**

Pick-My-AI는 사용자가 원하는 AI 모델을 선택하고 필요한 만큼만 결제할 수 있는 혁신적인 플랫폼입니다. 월 구독료 없이 1회 단위로 크레딧을 구매하여 다양한 AI 모델을 자유롭게 사용할 수 있습니다.

## ✨ 핵심 기능

### 1. 모델 선택 & 수량 입력 (Configurator)
- **카테고리별 모델 탐색**: GPT, Claude, Perplexity, 코딩, 이미지
- **1회 단위 가격 표시**: 투명한 가격 정책
- **실시간 가격 계산**: 선택한 모델과 수량에 따른 즉시 계산
- **자동 할인 적용**: 개별 선택 할인 & 시리즈 묶음 할인

### 2. 스마트 가격 계산 엔진
- **마진 적용**: 고정 마진 1.2배
- **개별 선택 할인**: 1개(0%) ~ 7개 이상(30%)
- **시리즈 묶음 할인**: 시리즈 전체 선택 시 추가 혜택
- **최소 결제 금액**: 150원
- **100원 단위 반올림**: 깔끔한 가격 정책

### 3. 크레딧 지갑 시스템
- **모델별 크레딧 관리**: 각 모델별로 독립적인 크레딧 보유
- **실시간 잔액 확인**: 대시보드에서 한눈에 확인
- **사용 내역 추적**: 모든 거래 내역 기록

### 4. 멀티 모델 채팅
- **모델 자유 선택**: 메시지마다 다른 AI 모델 선택 가능
- **크레딧 자동 차감**: 사용 시 1회씩 차감
- **대화 세션 관리**: 여러 대화를 동시에 관리

### 5. 관리자 설정
- **모델 관리**: 가격 조정, 활성화/비활성화
- **정책 설정**: 최소 결제 금액, 할인 정책
- **메모 기능**: 환율, 수수료 등 기록

## 💰 가격 정책

### 모델별 1회 가격 (판매가)
- **GPT-5**: 7원
- **GPT-4o**: 10원
- **Claude Haiku 3.5**: 7원
- **Claude Sonnet 4.5**: 30원
- **Claude Opus 4.1**: 145원
- **Perplexity Sonar**: 3원
- **GPT-image-1**: 60원

### 할인 정책
**개별 선택 할인**
- 2개: 5%
- 3개: 10%
- 4개: 15%
- 5개: 20%
- 6개: 25%
- 7개 이상: 30%

**시리즈 묶음 할인**
- 기본: 모델 수 × 5%
- 평균 1만원 이상: +5% 보너스
- 평균 2만원 이상: +10% 보너스
- 최대 30% 한도

## 🛠️ 기술 스택

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Notifications**: Sonner
- **Security**: Rate Limiting, CSRF Protection, API Key Rotation

## 📦 설치 및 실행

### 요구사항
- Node.js 18.0.0 이상
- npm 또는 yarn

### 설치
```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 API 키 입력
```

### 환경 변수 설정

`.env` 파일에 다음 정보를 입력하세요:

```bash
# AI API Keys (각 프로바이더당 최대 3개 설정 가능)
OPENAI_API_KEY_1=your_openai_key_1
OPENAI_API_KEY_2=your_openai_key_2
OPENAI_API_KEY_3=your_openai_key_3

ANTHROPIC_API_KEY_1=your_anthropic_key_1
GOOGLE_API_KEY_1=your_google_key_1
PERPLEXITY_API_KEY_1=your_perplexity_key_1

# Supabase (선택사항)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

자세한 내용은 [API_KEY_ROTATION_GUIDE.md](./API_KEY_ROTATION_GUIDE.md)를 참조하세요.

### 개발 서버 실행
```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

### 프로덕션 빌드
```bash
npm run build
npm run start
```

## 📁 프로젝트 구조

```
pick-my-ai/
├── src/
│   ├── app/              # Next.js App Router 페이지
│   ├── components/       # React 컴포넌트
│   │   ├── ui/          # 재사용 가능한 UI 컴포넌트
│   │   ├── Landing.tsx  # 랜딩 페이지
│   │   ├── Configurator.tsx  # 모델 선택 화면
│   │   ├── Checkout.tsx      # 결제 화면
│   │   ├── Dashboard.tsx     # 대시보드
│   │   ├── Chat.tsx          # 채팅 화면
│   │   └── Admin.tsx         # 관리자 페이지
│   ├── data/            # 초기 데이터
│   ├── store/           # Zustand 상태 관리
│   ├── types/           # TypeScript 타입 정의
│   └── utils/           # 유틸리티 함수
├── public/              # 정적 파일
├── package.json         # 프로젝트 설정
└── README.md           # 프로젝트 문서
```

## 🎯 사용 방법

1. **모델 선택**: `/configurator`에서 원하는 AI 모델과 수량 선택
2. **결제**: 실시간 계산된 가격 확인 후 결제
3. **크레딧 확인**: `/dashboard`에서 보유 크레딧 확인
4. **채팅**: `/chat`에서 다양한 AI 모델과 대화
5. **관리**: `/admin`에서 모델 가격 및 정책 관리 (비밀번호: admin123)

## 🧪 테스트 시나리오

1. **최소 금액 테스트**: GPT-5 10회 선택 → 150원 적용 확인
2. **개별 할인 테스트**: 2개 모델 선택 → 5% 할인 적용
3. **시리즈 할인 테스트**: GPT 시리즈 전체 선택 → 시리즈 할인 적용
4. **크레딧 차감 테스트**: 채팅 전송 → 크레딧 1회 차감
5. **크레딧 부족 테스트**: 크레딧 0 상태 → 전송 불가 확인

## 🔒 보안 기능

### API 키 로테이션 (자동 429 에러 처리)
- 각 프로바이더당 최대 3개의 API 키 설정 가능
- 429 에러 발생 시 자동으로 다른 키로 전환
- 분단위/일단위 제한 자동 감지 및 처리

### 보안 강화
- Rate Limiting (분당 20회)
- CSRF 토큰 보호
- XSS 방지 (입력 검증 및 Sanitization)
- SQL Injection 방지
- 강력한 비밀번호 정책
- 보안 헤더 설정 (HSTS, CSP 등)
- 보안 이벤트 로깅

자세한 내용은 다음 문서를 참조하세요:
- [SECURITY.md](./SECURITY.md) - 보안 가이드
- [API_KEY_ROTATION_GUIDE.md](./API_KEY_ROTATION_GUIDE.md) - API 키 로테이션 가이드
- [SECURITY_CHANGELOG.md](./SECURITY_CHANGELOG.md) - 보안 변경 이력

## 📝 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

## 🤝 기여

프로젝트 개선에 기여하고 싶으시다면 Pull Request를 보내주세요!

---

**Pick-My-AI** - AI, 내가 고르고 내가 정한다 🚀

