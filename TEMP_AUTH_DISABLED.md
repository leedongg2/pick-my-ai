# 임시 인증 비활성화 설정

⚠️ **주의: 이 파일은 임시 설정을 위한 표시자입니다**

## 변경된 파일들

이 파일이 존재하는 동안 다음 파일들의 인증 관련 코드가 주석 처리되어 있습니다:

1. `src/store/index.ts` - 자동 로그인 활성화
2. `src/components/Header.tsx` - 로그인/회원가입 버튼 숨김
3. `src/app/login/page.tsx` - 로그인 페이지 자동 리다이렉트

## 복구 방법

인증 기능을 다시 활성화하려면:

1. 이 파일(`TEMP_AUTH_DISABLED.md`)을 삭제
2. 각 파일에서 `// TEMP_DISABLED_START`와 `// TEMP_DISABLED_END` 사이의 주석을 해제
3. `// TEMP_ENABLED_START`와 `// TEMP_ENABLED_END` 사이의 코드를 주석 처리
4. 재배포

## 변경 날짜

2026-01-01 22:39 (UTC+09:00)
