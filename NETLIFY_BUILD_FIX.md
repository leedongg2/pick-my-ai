# Netlify 빌드 실패 해결 가이드

## 🔍 문제 진단

Netlify에서 빌드 실패가 발생했습니다. 에러 로그 분석 결과:
- **Primary Error**: `Module not found: Can't resolve 'tailwindcss'`
- **Secondary Errors**: `Can't resolve '@/components/ui/Button'`, `Can't resolve '@/components/ui/Card'`

## ✅ 확인된 사항

### 1. 로컬 환경 설정 (정상)
- ✅ `package.json`: tailwindcss, postcss, autoprefixer 모두 설치됨
- ✅ `tailwind.config.js`: 올바르게 설정됨
- ✅ `postcss.config.js`: 올바르게 설정됨
- ✅ `tsconfig.json`: path alias (`@/*`) 올바르게 설정됨
- ✅ `src/app/globals.css`: Tailwind directives 포함됨
- ✅ UI 컴포넌트: 모두 존재하며 대소문자 일치

### 2. 문제 원인
Netlify 빌드 환경에서 `node_modules`가 제대로 설치되지 않거나, 의존성 충돌이 발생한 것으로 판단됩니다.

## 🔧 적용된 해결책

### 1. `.npmrc` 파일 생성
```
legacy-peer-deps=true
engine-strict=false
```
- peer dependency 충돌 무시
- Node 엔진 버전 제약 완화

### 2. `netlify.toml` 빌드 설정 개선
```toml
[build]
  command = "npm ci && npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"
  NPM_FLAGS = "--legacy-peer-deps"
```

**변경 사항:**
- `npm run build` → `npm ci && npm run build`
  - `npm ci`: package-lock.json 기반 클린 설치
  - 캐시된 node_modules 문제 방지
- Node 버전 명시: `18`
- NPM 플래그 추가: `--legacy-peer-deps`

## 📋 배포 전 체크리스트

### 로컬 테스트
```bash
# 1. node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install

# 2. 로컬 빌드 테스트
npm run build

# 3. 빌드 성공 확인
npm run start
```

### Git 커밋 확인
다음 파일들이 커밋되었는지 확인:
- ✅ `package.json`
- ✅ `package-lock.json`
- ✅ `tailwind.config.js`
- ✅ `postcss.config.js`
- ✅ `tsconfig.json`
- ✅ `netlify.toml`
- ✅ `.npmrc` (신규)
- ✅ `src/app/globals.css`
- ✅ `src/components/ui/*.tsx`

## 🚀 배포 단계

```bash
# 1. 변경사항 커밋
git add .
git commit -m "fix: resolve Netlify build issues with npm ci and legacy-peer-deps"

# 2. 푸시
git push origin master

# 3. Netlify에서 자동 빌드 시작
# - Netlify Dashboard에서 빌드 로그 확인
# - 빌드 성공 시 자동 배포
```

## 🔄 추가 해결 방법 (빌드 실패 시)

### 방법 1: Netlify 캐시 클리어
1. Netlify Dashboard → Site settings
2. Build & deploy → Build settings
3. "Clear cache and retry deploy" 클릭

### 방법 2: Node 버전 변경
`netlify.toml`에서 Node 버전 변경:
```toml
[build.environment]
  NODE_VERSION = "20"  # 또는 "16"
```

### 방법 3: 빌드 명령 변경
더 강력한 클린 빌드:
```toml
[build]
  command = "rm -rf node_modules .next && npm ci && npm run build"
```

### 방법 4: 환경 변수 확인
Netlify Dashboard에서 환경 변수 설정:
- `NODE_ENV` = `production`
- `NEXT_PUBLIC_APP_URL` = `https://pickmyai.store`
- 기타 필요한 환경 변수들

## 📊 예상 결과

빌드 성공 시 로그:
```
✓ Linting and checking validity of types
✓ Creating an optimized production build
✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

## 🆘 여전히 실패하는 경우

1. **Netlify 빌드 로그 전체 복사**
2. **특정 에러 메시지 확인**
3. **다음 정보 제공:**
   - Node 버전
   - NPM 버전
   - 정확한 에러 메시지
   - 실패한 단계

---

이제 로컬에서 빌드 테스트 후 커밋하면 Netlify에서 정상적으로 배포됩니다! 🎉
