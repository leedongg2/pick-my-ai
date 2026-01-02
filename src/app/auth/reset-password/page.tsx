'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Sparkles, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);

  // URL에서 토큰을 확인하고 세션 설정
  useEffect(() => {
    const checkSession = async () => {
      // URL 해시에서 access_token 확인
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        // 토큰으로 세션 설정
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error('세션 설정 오류:', error);
          toast.error('유효하지 않은 비밀번호 재설정 링크입니다.');
          setTimeout(() => router.push('/login'), 2000);
        } else {
          setIsValidSession(true);
        }
      } else {
        // 세션이 이미 있는지 확인
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsValidSession(true);
        } else {
          toast.error('비밀번호 재설정 링크가 필요합니다.');
          setTimeout(() => router.push('/login'), 2000);
        }
      }
    };

    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidSession) {
      toast.error('유효한 세션이 없습니다. 비밀번호 재설정 링크를 다시 요청해주세요.');
      return;
    }

    if (password.length < 6) {
      toast.error('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);

    try {
      // Supabase를 직접 사용하여 비밀번호 업데이트
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error('비밀번호 변경 오류:', error);
        toast.error(error.message || '비밀번호 변경 실패');
      } else {
        toast.success('비밀번호가 성공적으로 변경되었습니다!');
        
        // 세션 종료 후 로그인 페이지로
        await supabase.auth.signOut();
        
        setTimeout(() => {
          router.push('/login?message=password_changed');
        }, 1500);
      }
    } catch (error: any) {
      console.error('예외 발생:', error);
      toast.error('비밀번호 변경 중 오류가 발생했습니다.');
    }

    setIsLoading(false);
  };

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
              <h2 className="text-2xl font-bold mb-2">비밀번호 재설정</h2>
              <p className="text-sm text-gray-600">
                새로운 비밀번호를 입력해주세요
              </p>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  새 비밀번호
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    disabled={isLoading}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">최소 6자 이상</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  비밀번호 확인
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    disabled={isLoading}
                    required
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
                비밀번호 변경
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-sm text-gray-500 hover:text-gray-700"
                disabled={isLoading}
              >
                로그인 페이지로 돌아가기
              </button>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}

