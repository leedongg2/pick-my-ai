# 이미 가입된 계정 자동 로그인 수정

## 🔧 문제점

이미 회원가입되어 있는 계정으로 다시 회원가입을 시도하면:
- ❌ 에러 메시지만 표시되고 로그인도 안됨
- ❌ 사용자가 수동으로 로그인 페이지로 이동해야 함

## ✅ 수정 내용

### 1. **AuthService.register() 수정**

**파일**: `src/lib/auth.ts`

이미 가입된 계정으로 회원가입 시도 시 자동으로 로그인 처리:

```typescript
// identities가 비어있으면 이미 존재하는 사용자 - 자동 로그인 시도
if (authData.user.identities && authData.user.identities.length === 0) {
  // 이미 가입된 계정이므로 로그인 시도
  const loginResult = await this.login(email, password);
  if (loginResult.success) {
    return { success: true, autoLogin: true };
  }
  return { success: false, error: '이미 사용 중인 이메일입니다. 로그인을 시도해주세요.' };
}
```

**반환 타입 수정**:
```typescript
Promise<{ 
  success: boolean; 
  error?: string; 
  requiresEmailVerification?: boolean;
  autoLogin?: boolean;  // ✅ 추가됨
}>
```

### 2. **Store register() 수정**

**파일**: `src/store/index.ts`

`autoLogin` 플래그 처리 - 자동 로그인 시 사용자 정보 및 지갑 정보 로드:

```typescript
if (result.success) {
  // autoLogin 플래그가 있으면 이미 가입된 계정으로 자동 로그인된 것
  if (result.autoLogin) {
    // 로그인 처리 - 사용자 정보 가져오기
    const user = await AuthService.getCurrentUser();
    if (user) {
      set({ currentUser: user });
      // 지갑 정보 로드
      const { data: walletData } = await (await import('@/lib/supabase')).supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (walletData) {
        set({ wallet: walletData });
      }
    }
  }
  return { success: true, autoLogin: result.autoLogin };
}
```

---

## 🎯 동작 방식

### 새로운 사용자 회원가입
1. 이메일/비밀번호/이름 입력
2. Supabase에 계정 생성
3. users 테이블에 정보 저장
4. user_wallets 생성
5. ✅ 회원가입 완료

### 이미 가입된 사용자가 회원가입 시도
1. 이메일/비밀번호/이름 입력
2. Supabase가 이미 존재하는 계정 감지
3. **자동으로 로그인 시도** ✅
4. 로그인 성공 시:
   - 사용자 정보 로드
   - 지갑 정보 로드
   - `autoLogin: true` 반환
5. ✅ 자동 로그인 완료

### 비밀번호가 틀린 경우
1. 이메일/비밀번호/이름 입력
2. Supabase가 이미 존재하는 계정 감지
3. 로그인 시도
4. ❌ 비밀번호 불일치
5. 에러 메시지: "이미 사용 중인 이메일입니다. 로그인을 시도해주세요."

---

## 🧪 테스트 시나리오

### 시나리오 1: 새 사용자 회원가입
```
입력: test@example.com / password123 / 홍길동
결과: ✅ 회원가입 성공 → 로그인 상태
```

### 시나리오 2: 이미 가입된 계정 (올바른 비밀번호)
```
입력: existing@example.com / correctpassword / 아무이름
결과: ✅ 자동 로그인 성공 → 로그인 상태
```

### 시나리오 3: 이미 가입된 계정 (틀린 비밀번호)
```
입력: existing@example.com / wrongpassword / 아무이름
결과: ❌ "이미 사용 중인 이메일입니다. 로그인을 시도해주세요."
```

---

## 📝 수정된 파일 목록

1. `src/lib/auth.ts` - AuthService.register() 자동 로그인 로직 추가
2. `src/store/index.ts` - autoLogin 플래그 처리
3. `AUTO_LOGIN_FIX.md` - 이 문서

---

## 🚀 배포 후 확인사항

- [ ] 새 사용자 회원가입 테스트
- [ ] 이미 가입된 계정으로 회원가입 시도 (올바른 비밀번호)
- [ ] 이미 가입된 계정으로 회원가입 시도 (틀린 비밀번호)
- [ ] 자동 로그인 후 지갑 정보 정상 로드 확인
- [ ] 자동 로그인 후 채팅 기능 정상 작동 확인

---

## 💡 추가 개선 사항 (선택)

UI에서 `autoLogin` 플래그를 감지하여 사용자에게 알림:

```typescript
if (result.autoLogin) {
  toast.success('이미 가입된 계정입니다. 자동으로 로그인되었습니다.');
} else {
  toast.success('회원가입이 완료되었습니다!');
}
```
