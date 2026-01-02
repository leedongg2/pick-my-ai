'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// 최적화된 로딩 스켈레톤
const ChatLoadingSkeleton = () => (
  <div className="flex h-screen">
    <div className="w-64 bg-gray-50 border-r border-gray-200 animate-pulse">
      <div className="p-4 space-y-3">
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-gray-200 rounded"></div>)}
        </div>
      </div>
    </div>
    <div className="flex-1 flex flex-col">
      <div className="flex-1 p-4 space-y-4 animate-pulse">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded"></div>)}
      </div>
      <div className="border-t p-4 animate-pulse">
        <div className="h-12 bg-gray-100 rounded"></div>
      </div>
    </div>
  </div>
);

const Chat = dynamic(() => import('@/components/Chat').then(mod => ({ default: mod.Chat })), {
  loading: () => <ChatLoadingSkeleton />,
  ssr: false,
});

export default function ChatPage() {
  useEffect(() => {
    // Chat 페이지에서만 스크롤 방지
    document.body.classList.add('chat-page');
    return () => {
      document.body.classList.remove('chat-page');
    };
  }, []);

  return <Chat />;
}

