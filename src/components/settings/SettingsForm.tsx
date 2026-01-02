'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { toast } from 'sonner';
import { User, Lock, Trash2, AlertTriangle, Palette, Paintbrush, Moon, CreditCard, Bell, Award } from 'lucide-react';
import type { ThemeColor } from '@/types';
import dynamic from 'next/dynamic';

// 동적 임포트
const DarkModeToggle = dynamic(() => import('@/components/DarkModeToggle').then(mod => ({ default: mod.DarkModeToggle })), { ssr: false });
const AutoRechargeSettings = dynamic(() => import('@/components/AutoRechargeSettings').then(mod => ({ default: mod.AutoRechargeSettings })), { ssr: false });
const AutoDeleteSettings = dynamic(() => import('@/components/AutoDeleteSettings').then(mod => ({ default: mod.AutoDeleteSettings })), { ssr: false });
const UsageAlerts = dynamic(() => import('@/components/UsageAlerts').then(mod => ({ default: mod.UsageAlerts })), { ssr: false });
const ExpertiseProfiles = dynamic(() => import('@/components/ExpertiseProfiles').then(mod => ({ default: mod.ExpertiseProfiles })), { ssr: false });

export function SettingsForm() {
  const { currentUser, setCurrentUser, setTheme } = useStore();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeColor>('blue');
  
  // Color theme options
  const colorThemes = [
    { 
      name: '무색', 
      value: 'gray' as ThemeColor,
      bg: 'bg-gray-500',
      hover: 'hover:bg-gray-600',
      focus: 'focus:ring-gray-400',
    },
    { 
      name: '붉은색', 
      value: 'red' as ThemeColor,
      bg: 'bg-red-500',
      hover: 'hover:bg-red-600',
      focus: 'focus:ring-red-400',
    },
    { 
      name: '파란색', 
      value: 'blue' as ThemeColor,
      bg: 'bg-blue-500',
      hover: 'hover:bg-blue-600',
      focus: 'focus:ring-blue-400',
    },
    { 
      name: '초록색', 
      value: 'green' as ThemeColor,
      bg: 'bg-green-500',
      hover: 'hover:bg-green-600',
      focus: 'focus:ring-green-400',
    },
    { 
      name: '보라색', 
      value: 'purple' as ThemeColor,
      bg: 'bg-purple-500',
      hover: 'hover:bg-purple-600',
      focus: 'focus:ring-purple-400',
    },
    { 
      name: '주황색', 
      value: 'orange' as ThemeColor,
      bg: 'bg-orange-500',
      hover: 'hover:bg-orange-600',
      focus: 'focus:ring-orange-400',
    },
    { 
      name: '노란색', 
      value: 'yellow' as ThemeColor,
      bg: 'bg-yellow-500',
      hover: 'hover:bg-yellow-600',
      focus: 'focus:ring-yellow-400',
    }
  ];

  // Update form fields when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      // Load saved theme if exists
      if (currentUser.theme) {
        setSelectedTheme(currentUser.theme);
        document.documentElement.setAttribute('data-theme', currentUser.theme);
      }
    }
  }, [currentUser]);
  
  const handleThemeChange = (theme: ThemeColor) => {
    setSelectedTheme(theme);
    
    if (currentUser) {
      // Update the theme in the root HTML element for global theming
      document.documentElement.setAttribute('data-theme', theme);
      
      // Update the theme in the store
      setTheme(theme);
      
      // Also update the user's theme preference
      const updatedUser = {
        ...currentUser,
        theme,
      };
      setCurrentUser(updatedUser);
      
      // Show success message
      toast.success(`테마가 ${colorThemes.find(t => t.value === theme)?.name}(으)로 변경되었습니다.`);
    }
  };
  
  const { settings, toggleSuccessNotifications, logout } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { currentUser, setCurrentUser } = useStore.getState();
      
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          name,
          email
        };
        
        // Update in the store
        setCurrentUser(updatedUser);
        
        // TODO: Implement actual API call to update user settings
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        
        if (settings.showSuccessNotifications) {
          toast.success('설정이 저장되었습니다.');
        }
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      // TODO: Implement actual account deletion API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      // Logout after successful deletion
      await logout();

      // Redirect to login page for clarity
      toast.success('계정이 성공적으로 삭제되었습니다.');
      router.replace('/login?mode=login');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('계정 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // TODO: Implement actual password change API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      toast.success('비밀번호가 변경되었습니다.');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDesignEditor = () => {
    router.push('/design-editor');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-6 py-8">
      {/* 디자인 에디터 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Paintbrush className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">디자인 커스터마이징</h3>
              <p className="text-sm text-gray-600">원하는 색상으로 UI를 직접 디자인하세요</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            인터랙티브 디자인 에디터에서 버튼, 텍스트, 배경 등 모든 요소의 색상을 실시간으로 변경할 수 있습니다.
          </p>
          <button
            type="button"
            onClick={handleOpenDesignEditor}
            className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center"
          >
            <Paintbrush className="w-4 h-4 mr-2" />
            디자인하기
          </button>
        </div>
      </div>

      {/* 다크모드 설정 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Moon className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">다크모드</h3>
              <p className="text-sm text-gray-600">라이트, 다크, 시스템 모드 중 선택하세요</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <DarkModeToggle />
        </div>
      </div>

      {/* 테마 설정 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Palette className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">테마 색상</h3>
              <p className="text-sm text-gray-600">애플리케이션의 색상 테마를 선택하세요</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-3">
            {colorThemes.map((theme) => (
              <button
                key={theme.value}
                type="button"
                onClick={() => handleThemeChange(theme.value)}
                className={`w-11 h-11 rounded-lg ${theme.bg} ${theme.hover} ${
                  selectedTheme === theme.value ? 'ring-2 ring-offset-2 ring-gray-900' : ''
                } transition-all`}
                title={theme.name}
              >
                <span className="sr-only">{theme.name}</span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm text-gray-600">
            선택한 색상: <span className="font-medium text-gray-900">{colorThemes.find(t => t.value === selectedTheme)?.name}</span>
          </p>
        </div>
      </div>

      {/* 사용량 알림 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">사용량 알림</h3>
              <p className="text-sm text-gray-600">크레딧 사용량을 모니터링하고 알림을 받으세요</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <UsageAlerts />
        </div>
      </div>

      {/* 자동 충전 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">자동 충전</h3>
              <p className="text-sm text-gray-600">크레딧이 부족할 때 자동으로 충전되도록 설정하세요</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <AutoRechargeSettings />
        </div>
      </div>

      {/* 자동 삭제 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">자동 삭제</h3>
              <p className="text-sm text-gray-600">오래된 대화를 자동으로 정리하여 저장 공간을 관리하세요</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <AutoDeleteSettings />
        </div>
      </div>

      {/* 전문 분야 프로필 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
              <Award className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">전문 분야 프로필</h3>
              <p className="text-sm text-gray-600">AI의 전문 분야와 지식을 상세하게 설정하세요</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <ExpertiseProfiles />
        </div>
      </div>

      {/* 알림 설정 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                  <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"></path>
                  <path d="M12 17v-6"></path>
                  <path d="M12 9h.01"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">성공 알림 표시</h3>
                <p className="text-sm text-gray-600">작업 성공 시 알림을 표시합니다</p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleSuccessNotifications}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.showSuccessNotifications ? 'bg-blue-600' : 'bg-gray-200'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.showSuccessNotifications ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 프로필 정보 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">프로필 정보</h3>
              <p className="text-sm text-gray-600">계정의 기본 정보를 수정하세요</p>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">이름</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">이메일</Label>
              <Input
                id="email"
                type="email"
                value={email}
                placeholder="이메일을 입력하세요"
                className="w-full bg-gray-50 cursor-not-allowed"
                disabled
                readOnly
              />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
            <button
              type="submit" 
              disabled={isLoading}
              className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isLoading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>

      {/* 비밀번호 변경 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Lock className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">비밀번호 변경</h3>
              <p className="text-sm text-gray-600">계정의 비밀번호를 변경하세요</p>
            </div>
          </div>
        </div>
        <form onSubmit={handlePasswordChange}>
          <div className="px-6 py-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="current-password" className="text-sm font-medium text-gray-700">현재 비밀번호</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="현재 비밀번호를 입력하세요"
                className="w-full"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-sm font-medium text-gray-700">새 비밀번호</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호를 입력하세요"
                className="w-full"
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-700">새 비밀번호 확인</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="새 비밀번호를 다시 입력하세요"
                className="w-full"
                minLength={8}
                required
              />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
            <button
              type="submit" 
              disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
              className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isLoading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </div>
        </form>
      </div>

      {/* 계정 관리 */}
      <div className="bg-white rounded-xl border border-red-200">
        <div className="px-6 py-4 border-b border-red-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-red-700">계정 삭제</h3>
              <p className="text-sm text-red-600">
                주의: 계정 삭제 시 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            계정 삭제
          </button>
        </div>
            
        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">계정 삭제 확인</h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">
                      정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 모든 데이터가 영구적으로 삭제됩니다.
                    </p>
                  </div>
                  <div className="mt-5 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isLoading}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={isLoading}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? '처리 중...' : '계정 삭제'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
