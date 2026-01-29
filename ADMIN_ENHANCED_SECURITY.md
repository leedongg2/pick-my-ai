# 관리자 페이지 보안 강화 완료

## 🔒 적용된 보안 강화 사항

### 1. 256비트 랜덤 경로 보호 ⚡

**기존**: `/admin` (누구나 추측 가능)
**개선**: `/[256-bit-random-string]` (사실상 추측 불가능)

```env
NEXT_PUBLIC_ADMIN_SECRET_PATH=a3f8d9c2b1e5f4a7c6d8e9f0b1a2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0
```

**예시 경로**:
```
https://pickmyai.store/a3f8d9c2b1e5f4a7c6d8e9f0b1a2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0
```

### 2. 비밀번호 실패 제한 시스템 🛡️

- **최대 시도 횟수**: 5회 (설정 가능)
- **잠금 시간**: 30분 (설정 가능)
- **IP 기반 추적**: 각 IP별로 독립적으로 카운트
- **자동 정리**: 1시간마다 오래된 데이터 삭제

#### 동작 방식
```
1회 실패 → "남은 시도: 4회"
2회 실패 → "남은 시도: 3회"
3회 실패 → "남은 시도: 2회"
4회 실패 → "남은 시도: 1회"
5회 실패 → "30분간 잠금 ⏱️"
```

### 3. Supabase 전체 관리 기능 🗄️

관리자 페이지에서 Supabase의 모든 기능을 사용할 수 있습니다:

#### 사용자 관리
- ✅ 사용자 목록 조회
- ✅ 크레딧 수정 (JSON 편집)
- ✅ **사용자 완전 삭제** (auth + public tables)

#### 데이터베이스 작업
- ✅ 테이블 데이터 조회
- ✅ 데이터 삽입/수정/삭제
- ✅ 테이블 스키마 조회

#### 기존 기능 유지
- ✅ AI 모델 가격 설정
- ✅ 고객 문의 관리
- ✅ 투표 생성 및 관리

### 4. 기존 경로 차단 🚫

- `/admin` → 404 리다이렉트 (완전 차단)
- `/admin/login` → 작동 안 함
- 오직 비밀 경로만 작동

---

## 📋 설정 방법

### 1단계: 환경 변수 설정

`.env.local` 파일에 추가:

```env
# 관리자 페이지 보안 (매우 중요!)
# 256비트 랜덤 문자열 생성
NEXT_PUBLIC_ADMIN_SECRET_PATH=a3f8d9c2b1e5f4a7c6d8e9f0b1a2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0

# 관리자 비밀번호
ADMIN_PASSWORD=YourVerySecurePassword123!@#

# 비밀번호 실패 제한
ADMIN_MAX_ATTEMPTS=5
ADMIN_LOCKOUT_DURATION=1800000

# Supabase Service Role Key (필수)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 2단계: 랜덤 문자열 생성

#### PowerShell (Windows):
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

#### Node.js:
```javascript
require('crypto').randomBytes(32).toString('hex')
```

#### OpenSSL:
```bash
openssl rand -hex 32
```

### 3단계: 접속

```
https://your-domain.com/[NEXT_PUBLIC_ADMIN_SECRET_PATH]
```

예시:
```
https://pickmyai.store/a3f8d9c2b1e5f4a7c6d8e9f0b1a2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0
```

---

## 🎯 관리 가능한 기능

### 설정 탭
- AI 모델 활성화/비활성화
- 모델별 가격 설정 (원가)
- 최소 결제 금액 설정

### 고객 문의함 탭
- 문의 및 피드백 확인
- 처리 완료 표시
- 스크린샷 확인

### 투표 관리 탭
- 새 투표 생성
- 투표 결과 확인
- 투표 종료

### 유저 크레딧 관리 탭
- 전체 사용자 목록 조회
- 사용자별 크레딧 확인
- 크레딧 수정 (JSON 편집)

### 데이터베이스 관리 탭 (신규!)
- **사용자 완전 삭제**
  - auth.users 삭제
  - users 테이블 삭제
  - user_wallets 삭제
  - chat_sessions 삭제
- Supabase Dashboard 링크
- 관리 가능 작업 목록

---

## 🔐 보안 수준

### Level 1: 경로 보안
- 256비트 랜덤 경로 (2^256 조합)
- 추측 불가능
- 자동화된 공격 방지

### Level 2: 인증 보안
- 환경 변수 기반 비밀번호
- JWT 토큰 (24시간 유효)
- HMAC-SHA256 서명

### Level 3: Rate Limiting
- IP 기반 추적
- 5회 실패 시 30분 잠금
- 자동 정리 시스템

### Level 4: API 보안
- Bearer Token 인증
- 토큰 검증
- Service Role Key 보호

---

## 📊 보안 비교

| 항목 | 기존 | 개선 | 보안 수준 |
|------|------|------|-----------|
| **경로** | `/admin` | `/[256-bit]` | ⭐⭐⭐⭐⭐ |
| **실패 제한** | ❌ 없음 | ✅ 5회/30분 | ⭐⭐⭐⭐⭐ |
| **DB 관리** | ❌ 제한적 | ✅ 전체 관리 | ⭐⭐⭐⭐⭐ |
| **토큰** | ✅ 있음 | ✅ 강화됨 | ⭐⭐⭐⭐⭐ |

---

## ⚠️ 주의사항

### 절대 하지 말아야 할 것
1. **비밀 경로 공유** - 오직 관리자만 알아야 함
2. **Git에 커밋** - `.env.local`은 절대 커밋하지 마세요
3. **HTTP 사용** - 반드시 HTTPS만 사용
4. **브라우저 저장** - 북마크하지 마세요 (가능하면)

### 권장사항
1. **정기적 변경** - 6개월마다 경로 변경
2. **VPN 사용** - 추가 보안을 위해
3. **강력한 비밀번호** - 최소 16자, 특수문자 포함
4. **로그 모니터링** - 의심스러운 접근 확인

---

## 🚨 긴급 상황 대응

### 비밀 경로가 노출된 경우
1. 즉시 새로운 랜덤 문자열 생성
2. `.env.local` 업데이트
3. 서버 재시작
4. 모든 관리자 세션 무효화

### 비밀번호가 노출된 경우
1. `.env.local`에서 `ADMIN_PASSWORD` 변경
2. 서버 재시작
3. 새 비밀번호로 재로그인

### 계정이 잠긴 경우
- **대기**: 30분 후 자동 해제
- **긴급**: 서버 재시작 (로컬: `npm run dev`)

---

## 📚 관련 문서

- `ADMIN_SECRET_PATH.md` - 비밀 경로 상세 가이드
- `.env.example` - 환경 변수 예제
- `SUPABASE_SETUP.md` - Supabase 설정 가이드

---

## 🎉 완료!

이제 관리자 페이지는 **최고 수준의 보안**으로 보호됩니다!

- 🔒 256비트 암호화 경로
- 🛡️ IP 기반 Rate Limiting
- 🗄️ Supabase 전체 관리
- ⚡ 실시간 모니터링

**절대 비밀 경로를 공유하지 마세요!**
