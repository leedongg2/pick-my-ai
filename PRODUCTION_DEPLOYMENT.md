# 프로덕션 배포 가이드

실제 운영 환경에 배포하기 위한 완벽한 가이드입니다.

---

## 🚀 배포 전 체크리스트

### 1. 환경 변수 설정

Netlify Dashboard → Site settings → Environment variables에서 다음을 설정:

#### 필수 환경 변수
```bash
# Node 환경
NODE_ENV=production

# 앱 URL
NEXT_PUBLIC_APP_URL=https://your-domain.netlify.app

# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI API Keys (사용하는 것만 설정)
OPENAI_API_KEY=sk-proj-your-key
ANTHROPIC_API_KEY=sk-ant-your-key
GOOGLE_API_KEY=your-google-key
PERPLEXITY_API_KEY=pplx-your-key

# 보안 키 (필수)
JWT_SECRET=your-jwt-secret-min-32-characters-long
ENCRYPTION_KEY=your-64-character-encryption-key-here
ADMIN_PASSWORD=your-secure-admin-password

# 성능 최적화
NEXT_PUBLIC_STREAMING_DRAFT_V2=true
```

#### 선택적 환경 변수
```bash
# 소셜 로그인 (선택)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
NEXT_PUBLIC_GITHUB_CLIENT_ID=your-github-client-id
NEXT_PUBLIC_NAVER_CLIENT_ID=your-naver-client-id

# 결제 (선택)
TOSS_CLIENT_KEY=your-toss-client-key
TOSS_SECRET_KEY=your-toss-secret-key

# 모니터링 (선택)
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

---

## 🔒 보안 설정

### 1. API 키 보안
- ✅ 모든 API 키는 환경 변수로만 관리
- ✅ `.env.local` 파일은 절대 Git에 커밋하지 않음
- ✅ Service Role Key는 서버 사이드에서만 사용
- ✅ Anon Key만 클라이언트에 노출

### 2. HTTPS 강제
Netlify는 자동으로 HTTPS를 적용하지만, 추가 확인:
```bash
# Site settings → Domain management → HTTPS
# "Force HTTPS" 활성화 확인
```

### 3. 환경 변수 검증
배포 후 다음 명령으로 확인:
```bash
# 브라우저 콘솔에서
console.log(process.env.NODE_ENV) // "production"이어야 함
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL) // URL 확인
```

---

## ⚡ 성능 최적화

### 1. 빌드 설정
Netlify Build settings:
```bash
Build command: npm run build
Publish directory: .next
```

### 2. 캐싱 설정
`netlify.toml` 파일 생성:
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.html"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/api/*"
  [headers.values]
    Cache-Control = "no-store, no-cache, must-revalidate"
```

### 3. 이미지 최적화
- 모든 이미지를 WebP/AVIF로 변환
- Next.js Image 컴포넌트 사용
- Lazy loading 적용

---

## 🗄️ 데이터베이스 설정

### 1. Supabase 프로덕션 설정

#### Row Level Security (RLS) 활성화
```sql
-- users 테이블
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- user_wallets 테이블
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;

-- chat_sessions 테이블
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
```

#### 인덱스 추가 (성능 향상)
```sql
-- users 테이블
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- user_wallets 테이블
CREATE INDEX idx_user_wallets_user_id ON user_wallets(user_id);

-- chat_sessions 테이블
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_created_at ON chat_sessions(created_at);
```

### 2. 백업 설정
Supabase Dashboard → Database → Backups:
- 자동 백업 활성화
- 백업 주기: 매일
- 보관 기간: 7일 이상

---

## 📊 모니터링 설정

### 1. Netlify Analytics
Site settings → Analytics → Enable

### 2. 에러 모니터링 (권장)
Sentry 설정:
```bash
npm install @sentry/nextjs

# next.config.js에 추가
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(nextConfig, {
  silent: true,
  org: "your-org",
  project: "pick-my-ai",
});
```

### 3. 성능 모니터링
```javascript
// app/layout.tsx에 추가
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## 🧪 배포 전 테스트

### 1. 로컬 프로덕션 빌드 테스트
```bash
# 프로덕션 빌드
npm run build

