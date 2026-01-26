'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useStore } from '@/store';

interface DesignPreviewContextValue {
  isPreviewMode: boolean;
  onElementClick?: (elementId: string, elementType: string, elementLabel: string) => void;
}

const DesignPreviewContext = createContext<DesignPreviewContextValue>({
  isPreviewMode: false,
});

export const useDesignPreview = () => useContext(DesignPreviewContext);

interface DesignPreviewProviderProps {
  children: ReactNode;
  isPreviewMode?: boolean;
  onElementClick?: (elementId: string, elementType: string, elementLabel: string) => void;
}

export const DesignPreviewProvider: React.FC<DesignPreviewProviderProps> = ({
  children,
  isPreviewMode = false,
  onElementClick,
}) => {
  const { isAuthenticated, tempAutoLogin, initWallet, wallet } = useStore();

  // 미리보기 모드에서는 강제로 로그인 상태 보장
  useEffect(() => {
    if (isPreviewMode && !isAuthenticated) {
      tempAutoLogin();
    }
  }, [isPreviewMode, isAuthenticated, tempAutoLogin]);

  // 지갑 초기화 확인
  useEffect(() => {
    if (isPreviewMode && isAuthenticated && !wallet) {
      const currentUser = useStore.getState().currentUser;
      if (currentUser) {
        initWallet(currentUser.id);
      }
    }
  }, [isPreviewMode, isAuthenticated, wallet, initWallet]);

  // 미리보기 모드에서는 모든 네비게이션 차단
  useEffect(() => {
    if (!isPreviewMode) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Link 컴포넌트나 a 태그 클릭 차단
      const link = target.closest('a');
      if (link) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 버튼 클릭도 기본 동작 차단 (단, 요소 선택은 허용)
      const button = target.closest('button');
      if (button && !button.hasAttribute('data-preview-allow')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // 캡처 단계에서 이벤트 가로채기
    document.addEventListener('click', handleClick, true);
    
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [isPreviewMode]);

  return (
    <DesignPreviewContext.Provider value={{ isPreviewMode, onElementClick }}>
      {children}
    </DesignPreviewContext.Provider>
  );
};
