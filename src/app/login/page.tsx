'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // 로그인 기능 임시 비활성화 - 채팅 페이지로 리다이렉트
    router.replace('/chat');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
          <div className="w-8 h-8 bg-primary-600 rounded-full animate-bounce"></div>
        </div>
        <h2 className="text-2xl font-bold mb-4">채팅으로 이동 중...</h2>
        <p className="text-gray-600">
          잠시만 기다려주세요.
        </p>
      </div>
    </div>
  );
}

