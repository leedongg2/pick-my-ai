'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sparkles, User as UserIcon, LogOut, Vote } from 'lucide-react';
import { useStore } from '@/store';
import { Button } from './ui/Button';
import { PollModal } from './PollModal';

export const Header = React.memo(() => {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, currentUser, logout, activePolls } = useStore();
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  
  // 사용자가 투표하지 않은 투표 개수 계산
  const unvotedPollsCount = useMemo(() => {
    if (!currentUser) return 0;
    return activePolls.filter(poll => 
      !poll.votes.some(v => v.userId === currentUser.id)
    ).length;
  }, [activePolls, currentUser]);
  
  // 홈 페이지와 로그인 페이지에서만 헤더를 표시하지 않음
  const shouldHideHeader = useMemo(() => {
    return pathname === '/' || pathname === '/login';
  }, [pathname]);
  
  const handleLogout = useCallback(() => {
    logout();
    router.push('/');
  }, [logout, router]);
  
  if (shouldHideHeader) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link 
            href="/" 
            className="flex items-center space-x-2 hover:opacity-90 transition-all"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">Pick-My-AI</span>
          </Link>
          
          <div className="flex items-center space-x-1">
            {isAuthenticated && currentUser ? (
              <>
                <Link 
                  href="/chat"
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    pathname === '/chat' 
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium' 
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  채팅
                </Link>
                <Link 
                  href="/configurator"
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    pathname === '/configurator' 
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium' 
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  AI 모델 구매
                </Link>
                <Link 
                  href="/dashboard"
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    pathname === '/dashboard' 
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium' 
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  대시보드
                </Link>
                <Link 
                  href="/docs"
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    pathname === '/docs' 
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium' 
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  가이드
                </Link>
                <Link 
                  href="/feedback"
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    pathname === '/feedback' 
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium' 
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  의견 보내기
                </Link>
                <button
                  onClick={() => setIsPollModalOpen(true)}
                  className="px-3 py-2 rounded-lg text-sm transition-colors text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 relative"
                >
                  <Vote className="w-4 h-4" />
                  투표
                  {unvotedPollsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {unvotedPollsCount}
                    </span>
                  )}
                </button>
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2"></div>
                <Link 
                  href="/settings"
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title={currentUser.name}
                >
                  <UserIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </Link>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleLogout}
                  className="text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors p-2"
                  title="로그아웃"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </>
            ) : (
              // TEMP_DISABLED_START - 임시로 로그인/회원가입 버튼 숨김 (복구 시 주석 해제)
              // <>
              //   <Link 
              //     href="/login"
              //     className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
              //   >
              //     로그인
              //   </Link>
              //   <Link 
              //     href="/login"
              //     className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
              //   >
              //     회원가입
              //   </Link>
              // </>
              // TEMP_DISABLED_END
              <></>
            )}
          </div>
        </div>
      </div>
      <PollModal isOpen={isPollModalOpen} onClose={() => setIsPollModalOpen(false)} />
    </header>
  );
});

Header.displayName = 'Header';
