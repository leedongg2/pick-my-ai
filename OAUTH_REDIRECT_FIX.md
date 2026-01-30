# OAuth 리다이렉트 수정 가이드

## 🔧 수정 내용

### 1. **로그인 안했을 때 UI 개선**
채팅 페이지 왼쪽 사이드바 하단의 "설정"과 "대시보드" 버튼이 로그인하지 않은 사용자에게 표시되지 않도록 수정했습니다.

**수정된 파일**: `src/components/Chat.tsx`

```tsx
{/* 하단 메뉴 - 로그인한 경우만 표시 */}
{currentUser && (
  <div className="border-t border-gray-200 p-2 space-y-1">
    <button onClick={() => router.push('/dashboard')}>
      대시보드
    </button>
    <button onClick={() => router.push('/settings')}>
      설정
    </button>
  </div>
)}
```

---

### 2. **OAuth 리다이렉트 URL 수정**

배포 환경에서 OAuth 인증 후 localhost로 리다이렉트되는 문제를 해결했습니다.

**수정된 파일**: `src/lib/auth.ts`

#### Google & GitHub OAuth
```typescript
// 배포 환경에서는 실제 도메인을 사용, 로컬에서는 localhost 사용
const isProduction = process.env.NODE_ENV === 'production';
const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pickmyai.store';
const redirectUrl = isProduction ? productionUrl : window.location.origin;

const { data, error } = await supabase.auth.signInWithOAuth({
  provider: provider as any,
  options: {
    redirectTo: `${redirectUrl}/auth/callback`,
  },
});
```

#### Naver OAuth
```typescript
const isProduction = process.env.NODE_ENV === 'production';
const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pickmyai.store';
const baseUrl = isProduction ? productionUrl : window.location.origin;
const redirectUri = `${baseUrl}/api/auth/naver/callback`;
```

---

## 📝 환경 변수 설정

`.env.local` (로컬 개발):
```env
NODE_ENV=development
# NEXT_PUBLIC_SITE_URL은 설정하지 않아도 됨 (자동으로 localhost 사용)
```

Netlify 환경 변수 (프로덕션):
```env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://pickmyai.store
```

---

## ✅ 동작 방식

### 로컬 개발 환경
- `NODE_ENV=development`
- OAuth 리다이렉트: `http://localhost:3000/auth/callback`

### 프로덕션 환경
- `NODE_ENV=production`
- OAuth 리다이렉트: `https://pickmyai.store/auth/callback`

---

## 🧪 테스트

### 1. 로컬 환경
1. `npm run dev` 실행
2. 채팅 페이지에서 로그인하지 않은 상태 확인
3. 설정/대시보드 버튼이 표시되지 않는지 확인
4. 소셜 로그인 → localhost로 정상 리다이렉트

### 2. 프로덕션 환경
1. Netlify에 배포
2. `NEXT_PUBLIC_SITE_URL=https://pickmyai.store` 환경 변수 설정
3. 소셜 로그인 → pickmyai.store로 리다이렉트 확인

---

## 🔐 Google Cloud Console 설정

**Authorized redirect URIs**에 다음 URL들이 모두 등록되어 있어야 합니다:

```
https://[YOUR-SUPABASE-PROJECT-ID].supabase.co/auth/v1/callback
https://pickmyai.store/auth/callback
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
```

---

## 📋 수정된 파일 목록

1. `src/components/Chat.tsx` - 비로그인 시 설정/대시보드 버튼 숨김
2. `src/lib/auth.ts` - OAuth 리다이렉트 URL 동적 설정
3. `.env.example` - NEXT_PUBLIC_SITE_URL 환경 변수 추가
4. `OAUTH_REDIRECT_FIX.md` - 이 문서

---

## 🚀 배포 시 체크리스트

- [ ] Netlify 환경 변수에 `NEXT_PUBLIC_SITE_URL` 설정
- [ ] Google Cloud Console에 프로덕션 리다이렉트 URI 등록
- [ ] Supabase Site URL 설정 확인
- [ ] 배포 후 소셜 로그인 테스트
