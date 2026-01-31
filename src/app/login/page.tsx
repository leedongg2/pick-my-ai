'use client';

import dynamic from 'next/dynamic';
import { Sparkles } from 'lucide-react';

const Auth = dynamic(() => import('@/components/Auth').then(mod => ({ default: mod.Auth })), {
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-pink-50 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4 animate-in fade-in duration-500">
        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 via-primary-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl animate-pulse">
          <Sparkles className="w-9 h-9 text-white" />
        </div>
        <p className="text-sm text-gray-500">로딩 중...</p>
      </div>
    </div>
  ),
  ssr: true,
});

export default function LoginPage() {
  return <Auth />;
}

