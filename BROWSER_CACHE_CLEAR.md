# 브라우저 캐시 완전 초기화 방법

## 디자인이 깨졌을 때 해야 할 일

### 1. 강력 새로고침 (Hard Refresh)

#### Windows/Linux:
- **Chrome/Edge**: `Ctrl + Shift + R` 또는 `Ctrl + F5`
- **Firefox**: `Ctrl + Shift + R` 또는 `Ctrl + F5`

#### Mac:
- **Chrome/Edge**: `Cmd + Shift + R`
- **Firefox**: `Cmd + Shift + R`
- **Safari**: `Cmd + Option + R`

### 2. 개발자 도구 사용

1. **F12** 키를 눌러 개발자 도구 열기
2. **Network** 탭으로 이동
3. **Disable cache** 체크박스 선택
4. 페이지 새로고침

### 3. 브라우저 캐시 완전 삭제

#### Chrome/Edge:
1. `Ctrl + Shift + Delete` (Mac: `Cmd + Shift + Delete`)
2. "캐시된 이미지 및 파일" 선택
3. "데이터 삭제" 클릭

#### Firefox:
1. `Ctrl + Shift + Delete`
2. "캐시" 선택
3. "지금 지우기" 클릭

### 4. 시크릿 모드로 테스트

- **Chrome/Edge**: `Ctrl + Shift + N`
- **Firefox**: `Ctrl + Shift + P`

시크릿 모드에서 `http://localhost:3000` 접속

### 5. CSS가 로드되는지 확인

개발자 도구(F12) → **Network** 탭:
- `layout.css` 파일이 200 (OK) 상태로 로드되는지 확인
- 404 또는 빨간색으로 표시되면 문제

### 6. 콘솔 오류 확인

개발자 도구(F12) → **Console** 탭:
- CSS 관련 오류가 있는지 확인
- Tailwind 관련 오류가 있는지 확인

## 문제가 계속되면

### 서버 완전 재시작

```bash
# 1. 모든 Node 프로세스 종료
taskkill /F /IM node.exe

# 2. .next 폴더 삭제
Remove-Item -Recurse -Force .next

# 3. node_modules 재설치 (필요시)
Remove-Item -Recurse -Force node_modules
npm install

# 4. 개발 서버 재시작
npm run dev
```

### 브라우저 완전 재시작

1. 모든 브라우저 창 닫기
2. 브라우저 다시 열기
3. `http://localhost:3000` 접속

## 현재 상태

✅ 서버 재시작 완료
✅ .next 캐시 삭제 완료
✅ CSS 파일 로드 확인 완료 (`/_next/static/css/app/layout.css`)

→ **브라우저 강력 새로고침(`Ctrl + Shift + R`)만 하면 됩니다!**

