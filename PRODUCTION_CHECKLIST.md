# 프로덕션 배포 체크리스트

실제 운영 환경 배포 전 필수 확인 사항입니다.

---

## ✅ 배포 전 필수 체크리스트

### 1. 환경 변수 설정 (Netlify)
- [ ] `NODE_ENV=production`
- [ ] `NEXT_PUBLIC_APP_URL` (실제 도메인)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` ⚠️ 절대 공개 금지
- [ ] `OPENAI_API_KEY`
- [ ] `ANTHROPIC_API_KEY`
- [ ] `GOOGLE_API_KEY`
- [ ] `PERPLEXITY_API_KEY`
- [ ] `JWT_SECRET` (최소 32자)
- [ ] `ENCRYPTION_KEY` (64자)
- [ ] `ADMIN_PASSWORD`
- [ ] `NEXT_PUBLIC_STREAMING_DRAFT_V2=true`

### 2. Supabase 설정
- [ ] RLS (Row Level Security) 활성화
- [ ] 인덱스 추가 (성능 향상)
- [ ] 백업 설정 (자동 백업 활성화)
- [ ] API 키 확인 (Anon Key, Service Role Key)

### 3. 보안 설정
- [ ] HTTPS 강제 활성화
- [ ] `.env.local` 파일 Git 제외 확인
- [ ] API 키 환경 변수로만 관리
- [ ] 보안 헤더 설정 (next.config.js)
- [ ] CORS 설정 확인

### 4. 성능 최적화
- [ ] console.log 자동 제거 확인 (next.config.js)
- [ ] 코드 스플리팅 활성화
- [ ] 이미지 최적화 (WebP/AVIF)
- [ ] 캐싱 설정 (netlify.toml)
- [ ] 번들 크기 확인 (< 500KB)

### 5. 기능 테스트
- [ ] 회원가입/로그인
- [ ] 소셜 로그인 (Google, GitHub, Naver)
- [ ] AI 채팅 (모든 모델)
- [ ] 스트리밍 응답
- [ ] 크레딧 충전
- [ ] 관리자 페이지
- [ ] 모바일 반응형
- [ ] 다크모드

### 6. 성능 테스트
- [ ] Lighthouse 점수 > 90
- [ ] 초기 로딩 속도 < 2초
- [ ] Time to Interactive < 3초
- [ ] 모바일 성능 확인

### 7. 에러 처리
- [ ] API 에러 처리 확인
- [ ] 네트워크 오류 처리
- [ ] 사용자 친화적 에러 메시지
- [ ] 에러 로깅 설정

### 8. 모니터링 설정
- [ ] Netlify Analytics 활성화
- [ ] 에러 모니터링 (Sentry 등)
- [ ] 성능 모니터링
- [ ] 알림 설정 (이메일, Slack)

---

## 🚀 배포 단계

### 1단계: 로컬 테스트
```bash
# 프로덕션 빌드
npm run build

# 프로덕션 모드 실행
npm start

# 브라우저에서 테스트
http://localhost:3000
```

### 2단계: Git 푸시
```bash
git add .
git commit -m "chore: production deployment"
git push origin main
```

### 3단계: Netlify 배포
1. Netlify Dashboard 접속
2. Deploys → Trigger deploy
3. 빌드 로그 확인
4. 배포 완료 대기

### 4단계: 배포 확인
```bash
# 사이트 접속
https://your-site.netlify.app

# 기능 테스트
- 회원가입/로그인
- AI 채팅
- 모든 페이지 확인
```

### 5단계: 성능 확인
```bash
# Lighthouse 실행
lighthouse https://your-site.netlify.app --view

# 목표 점수 확인
Performance: > 90
Accessibility: > 95
Best Practices: > 95
SEO: > 90
```

---

## 🔧 배포 후 설정

### 커스텀 도메인 (선택)
1. Netlify → Domain management
2. Add custom domain
3. DNS 설정
4. HTTPS 인증서 자동 발급 확인

### 모니터링 설정
1. Netlify Analytics 활성화
2. Deploy notifications 설정
3. 에러 알림 설정

---

## 🐛 문제 해결

### 빌드 실패
- 환경 변수 확인
- 의존성 버전 확인
- 빌드 로그 확인

### 런타임 에러
- 브라우저 콘솔 확인
- Netlify Functions 로그 확인
- 환경 변수 누락 확인

### 성능 문제
- 번들 크기 확인
- 이미지 최적화
- 캐싱 설정 확인

---

## 📞 긴급 연락처

### Netlify Support
- https://www.netlify.com/support/

### Supabase Support
- https://supabase.com/docs
- Discord: https://discord.supabase.com/

---

**배포 전 모든 항목을 체크하세요!** ✅
