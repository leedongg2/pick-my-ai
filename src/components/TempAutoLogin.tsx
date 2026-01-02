'use client';

import { useEffect } from 'react';
import { useStore } from '@/store';

// TEMP_ENABLED_START - 임시 자동 로그인 컴포넌트 (복구 시 이 파일 전체 삭제 또는 import 제거)
export function TempAutoLogin() {
  useEffect(() => {
    const { isAuthenticated, tempAutoLogin } = useStore.getState();
    
    // 인증되지 않은 경우에만 자동 로그인
    if (!isAuthenticated) {
      tempAutoLogin();
    }
  }, []);

  return null;
}
// TEMP_ENABLED_END
