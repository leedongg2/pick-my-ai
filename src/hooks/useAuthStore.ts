import { useStore } from '@/store';
import { shallow } from 'zustand/shallow';

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
  return useStore(
    (state) => ({
      isAuthenticated: state.isAuthenticated,
      currentUser: state.currentUser,
    }),
    shallow
  );
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
