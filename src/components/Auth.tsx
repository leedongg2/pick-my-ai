'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getBaseUrl } from '@/lib/redirect';
import { useStore } from '@/store';

interface AuthProps {
  onSuccess?: () => void;
  defaultMode?: 'login' | 'signup';
}

export const Auth: React.FC<AuthProps> = ({ onSuccess, defaultMode = 'login' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const language = useStore((s) => s.language);

  const ui = language === 'en'
    ? {
        agreeRequired: 'Please agree to the Terms and Privacy Policy.',
        loginFailed: 'Login failed.',
        error: 'An error occurred.',
        brand: 'AI selection platform',
        subtitle: 'AI, you choose it your way',
        title: 'Login / Sign up',
        desc: 'Get started easily with your social account',
        loading: 'Signing in...',
        continueGoogle: 'Continue with Google',
        agreeText1: 'I agree to the ',
        terms: 'Terms of Service',
        and: ' and ',
        privacy: 'Privacy Policy',
        agreeText2: '.',
        agreeHint: 'You need to agree before using the service.',
      }
    : language === 'ja'
    ? {
        agreeRequired: '利用規約とプライバシーポリシーに同意してください。',
        loginFailed: 'ログインに失敗しました。',
        error: 'エラーが発生しました。',
        brand: 'AI選択プラットフォーム',
        subtitle: 'AI、選ぶのはあなた',
        title: 'ログイン / 会員登録',
        desc: 'ソーシャルアカウントですぐに始められます',
        loading: 'ログイン中...',
        continueGoogle: 'Googleで続ける',
        agreeText1: '',
        terms: '利用規約',
        and: ' と ',
        privacy: 'プライバシーポリシー',
        agreeText2: 'に同意します。',
        agreeHint: 'サービス利用のため、規約への同意が必要です。',
      }
    : {
        agreeRequired: '이용약관 및 개인정보처리방침에 동의해주세요.',
        loginFailed: '로그인에 실패했습니다.',
        error: '오류가 발생했습니다.',
        brand: 'AI 선택 플랫폼',
        subtitle: 'AI, 내가 고르고 내가 정한다',
        title: '로그인 / 회원가입',
        desc: '소셜 계정으로 간편하게 시작하세요',
        loading: '로그인 중...',
        continueGoogle: 'Google로 계속하기',
        agreeText1: '',
        terms: '이용약관',
        and: ' 및 ',
        privacy: '개인정보처리방침',
        agreeText2: '에 동의합니다.',
        agreeHint: '서비스 이용을 위해 약관에 동의해주세요.',
      };

  const handleGoogleLogin = useCallback(async () => {
    if (!agreedToTerms) {
      toast.error(ui.agreeRequired);
      return;
    }

    setIsLoading(true);

    try {
      const redirectUrl = getBaseUrl();

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${redirectUrl}/auth/callback`,
        },
      });

      if (error) {
        toast.error(error.message || ui.loginFailed);
        setIsLoading(false);
      }
    } catch (err: any) {
      toast.error(err.message || ui.error);
      setIsLoading(false);
    }
  }, [agreedToTerms, ui.agreeRequired, ui.error, ui.loginFailed]);

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
            <span className="text-xs text-gray-500 font-medium">{ui.brand}</span>
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
            <p className="text-gray-600">{ui.subtitle}</p>
          </div>

        <Card variant="elevated" className="shadow-2xl border-2 border-white/50">
          <CardHeader>
            <h2 className="text-2xl font-bold mb-2 text-center">
              {ui.title}
            </h2>
            <p className="text-sm text-gray-500 text-center">
              {ui.desc}
            </p>
          </CardHeader>

          <CardContent className="p-6">
            {/* 구글 로그인 버튼 */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full flex items-center justify-center space-x-3 border-gray-300 hover:bg-gray-50 transition-all py-3"
              onClick={handleGoogleLogin}
              disabled={isLoading || !agreedToTerms}
            >
              {isLoading ? (
                <span className="flex items-center justify-center space-x-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-transparent"></span>
                  <span className="text-gray-700">{ui.loading}</span>
                </span>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span className="text-gray-700 font-medium">{ui.continueGoogle}</span>
                </>
              )}
            </Button>

            {/* 이용약관 동의 체크박스 */}
            <div className="mt-6">
              <label className="flex items-start space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                <span className="text-sm text-gray-600 leading-relaxed">
                  {ui.agreeText1}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {ui.terms}
                  </a>
                  {ui.and}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {ui.privacy}
                  </a>
                  {ui.agreeText2}
                </span>
              </label>
              {!agreedToTerms && (
                <p className="mt-2 text-xs text-gray-400 ml-7">
                  {ui.agreeHint}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
};