# 프로덕션 모드로 실행
npm start

# 브라우저에서 http://localhost:3000 접속
```

### 2. 기능 테스트 체크리스트
- [ ] 회원가입/로그인
- [ ] 소셜 로그인 (Google, GitHub, Naver)
- [ ] AI 채팅 (모든 모델)
- [ ] 크레딧 충전
- [ ] 관리자 페이지
- [ ] 모바일 반응형
- [ ] 다크모드

### 3. 성능 테스트
```bash
# Lighthouse 실행
lighthouse https://your-site.netlify.app --view

# 목표 점수
# Performance: > 90
# Accessibility: > 95
# Best Practices: > 95
# SEO: > 90
```

---

## 🚀 배포 프로세스

### 1. 코드 준비
```bash
# 최신 코드 확인
git status

# 모든 변경사항 커밋
git add .
git commit -m "chore: prepare for production deployment"
git push origin main
```

### 2. Netlify 배포
1. Netlify Dashboard 접속
2. Site settings → Build & deploy
3. Trigger deploy → Deploy site
4. 빌드 로그 확인

### 3. 배포 확인
```bash
# 사이트 접속
https://your-site.netlify.app

# 헬스 체크
curl https://your-site.netlify.app/api/health
```

---

## 🔧 배포 후 설정

### 1. 커스텀 도메인 연결
Site settings → Domain management:
1. Add custom domain
2. DNS 설정 (A 레코드 또는 CNAME)
3. HTTPS 인증서 자동 발급 확인

### 2. 환경별 배포 설정
```bash
# Production (main 브랜치)
main → https://your-domain.com

# Staging (develop 브랜치)
develop → https://staging.your-domain.com

# Preview (PR)
PR → https://deploy-preview-{pr-number}.netlify.app
```

### 3. 알림 설정
Site settings → Build & deploy → Deploy notifications:
- 이메일 알림
- Slack 알림
- Webhook

---

## 🐛 문제 해결

### 빌드 실패
```bash
# 로그 확인
Netlify Dashboard → Deploys → Failed deploy → Deploy log

# 일반적인 원인
1. 환경 변수 누락
2. 의존성 버전 충돌
3. 타입스크립트 에러
```

### 런타임 에러
```bash
# 브라우저 콘솔 확인
F12 → Console

# Netlify Functions 로그
Site settings → Functions → Function logs
```

### 성능 문제
```bash
# 번들 분석
npm run build
npm run analyze

# 큰 번들 확인 및 최적화
```

---

## 📈 운영 모니터링

### 일일 체크
- [ ] 사이트 정상 작동 확인
- [ ] 에러 로그 확인
- [ ] 성능 지표 확인

### 주간 체크
- [ ] 백업 상태 확인
- [ ] 보안 업데이트 확인
- [ ] 사용자 피드백 검토

### 월간 체크
- [ ] 의존성 업데이트
- [ ] 성능 최적화 검토
- [ ] 비용 분석

---

## 🔄 롤백 프로세스

### 긴급 롤백
```bash
# Netlify Dashboard
Deploys → 이전 배포 선택 → Publish deploy
```

### Git 롤백
```bash
# 이전 커밋으로 되돌리기
git revert HEAD
git push origin main
```

---

## 📞 지원 및 문서

### Netlify
- [Netlify Docs](https://docs.netlify.com/)
- [Netlify Support](https://www.netlify.com/support/)

### Supabase
- [Supabase Docs](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com/)

### Next.js
- [Next.js Docs](https://nextjs.org/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

## ✅ 최종 체크리스트

배포 전 마지막 확인:

- [ ] 모든 환경 변수 설정 완료
- [ ] HTTPS 활성화 확인
- [ ] RLS 정책 활성화
- [ ] 백업 설정 완료
- [ ] 모니터링 도구 설정
- [ ] 로컬 프로덕션 빌드 테스트 완료
- [ ] 모든 기능 테스트 완료
- [ ] 성능 점수 확인 (Lighthouse > 90)
- [ ] 보안 헤더 확인
- [ ] 에러 처리 확인
- [ ] 커스텀 도메인 연결 (선택)
- [ ] 알림 설정 완료

---

**배포 준비 완료!** 🎉
