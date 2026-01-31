import { useStore } from '@/store';
import { shallow } from 'zustand/shallow';
import { useEffect } from 'react';

/**
 * 인증 관련 상태만 선택하는 최적화된 훅
 * 불필요한 리렌더링 방지
 */
export const useAuthStore = () => {
  return useStore(
    (state) => ({
      currentUser: state.currentUser,
      isAuthenticated: state.isAuthenticated,
      setCurrentUser: state.setCurrentUser,
      setIsAuthenticated: state.setIsAuthenticated,
      login: state.login,
      register: state.register,
      logout: state.logout,
    }),
    shallow
  );
};

/**
 * 인증 상태만 선택하는 경량 훅 (보안 강화)
 */
export const useAuth = () => {
  const auth = useStore(
    (state) => ({
      isAuthenticated: state.isAuthenticated,
      currentUser: state.currentUser,
    }),
    shallow
  );

  // 프로덕션에서 콘솔 조작 방지
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      // 전역 객체에서 인증 상태 숨기기 시도 방지
      const originalDefineProperty = Object.defineProperty;
      Object.defineProperty = function(obj, prop, descriptor) {
        if (prop === 'isAuthenticated' || prop === 'currentUser') {
          return obj;
        }
        return originalDefineProperty(obj, prop, descriptor);
      };
    }
  }, []);

  return auth;
};

/**
 * 인증 액션만 선택하는 훅
 */
export const useAuthActions = () => {
  return useStore(
    (state) => ({
      login: state.login,
      register: state.register,
      logout: state.logout,
      setCurrentUser: state.setCurrentUser,
      setIsAuthenticated: state.setIsAuthenticated,
    }),
    shallow
  );
};
