# 이메일 중복 확인 기능 가이드

## 기능 개요
회원가입 시 이미 존재하는 이메일인 경우 인증 메일을 보내지 않고 즉시 "이미 사용 중인 이메일입니다." 메시지를 표시합니다.

## 구현 내용

### 1. 중복 확인 순서
1. **이메일 형식 검증**
2. **RPC 함수로 auth.users 테이블 확인** (선호)
3. **public.users 테이블 확인** (fallback)
4. **Supabase Auth signUp 호출**
5. **identities 확인** (마지막 방어선)

### 2. 코드 변경 사항

#### `src/lib/auth.ts`
- ✅ 이메일 중복 확인 로직 추가
- ✅ `check_email_exists` RPC 함수 호출
- ✅ Supabase Auth 오류 메시지 처리
- ✅ `identities.length === 0` 체크 (이미 존재하는 사용자)

#### `src/store/index.ts`
- ✅ `register` 함수 반환 타입 변경: `Promise<boolean>` → `Promise<{ success: boolean; error?: string }>`
- ✅ 에러 메시지를 포함한 객체 반환
- ✅ 로컬 모드에서도 동일한 에러 처리

#### `src/components/Auth.tsx`
- ✅ register 함수 호출 결과를 객체로 받음
- ✅ 에러 메시지를 toast로 표시

## Supabase 설정 (필수)

### RPC 함수 생성

**Supabase Dashboard** → **SQL Editor**에서 실행:

```sql
-- 이메일 중복 확인 함수
CREATE OR REPLACE FUNCTION check_email_exists(check_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  email_count integer;
BEGIN
  -- auth.users 테이블에서 이메일 확인
  SELECT COUNT(*) INTO email_count
  FROM auth.users
  WHERE email = check_email;
  
  -- 존재하면 true, 없으면 false 반환
  RETURN email_count > 0;
END;
$$;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION check_email_exists(text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_email_exists(text) TO anon;
```

### 테스트

```sql
-- 이메일이 존재하는지 확인
SELECT check_email_exists('test@example.com');

-- 결과: true (존재) 또는 false (존재하지 않음)
```

## 작동 흐름

### 새로운 이메일로 회원가입
1. 사용자가 회원가입 폼 작성
2. 이메일 형식 검증 ✅
3. `check_email_exists()` 호출 → `false` 반환
4. `public.users` 테이블 확인 → 없음
5. Supabase Auth `signUp` 호출 ✅
6. `identities.length > 0` → 새 사용자 확인
7. 인증 이메일 발송 📧
8. "회원가입 완료! 이메일을 확인해주세요." 메시지

### 이미 존재하는 이메일로 회원가입 시도
1. 사용자가 회원가입 폼 작성
2. 이메일 형식 검증 ✅
3. `check_email_exists()` 호출 → `true` 반환
4. **즉시 "이미 사용 중인 이메일입니다." 오류 반환**
5. ❌ Supabase Auth 호출 안 함
6. ❌ 인증 이메일 발송 안 함
7. 토스트 메시지로 "이미 사용 중인 이메일입니다." 표시

### Fallback (RPC 함수가 없는 경우)
1. `check_email_exists()` 오류 → 무시
2. `public.users` 테이블에서 직접 확인
3. 존재하면 "이미 사용 중인 이메일입니다." 반환
4. 없으면 Supabase Auth 호출 진행

### 최종 방어선
```typescript
// identities가 비어있으면 이미 존재하는 사용자
if (authData.user.identities && authData.user.identities.length === 0) {
  return { success: false, error: '이미 사용 중인 이메일입니다.' };
}
```

## 사용자 경험

### 기존 방식 (문제)
```
1. 이메일 입력: existing@example.com
2. 회원가입 버튼 클릭
3. ⏳ 잠시 대기...
4. 📧 인증 이메일 발송됨
5. 이메일 확인 화면 표시
6. 사용자: "이메일이 안 왔는데?"
```

