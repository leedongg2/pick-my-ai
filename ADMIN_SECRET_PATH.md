# 관리자 페이지 보안 경로

## ⚠️ 매우 중요 - 절대 공개하지 마세요!

관리자 페이지는 256비트 랜덤 문자열 경로로 보호됩니다.

### 환경 변수 설정

`.env.local` 파일에 다음 변수를 추가하세요:

```env
# 관리자 페이지 비밀 경로 (256비트 랜덤 문자열)
NEXT_PUBLIC_ADMIN_SECRET_PATH=your-256-bit-random-string-here

# 관리자 비밀번호
ADMIN_PASSWORD=your-secure-admin-password

# 비밀번호 실패 제한 설정
ADMIN_MAX_ATTEMPTS=5
ADMIN_LOCKOUT_DURATION=1800000
```

### 256비트 랜덤 문자열 생성 방법

PowerShell (Windows):
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

Node.js:
```javascript
require('crypto').randomBytes(32).toString('hex')
```

OpenSSL:
```bash
openssl rand -hex 32
```

### 예시

```env
NEXT_PUBLIC_ADMIN_SECRET_PATH=a3f8d9c2b1e5f4a7c6d8e9f0b1a2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0
ADMIN_PASSWORD=MyVerySecureAdminPassword123!@#
ADMIN_MAX_ATTEMPTS=5
ADMIN_LOCKOUT_DURATION=1800000
```

### 접속 방법

쿼리 파라미터 방식으로 접속:
- ✅ `/admin?key=a3f8d9c2b1e5f4a7c6d8e9f0b1a2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0`
- ✅ `/admin/login?key=a3f8d9c2b1e5f4a7c6d8e9f0b1a2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0`

기본 경로는 차단됩니다:
- ❌ `/admin` (키 없이 접근 불가)

### 보안 주의사항

1. **절대 공유하지 마세요** - 이 경로는 오직 관리자만 알아야 합니다
2. **Git에 커밋하지 마세요** - `.env.local`은 `.gitignore`에 포함되어 있습니다
3. **정기적으로 변경하세요** - 최소 6개월마다 새로운 경로로 변경
4. **HTTPS만 사용하세요** - HTTP로는 절대 접속하지 마세요
5. **VPN 사용 권장** - 추가 보안을 위해 VPN 사용을 권장합니다

### 비밀번호 실패 제한

- 최대 실패 횟수: 5회 (기본값, 변경 가능)
- 잠금 시간: 30분 (기본값, 변경 가능)
- IP 기반 추적: 각 IP별로 독립적으로 카운트

### 잠금 해제 방법

1. **시간 경과 대기**: 잠금 시간이 지나면 자동으로 해제됩니다
2. **수동 해제** (긴급):
   - 서버 재시작: `npm run dev` (개발) 또는 서버 재시작 (프로덕션)
   - localStorage 초기화: 브라우저 개발자 도구에서 `localStorage.clear()`

### 문제 해결

#### 경로를 잊어버린 경우
`.env.local` 파일을 확인하세요.

#### 비밀번호를 잊어버린 경우
`.env.local` 파일에서 `ADMIN_PASSWORD`를 확인하거나 변경하세요.

#### 잠금 상태인 경우
- 잠금 시간이 지날 때까지 기다리세요 (기본 30분)
- 또는 서버를 재시작하세요

## 라이선스

이 설정은 보안을 위한 것이며, 무단 접근을 방지하기 위해 설계되었습니다.
