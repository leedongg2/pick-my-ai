'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Sparkles, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useStore } from '@/store';
import { toast } from 'sonner';

interface AuthProps {
  onSuccess?: () => void;
  defaultMode?: 'login' | 'signup';
}

export const Auth: React.FC<AuthProps> = ({ onSuccess, defaultMode = 'login' }) => {
  const [isLogin, setIsLogin] = useState(defaultMode === 'login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');

  const { login, register } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 유효성 검사
      if (!formData.email?.trim()) {
        throw new Error('이메일을 입력해주세요.');
      }
      
      if (!formData.password?.trim()) {
        throw new Error('비밀번호를 입력해주세요.');
      }

      // 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('올바른 이메일 형식이 아닙니다.');
      }

      // 회원가입 시 추가 검증
      if (!isLogin) {
        if (!formData.name?.trim()) {
          throw new Error('이름을 입력해주세요.');
        }
        
        if (formData.name.trim().length < 2) {
          throw new Error('이름은 최소 2자 이상이어야 합니다.');
        }
        
        if (formData.password.length < 8) {
          throw new Error('비밀번호는 최소 8자 이상이어야 합니다.');
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '입력값을 확인해주세요.');
      setIsLoading(false);
      return;
    }

    // reCAPTCHA 임시 비활성화

    try {
      if (isLogin) {
        // Regular user login
        const result = await login(formData.email, formData.password);
        if (result.success) {
          toast.success('로그인 성공!');
          onSuccess?.();
        } else {
          toast.error(result.message || '이메일 또는 비밀번호가 올바르지 않습니다.');
        }
      } else {
      // 회원가입
      const result = await register(formData.email, formData.password, formData.name);
      
      if (result.success) {
        // Supabase 사용 시 이메일 인증 필요
        if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
          setVerificationEmail(formData.email);
          setShowEmailVerification(true);
          toast.success('회원가입 완료! 이메일을 확인해주세요.');
        } else {
          // 로컬 모드
          toast.success('회원가입 완료! 로그인해주세요.');
          setIsLogin(true);
          setFormData({ email: formData.email, password: '', name: '' });
        }
      } else {
        // 에러 메시지 표시
        toast.error(result.error || result.message || '이미 존재하는 이메일입니다.');
      }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      toast.error('인증 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      const { AuthService } = await import('@/lib/auth');
      const result = await AuthService.resendVerificationEmail(verificationEmail);
      
      if (result.success) {
        toast.success('인증 이메일이 재전송되었습니다.');
      } else {
        toast.error(result.error || '이메일 전송 실패');
      }
    } catch (error) {
      toast.error('이메일 전송 중 오류가 발생했습니다.');
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast.error('이메일을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const { AuthService } = await import('@/lib/auth');
      const result = await AuthService.sendPasswordResetEmail(formData.email);
      
      if (result.success) {
        toast.success('비밀번호 재설정 이메일이 전송되었습니다.');
        setShowForgotPassword(false);
      } else {
        toast.error(result.error || '이메일 전송 실패');
      }
    } catch (error) {
      toast.error('이메일 전송 중 오류가 발생했습니다.');
    }
    setIsLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // 이메일 인증 대기 화면
  if (showEmailVerification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <Card variant="elevated" className="max-w-md w-full shadow-2xl border-2 border-white/50">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-4">이메일 인증 필요</h2>
            <p className="text-gray-600 mb-2">
              <span className="font-semibold">{verificationEmail}</span>로
            </p>
            <p className="text-gray-600 mb-6">
              인증 이메일을 보냈습니다. 이메일을 확인하고 인증 링크를 클릭해주세요.
            </p>
            
            <div className="space-y-3">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleResendVerification}
              >
                인증 이메일 재전송
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => {
                  setShowEmailVerification(false);
                  setIsLogin(true);
                  setFormData({ email: '', password: '', name: '' });
                }}
              >
                로그인 페이지로 돌아가기
              </Button>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100 text-left">
              <p className="text-xs text-blue-800 font-semibold mb-2">참고사항</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• 스팸함도 확인해주세요</li>
                <li>• 인증 링크는 24시간 동안 유효합니다</li>
                <li>• 인증 후 로그인할 수 있습니다</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-pink-50 relative">
      {/* 상단 로고 */}
      <div className="absolute top-6 left-6 z-10">
        <a 
          href="/" 
          className="flex items-center space-x-3 hover:opacity-90 transition-all group"
        >
          <div className="w-11 h-11 bg-gradient-to-br from-primary-500 via-primary-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all group-hover:scale-105">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-gray-900 tracking-tight">Pick-My-AI</span>
            <span className="text-xs text-gray-500 font-medium">AI 선택 플랫폼</span>
          </div>
        </a>
      </div>
      
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          {/* 중앙 로고 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 via-primary-600 to-purple-600 rounded-2xl shadow-xl mb-4">
              <Sparkles className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Pick-My-AI</h1>
            <p className="text-gray-600">AI, 내가 고르고 내가 정한다</p>
          </div>

        <Card variant="elevated" className="shadow-2xl border-2 border-white/50">
          <CardHeader>
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">
                {isLogin ? '로그인' : '회원가입'}
              </h2>
              <p className="text-sm text-gray-600">
                {isLogin
                  ? 'AI 모델을 선택하고 사용하세요'
                  : '지금 가입하고 AI를 경험하세요'}
              </p>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    이름
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="홍길동"
                      autoComplete="name"
                      required
                      className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  이메일
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="example@email.com"
                    autoComplete="email"
                    required
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  비밀번호
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    minLength={isLogin ? undefined : 8}
                    required
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full shadow-lg"
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLogin ? '로그인' : '회원가입'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </form>

            <div className="mt-6 text-center space-y-3">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setFormData({ email: '', password: '', name: '' });
                }}
                className="text-sm text-primary-600 hover:text-primary-700 font-semibold block w-full"
                disabled={isLoading}
              >
                {isLogin
                  ? '계정이 없으신가요? 회원가입'
                  : '이미 계정이 있으신가요? 로그인'}
              </button>
              
              {isLogin && process.env.NEXT_PUBLIC_SUPABASE_URL && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                  disabled={isLoading}
                >
                  비밀번호를 잊으셨나요?
                </button>
              )}
            </div>

            
          </CardContent>
        </Card>

          <p className="text-center text-sm text-gray-500 mt-6">
            가입하면 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
          </p>
        </div>
      </div>
    </div>
  );
};

