# Git을 사용한 배포 가이드

이 문서는 Pick-My-AI 애플리케이션을 Git과 Netlify를 사용하여 배포하는 방법을 안내합니다.

## 📋 목차
1. [사전 준비](#사전-준비)
2. [Git 저장소 설정](#git-저장소-설정)
3. [Netlify 배포 설정](#netlify-배포-설정)
4. [환경 변수 설정](#환경-변수-설정)
5. [자동 배포 설정](#자동-배포-설정)
6. [배포 확인](#배포-확인)
7. [문제 해결](#문제-해결)

---

## 사전 준비

### 1. 필요한 계정
- [GitHub](https://github.com) 계정 (또는 GitLab, Bitbucket)
- [Netlify](https://www.netlify.com) 계정
- [Supabase](https://supabase.com) 프로젝트

### 2. 필요한 도구
- Git 설치 확인
  ```bash
  git --version
  ```

### 3. 환경 변수 준비
다음 정보를 미리 준비하세요:
- Supabase URL
- Supabase Anon Key
- Supabase Service Role Key
- OpenAI API Key
- Anthropic API Key
- Google API Key
- Perplexity API Key
- 관리자 비밀번호
- JWT Secret

---

## Git 저장소 설정

### 1. GitHub에 새 저장소 생성

1. [GitHub](https://github.com) 접속 및 로그인
2. 우측 상단 **+** 버튼 → **New repository** 클릭
3. 저장소 정보 입력:
   - **Repository name**: `pick-my-ai` (원하는 이름)
   - **Description**: "AI 모델 선택 플랫폼"
   - **Public** 또는 **Private** 선택
   - ⚠️ **Initialize this repository with a README** 체크 해제
4. **Create repository** 클릭

### 2. 로컬 프로젝트를 Git 저장소로 초기화

프로젝트 폴더에서 터미널 열기:

```bash
# Git 저장소 초기화
git init

# .gitignore 파일 확인 (이미 존재함)
# .env.local, node_modules 등이 포함되어 있는지 확인

# 모든 파일 추가
git add .

# 첫 커밋
git commit -m "Initial commit: Pick-My-AI project"
```

### 3. GitHub 저장소와 연결

GitHub에서 생성한 저장소 URL 복사 후:

```bash
# 원격 저장소 추가 (HTTPS)
git remote add origin https://github.com/your-username/pick-my-ai.git

# 또는 SSH 사용 시
git remote add origin git@github.com:your-username/pick-my-ai.git

# 원격 저장소에 푸시
git branch -M main
git push -u origin main
```

### 4. .gitignore 확인

`.gitignore` 파일에 다음 항목들이 포함되어 있는지 확인:

```gitignore
# 환경 변수 (절대 커밋하지 마세요!)
.env
.env.local
.env.production
.env.development

# 의존성
node_modules/
.pnp
.pnp.js

# Next.js 빌드 파일
.next/
out/
build/
dist/

# 로그
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# 기타
.DS_Store
*.pem
.vercel
```

---

## Netlify 배포 설정

### 1. Netlify에 로그인

1. [Netlify](https://www.netlify.com) 접속
2. **Sign up** 또는 **Log in**
3. GitHub 계정으로 로그인 권장

### 2. 새 사이트 생성

1. Netlify 대시보드에서 **Add new site** → **Import an existing project** 클릭
2. **Deploy with GitHub** 선택
3. GitHub 계정 연결 (처음 사용 시)
4. 저장소 목록에서 `pick-my-ai` 선택

### 3. 빌드 설정

다음 설정 확인 (자동으로 감지됨):

- **Branch to deploy**: `main`
- **Build command**: `npm run build`
- **Publish directory**: `.next`
- **Base directory**: (비워둠)

### 4. 고급 빌드 설정 (선택사항)

**Show advanced** 클릭 후:

- **Node version**: 18 이상 권장
  ```
  NODE_VERSION=18
  ```

### 5. 배포 시작

**Deploy site** 버튼 클릭

⚠️ **첫 배포는 환경 변수가 없어서 실패할 수 있습니다.** 다음 단계에서 환경 변수를 설정하세요.

---

## 환경 변수 설정

### 1. Netlify 환경 변수 페이지 접속

1. Netlify 대시보드 → 배포한 사이트 선택
2. **Site settings** → **Environment variables** 클릭

### 2. 필수 환경 변수 추가

**Add a variable** 버튼을 클릭하여 다음 변수들을 하나씩 추가:

#### Supabase 설정
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

#### AI API Keys
```
OPENAI_API_KEY=sk-proj-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
GOOGLE_API_KEY=your-google-api-key
PERPLEXITY_API_KEY=pplx-your-perplexity-key
```

#### 보안 설정
```
ADMIN_PASSWORD=your-secure-admin-password
JWT_SECRET=your-jwt-secret-at-least-32-characters-long
ENCRYPTION_KEY=your-64-character-encryption-key-here
```

#### 기타 설정
```
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-site.netlify.app
```

### 3. 환경 변수 설정 체크리스트

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **절대 공개하지 마세요!**
- [ ] `OPENAI_API_KEY`
- [ ] `ANTHROPIC_API_KEY`
- [ ] `GOOGLE_API_KEY`
- [ ] `PERPLEXITY_API_KEY`
- [ ] `ADMIN_PASSWORD`
- [ ] `JWT_SECRET`
- [ ] `ENCRYPTION_KEY`

### 4. 재배포

환경 변수 설정 후:

1. **Deploys** 탭으로 이동
2. **Trigger deploy** → **Deploy site** 클릭

또는 Git에 새 커밋을 푸시하면 자동으로 재배포됩니다.

---

## 자동 배포 설정

### 1. Git Push로 자동 배포

Netlify는 기본적으로 Git 푸시 시 자동 배포됩니다:

```bash
# 코드 수정 후
git add .
git commit -m "Update feature"
git push origin main
```

푸시하면 자동으로:
1. Netlify가 변경사항 감지
2. 빌드 시작
3. 배포 완료
4. 이메일 알림 (설정 시)

### 2. 브랜치별 배포 설정

**Site settings** → **Build & deploy** → **Deploy contexts**

- **Production branch**: `main`
- **Branch deploys**: 원하는 브랜치 선택
- **Deploy previews**: Pull request 시 미리보기 배포

### 3. 배포 알림 설정

**Site settings** → **Build & deploy** → **Deploy notifications**

- 이메일 알림
- Slack 알림
- Webhook 등 설정 가능

---

## 배포 확인

### 1. 배포 상태 확인

Netlify 대시보드 → **Deploys** 탭:

- **Published**: 배포 성공 ✅
- **Building**: 빌드 중 🔄
- **Failed**: 배포 실패 ❌

### 2. 배포된 사이트 접속

Netlify가 제공하는 URL로 접속:
```
https://your-site-name.netlify.app
```

### 3. 커스텀 도메인 설정 (선택사항)

**Site settings** → **Domain management** → **Add custom domain**

1. 도메인 입력 (예: `pickmyai.com`)
2. DNS 설정 안내에 따라 도메인 연결
3. HTTPS 자동 설정 (Let's Encrypt)

---

## 문제 해결

### 배포 실패 시

#### 1. 빌드 로그 확인

Netlify 대시보드 → **Deploys** → 실패한 배포 클릭 → **Deploy log** 확인

#### 2. 일반적인 오류

**"Module not found" 오류**
```bash
# 로컬에서 의존성 재설치
npm install
git add package-lock.json
git commit -m "Update dependencies"
git push
```

**"Environment variable not found" 오류**
- Netlify 환경 변수 설정 확인
- 변수 이름 오타 확인
- 재배포 시도

**"Build exceeded maximum allowed runtime" 오류**
- 빌드 시간 초과
- `netlify.toml` 파일 확인
- 불필요한 빌드 단계 제거

#### 3. 캐시 문제

**Site settings** → **Build & deploy** → **Clear cache and deploy site**

### API 키 오류

**증상**: 배포는 성공했지만 AI 모델이 작동하지 않음

**해결**:
1. Netlify 환경 변수에서 API 키 확인
2. API 키 앞뒤 공백 제거
3. API 키 유효성 확인 (각 서비스 대시보드에서)

### Supabase 연결 오류

**증상**: 로그인/회원가입이 작동하지 않음

**해결**:
1. Supabase URL과 Anon Key 확인
2. Supabase Dashboard → **Settings** → **API**에서 키 재확인
3. Supabase RLS 정책 확인

### 관리자 기능 오류

**증상**: 관리자 페이지에서 사용자 목록이 표시되지 않음

**해결**:
1. `SUPABASE_SERVICE_ROLE_KEY` 환경 변수 확인
2. Service Role Key가 올바른지 Supabase Dashboard에서 재확인
3. 재배포

---

## 배포 후 체크리스트

### 기능 테스트

- [ ] 홈페이지 로딩 확인
- [ ] 회원가입/로그인 테스트
- [ ] 소셜 로그인 테스트 (Google, GitHub, Naver)
- [ ] AI 채팅 기능 테스트
- [ ] 크레딧 충전 테스트
- [ ] 관리자 로그인 테스트
- [ ] 관리자 기능 테스트 (사용자 조회, 크레딧 수정)

### 보안 확인

- [ ] HTTPS 적용 확인
- [ ] 환경 변수가 코드에 노출되지 않는지 확인
- [ ] `.env.local` 파일이 Git에 커밋되지 않았는지 확인
- [ ] Service Role Key가 클라이언트에 노출되지 않는지 확인

### 성능 확인

- [ ] 페이지 로딩 속도 확인
- [ ] 모바일 반응형 확인
- [ ] 브라우저 콘솔 오류 확인

---

## 지속적인 업데이트

### 코드 수정 후 배포

```bash
# 1. 코드 수정

# 2. 로컬에서 테스트
npm run dev

# 3. Git 커밋
git add .
git commit -m "Add new feature"

# 4. GitHub에 푸시 (자동 배포)
git push origin main

# 5. Netlify에서 배포 확인
```

### 환경 변수 변경 시

1. Netlify Dashboard → **Site settings** → **Environment variables**
2. 변수 수정
3. **Deploys** → **Trigger deploy** → **Deploy site**

---

## 유용한 명령어

### Git 명령어

```bash
# 현재 상태 확인
git status

# 변경사항 확인
git diff

# 커밋 히스토리 확인
git log --oneline

# 브랜치 생성 및 전환
git checkout -b feature/new-feature

# 브랜치 병합
git checkout main
git merge feature/new-feature

# 원격 저장소 최신 상태 가져오기
git pull origin main
```

### Netlify CLI (선택사항)

```bash
# Netlify CLI 설치
npm install -g netlify-cli

# 로그인
netlify login

# 로컬에서 배포 테스트
netlify dev

# 수동 배포
netlify deploy --prod
```

---

## 추가 참고 자료

- [Netlify Documentation](https://docs.netlify.com/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Git Documentation](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)

---

## 도움이 필요하신가요?

### Netlify 지원
- [Netlify Support](https://www.netlify.com/support/)
- [Netlify Community](https://answers.netlify.com/)

### 프로젝트 관련
- GitHub Issues에 문의
- 프로젝트 문서 참고:
  - `ADMIN_SETUP.md` - 관리자 기능 설정
  - `SOCIAL_LOGIN_SETUP.md` - 소셜 로그인 설정

---

## 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.
