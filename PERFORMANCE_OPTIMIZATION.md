# 성능 최적화 가이드

이 문서는 Pick-My-AI 웹 애플리케이션의 성능 최적화 내용을 설명합니다.

## 🚀 적용된 최적화

### 1. **Next.js 설정 최적화**
- ✅ SWC 기반 최소화 (Terser보다 7배 빠름)
- ✅ 프로덕션에서 console.log 자동 제거
- ✅ 코드 스플리팅 최적화
- ✅ 런타임 청크 분리
- ✅ 패키지 임포트 최적화 (lucide-react, zustand, sonner 등)

### 2. **번들 크기 최적화**
- ✅ 프레임워크 청크 분리 (React, React-DOM)
- ✅ 라이브러리별 청크 생성
- ✅ 공통 코드 청크 분리
- ✅ 소스맵 비활성화 (프로덕션)

### 3. **이미지 최적화**
- ✅ AVIF, WebP 포맷 지원
- ✅ 반응형 이미지 크기 설정
- ✅ 1년 캐시 TTL

### 4. **React 최적화**
- ✅ React.memo로 불필요한 리렌더링 방지
- ✅ useCallback, useMemo 적극 활용
- ✅ 메모이제이션된 서브 컴포넌트

### 5. **네트워크 최적화**
- ✅ 압축 활성화
- ✅ DNS Prefetch
- ✅ 보안 헤더 설정

### 6. **로깅 최적화**
- ✅ 개발 환경에서만 console.log
- ✅ 프로덕션에서 자동 제거

---

## 📊 예상 성능 개선

### 초기 로딩 속도
- **Before**: ~3-5초
- **After**: ~1-2초 (50-60% 개선)

### 번들 크기
- **Before**: ~500KB (gzipped)
- **After**: ~300KB (gzipped) (40% 감소)

### Time to Interactive (TTI)
- **Before**: ~4-6초
- **After**: ~2-3초 (50% 개선)

---

## 🔧 추가 최적화 권장사항

### 즉시 적용 가능
1. **이미지 최적화**
   - PNG → WebP/AVIF 변환
   - 이미지 압축 (TinyPNG, ImageOptim)
   - Lazy loading 적용

2. **폰트 최적화**
   - 시스템 폰트 우선 사용
   - 폰트 서브셋 생성
   - font-display: swap 적용

3. **CSS 최적화**
   - 사용하지 않는 CSS 제거
   - Critical CSS 인라인
   - Tailwind CSS purge 활성화

### 장기 최적화
1. **CDN 적용**
   - Cloudflare, Vercel Edge
   - 정적 자산 CDN 배포

2. **서버 사이드 캐싱**
   - Redis 캐싱
   - API 응답 캐싱

3. **데이터베이스 최적화**
   - 인덱스 추가
   - 쿼리 최적화
   - Connection pooling

---

## 📈 성능 모니터링

### 권장 도구
- **Lighthouse**: 성능 점수 측정
- **Web Vitals**: LCP, FID, CLS 모니터링
- **Bundle Analyzer**: 번들 크기 분석

### 측정 방법
```bash
# Lighthouse 실행
npm run build
npm start
lighthouse http://localhost:3000 --view

# Bundle 분석
npm run analyze
```

---

## ⚡ 빠른 체크리스트

- [x] console.log 제거
- [x] 코드 스플리팅
- [x] 이미지 최적화 설정
- [x] React.memo 적용
- [x] 압축 활성화
- [ ] 이미지 파일 최적화 (수동)
- [ ] 폰트 최적화 (수동)
- [ ] CDN 적용 (배포 시)

---

## 🎯 성능 목표

### Core Web Vitals
- **LCP (Largest Contentful Paint)**: < 2.5초
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### Lighthouse 점수
- **Performance**: > 90
- **Accessibility**: > 95
- **Best Practices**: > 95
- **SEO**: > 90
