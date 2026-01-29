'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Sparkles, MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AuthProps {
  onSuccess?: () => void;
  defaultMode?: 'login' | 'signup';
}

export const Auth: React.FC<AuthProps> = ({ onSuccess, defaultMode = 'login' }) => {
  const router = useRouter();

  const handleGoToChat = () => {
    router.push('/chat');
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
            <h2 className="text-2xl font-bold mb-2 text-center">
              로그인 기능 임시 비활성화
            </h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              지금은 바로 AI 채팅을 이용해보세요!
            </p>
          </CardHeader>

          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-blue-600" />
              </div>
              
              <p className="text-gray-600 mb-6">
                회원가입/로그인 기능은 현재 점검 중입니다.<br />
                바로 AI와 대화를 시작해보세요!
              </p>
              
              <Button
                variant="primary"
                size="lg"
                className="w-full shadow-lg"
                onClick={handleGoToChat}
              >
                AI 채팅 시작하기
                <MessageCircle className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

          <p className="text-center text-sm text-gray-500 mt-6">
            로그인 기능은 곧 다시 활성화될 예정입니다.
          </p>
        </div>
      </div>
    </div>
  );
};