### 새 방식 (개선)
```
1. 이메일 입력: existing@example.com
2. 회원가입 버튼 클릭
3. ⚠️ 즉시 "이미 사용 중인 이메일입니다." 오류 표시
4. 사용자: "아, 이미 가입했구나. 로그인하자!"
```

## 테스트 방법

### 1. 새 이메일로 회원가입
```
이메일: newuser@example.com
비밀번호: password123
이름: 테스트 사용자

예상 결과: ✅ "회원가입 완료! 이메일을 확인해주세요."
```

### 2. 같은 이메일로 다시 회원가입 시도
```
이메일: newuser@example.com
비밀번호: anypassword
이름: 다른 이름

예상 결과: ⚠️ "이미 사용 중인 이메일입니다."
```

### 3. 브라우저 콘솔 확인
```javascript
// F12 → Console 탭
// 다음 메시지가 표시되지 않아야 함:
// - "✅ 사용자 정보 저장 성공"
// - "✅ 지갑 생성 성공"

// 대신 즉시 오류 반환
```

## 오류 처리

### 가능한 오류 메시지
- "비밀번호는 최소 6자 이상이어야 합니다."
- "올바른 이메일 형식이 아닙니다."
- **"이미 사용 중인 이메일입니다."** ← 새로 추가됨
- "사용자 생성 실패"

### 로컬 모드 (Supabase 미설정)
- 로컬 `userDatabase`에서 중복 확인
- 동일한 에러 메시지 표시

## 디버깅

### RPC 함수 작동 확인
```javascript
// 브라우저 콘솔에서
const { data, error } = await supabase.rpc('check_email_exists', {
  check_email: 'test@example.com'
});

console.log('Email exists:', data);
console.log('Error:', error);
```

### 문제 해결

#### 문제 1: RPC 함수 오류
```
Error: function check_email_exists(check_email text) does not exist
```
**해결**: `ADD_EMAIL_CHECK_FUNCTION.sql` 파일을 Supabase에서 실행

#### 문제 2: 여전히 인증 이메일이 발송됨
**원인**: Supabase Auth 설정에서 중복 이메일 확인이 비활성화됨

**해결**:
1. Supabase Dashboard → Authentication → Settings
2. "Enable email confirmations" 확인
3. "Allow duplicate emails" **비활성화**

#### 문제 3: 로컬 모드에서 작동 안 함
**확인**:
- `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`이 없는지 확인
- 로컬 fallback 로직이 정상 작동해야 함

## 보안 고려사항

### 이메일 존재 여부 노출
- ✅ **허용**: 일반적인 UX 패턴
- ⚠️ **주의**: 이메일 수집 공격 가능성 (매우 낮음)
- 🛡️ **방어**: Rate limiting 적용 (Supabase 기본 제공)

### 대안 (더 보안적)
```typescript
// 이메일 존재 여부를 명확히 알려주지 않음
return { 
  success: false, 
  error: '회원가입에 실패했습니다. 이메일을 확인해주세요.' 
};
```

**현재 구현은 사용자 경험을 우선시합니다.**

## 추가 개선 사항

### 1. 로그인 페이지로 이동 제안
```typescript
if (result.error === '이미 사용 중인 이메일입니다.') {
  toast.error(
    '이미 사용 중인 이메일입니다. 로그인하시겠습니까?',
    {
      action: {
        label: '로그인',
        onClick: () => setIsLogin(true)
      }
    }
  );
}
```

### 2. 비밀번호 재설정 제안
```typescript
// 이미 존재하는 이메일인 경우
'이미 가입된 이메일입니다. 비밀번호를 잊으셨나요?'
```

### 3. Rate Limiting
- Supabase에서 기본 제공
- 추가 설정 불필요

## 요약

✅ **구현 완료**
- 이메일 중복 확인 로직
- 명확한 오류 메시지
- RPC 함수 및 fallback
- 타입 안전성

✅ **사용자 경험 개선**
- 즉시 피드백
- 불필요한 이메일 발송 방지
- 명확한 안내

✅ **다음 단계**
1. `ADD_EMAIL_CHECK_FUNCTION.sql` 실행
2. 테스트
3. 프로덕션 배포

