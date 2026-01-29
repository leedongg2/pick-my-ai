'use client';

import React from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// 인증 기능 임시 비활성화 - 모든 사용자 접근 허용
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  return <>{children}</>;
};

