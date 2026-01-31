'use client';

import React, { useState, useCallback, useMemo, useTransition } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Sparkles, Mail, Lock, User, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { csrfFetch } from '@/lib/csrfFetch';
import { useAuthActions } from '@/hooks/useAuthStore';
import { toast } from 'sonner';
import { safeRedirect, getBaseUrl } from '@/lib/redirect';

interface AuthProps {
  onSuccess?: () => void;
  defaultMode?: 'login' | 'signup';
}

export const Auth: React.FC<AuthProps> = ({ onSuccess, defaultMode = 'login' }) => {
  const router = useRouter();
  const { setCurrentUser, setIsAuthenticated } = useAuthActions();
  
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isPending, startTransition] = useTransition();
  const [optimisticSuccess, setOptimisticSuccess] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Optimistic UI - 즉시 성공 상태로 전환
    setOptimisticSuccess(true);
    const toastId = toast.loading(mode === 'login' ? '로그인 중...' : '회원가입 중...');

    startTransition(async () => {
      try {
        if (mode === 'login') {
          const response = await csrfFetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || '로그인에 실패했습니다.');
          }

          setCurrentUser(data.user);
          setIsAuthenticated(true);
          
          toast.success('로그인 성공!', { id: toastId });
          
          // 즉시 리다이렉트 (올바른 도메인)
          if (onSuccess) {
            onSuccess();
          } else {
            safeRedirect('/chat');
          }
        } else {
          const response = await csrfFetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || '회원가입에 실패했습니다.');
          }

          if (data.requiresEmailVerification) {
            toast.success('회원가입 성공! 이메일을 확인해주세요.', { 
              id: toastId,
              duration: 5000 
            });
            setOptimisticSuccess(false);
          } else if (data.autoLogin) {
            setCurrentUser(data.user);
            setIsAuthenticated(true);
            toast.success('로그인 성공!', { id: toastId });
            
            if (onSuccess) {
              onSuccess();
            } else {
              safeRedirect('/chat');
            }
          } else {
            toast.success('회원가입 성공! 로그인해주세요.', { 
              id: toastId,
              duration: 4000 
            });
            setMode('login');
            setOptimisticSuccess(false);
          }
        }
      } catch (err: any) {
        setOptimisticSuccess(false);
        toast.error(err.message || '오류가 발생했습니다.', {
          id: toastId,
          duration: 4000,
        });
      }
    });
  }, [mode, email, password, name, setCurrentUser, setIsAuthenticated, onSuccess, router]);

  const handleNaverLogin = useCallback(() => {
    const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;
    const baseUrl = getBaseUrl();
    const redirectUri = `${baseUrl}/api/auth/naver/callback`;
    const state = Math.random().toString(36).substring(7);
    
    toast.loading('네이버로 이동 중...');
    
    const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    
    window.location.href = naverAuthUrl;
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setOptimisticSuccess(false);
  }, [mode]);

  const isLoading = isPending || optimisticSuccess;
  
  // 입력 검증 메모이제이션
  const isFormValid = useMemo(() => {
    if (mode === 'signup') {
      return email.length > 0 && password.length >= 8 && name.length >= 2;
    }
    return email.length > 0 && password.length > 0;
  }, [mode, email, password, name]);

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
            <h2 className="text-2xl font-bold mb-2 text-center">
              {mode === 'login' ? '로그인' : '회원가입'}
            </h2>
            <p className="text-sm text-gray-500 text-center">
              {mode === 'login' ? 'AI 채팅을 시작하세요' : '새로운 계정을 만드세요'}
            </p>
          </CardHeader>

          <CardContent className="p-6">
            {optimisticSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-800 font-medium">
                  {mode === 'login' ? '로그인 처리 중...' : '회원가입 처리 중...'}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="name">이름</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="홍길동"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 transition-all"
                      required
                      disabled={isLoading}
                      autoComplete="name"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 transition-all"
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 transition-all"
                    required
                    disabled={isLoading}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                </div>
                {mode === 'signup' && (
                  <p className="text-xs text-gray-500">
                    8자 이상, 영문/숫자/특수문자 포함
                  </p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full transition-all"
                disabled={isLoading || !isFormValid}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    <span>{mode === 'login' ? '로그인 중...' : '가입 중...'}</span>
                  </span>
                ) : (
                  mode === 'login' ? '로그인' : '회원가입'
                )}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">또는</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full mt-4 bg-[#03C75A] hover:bg-[#02B350] text-white border-0 transition-all"
                onClick={handleNaverLogin}
                disabled={isLoading}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.3 10.5l-3.8-5.5H4v10h5.5v-5.5l3.8 5.5H19V5h-5.7z"/>
                </svg>
                네이버로 시작하기
              </Button>
            </div>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={toggleMode}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
                disabled={isLoading}
              >
                {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
              </button>
            </div>
          </CardContent>
        </Card>

          <p className="text-center text-sm text-gray-500 mt-6">
            로그인하면 <a href="#" className="text-primary-600 hover:underline">이용약관</a> 및{' '}
            <a href="#" className="text-primary-600 hover:underline">개인정보처리방침</a>에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </div>
    </div>
  );
};

