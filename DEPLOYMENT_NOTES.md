# 배포 관련 참고사항

## 현재 배포 상태

- **배포 방식**: Netlify 정적 사이트 (output: 'export')
- **배포 URL**: https://tranquil-caramel-10d617.netlify.app

## 제한사항

### 1. API 라우트 비활성화
정적 배포로 인해 다음 API가 작동하지 않습니다:
- `/api/chat` - AI 채팅 기능
- `/api/generate-title` - 제목 생성
- `/api/payments/toss/confirm` - 결제 확인

### 2. 피드백/스크린샷 전송
- 피드백은 로컬 스토리지에만 저장됨
- 스크린샷은 base64로 인코딩되어 저장되지만 서버로 전송되지 않음
- Admin 페이지에서 로컬에 저장된 피드백만 확인 가능

## 해결 방법

### 옵션 1: Vercel 배포 (권장)
Next.js를 개발한 Vercel에 배포하면 모든 기능이 정상 작동합니다.

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel --prod
```

### 옵션 2: Netlify Functions 사용
`next.config.js`에서 `output: 'export'` 제거하고 Netlify Functions로 API 라우트 활성화

### 옵션 3: 외부 API 서버 구축
별도의 백엔드 서버를 구축하여 피드백/스크린샷 처리

## 임시 해결책

현재는 다음과 같이 작동합니다:
- 피드백 제출 시 로컬 스토리지에 저장
- Admin 페이지에서 해당 브라우저의 피드백 확인 가능
- 스크린샷은 base64로 저장되어 Admin에서 확인 가능

## 복구 방법

서버 기능이 필요한 경우:
1. `next.config.js`에서 `output: 'export'` 제거
2. Vercel 또는 서버리스 함수를 지원하는 플랫폼에 배포
