'use client';

import { Auth } from '@/components/Auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/store';
import { useEffect } from 'react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useStore();
  const mode = searchParams.get('mode') as 'login' | 'signup' | null;
  const verified = searchParams.get('verified');
  const error = searchParams.get('error');
  const message = searchParams.get('message');

  useEffect(() => {
    if (isAuthenticated) {
      // 이미 로그인된 상태면 대시보드로 리디렉션
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    // URL 파라미터에 따른 토스트 메시지
    if (verified === 'true') {
      toast.success('이메일 인증이 완료되었습니다! 이제 로그인할 수 있습니다.');
    }
    if (error === 'verification_failed') {
      toast.error('이메일 인증에 실패했습니다. 다시 시도해주세요.');
    }
    if (error === 'session_failed') {
      toast.error('세션 처리에 실패했습니다. 다시 시도해주세요.');
    }
    if (message === 'password_changed') {
      toast.success('비밀번호가 변경되었습니다! 새 비밀번호로 로그인해주세요.');
    }
  }, [verified, error, message]);

  const handleSuccess = () => {
    // 로그인 성공 시 채팅 페이지로 리디렉션
    router.push('/chat');
  };

  return <Auth onSuccess={handleSuccess} defaultMode={mode || 'login'} />;
}

