'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store';
import { Card, CardContent } from '@/components/ui/Card';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthCallbackPage() {
  const router = useRouter();

  const handleEmailVerification = async () => {
    try {
      // 세션 확인
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Session error:', error);
        router.push('/login?error=verification_failed');
        return;
      }

      if (session) {
        // 인증 성공
        setTimeout(() => {
          router.push('/login?verified=true');
        }, 2000);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Verification error:', error);
      router.push('/login?error=verification_failed');
    }
  };

  const handleSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        router.push('/login?error=session_failed');
        return;
      }

      if (session?.user) {
        // 사용자 정보 가져오기 또는 생성
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (userError || !userData) {
          // 소셜 로그인 첫 사용 시 users 테이블에 사용자 정보 생성
          const userName = session.user.user_metadata?.full_name || 
                          session.user.user_metadata?.name || 
                          session.user.email?.split('@')[0] || 
                          'User';

          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
              id: session.user.id,
              email: session.user.email!,
              name: userName,
            })
            .select()
            .single();

          if (insertError) {
            console.error('사용자 정보 생성 실패:', insertError);
          } else {
            // 지갑도 생성
            await supabase
              .from('user_wallets')
              .insert({
                user_id: session.user.id,
                credits: {},
              });
          }

          // Zustand store 업데이트
          if (newUser) {
            useStore.setState({
              currentUser: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                createdAt: new Date(newUser.created_at),
              },
              isAuthenticated: true,
            });
            
            // 지갑 초기화
            useStore.getState().initWallet(newUser.id);
          }
        } else {
          // 기존 사용자 - Zustand store 업데이트
          useStore.setState({
            currentUser: {
              id: userData.id,
              email: userData.email,
              name: userData.name,
              createdAt: new Date(userData.created_at),
            },
            isAuthenticated: true,
          });
          
          // 지갑 로드
          try {
            const walletResponse = await fetch('/api/wallet', {
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            });
            
            if (walletResponse.ok) {
              const { wallet } = await walletResponse.json();
              useStore.setState({
                wallet: {
                  userId: userData.id,
                  credits: wallet.credits || {},
                  transactions: []
                }
              });
            } else {
              useStore.getState().initWallet(userData.id);
            }
          } catch (error) {
            console.error('지갑 로드 실패:', error);
            useStore.getState().initWallet(userData.id);
          }
        }

        toast.success('로그인 성공!');
        router.push('/chat');
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Session handling error:', error);
      router.push('/login?error=session_failed');
    }
  };

  useEffect(() => {
    // URL 해시에서 토큰 확인
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    if (type === 'signup' || type === 'email') {
      // 이메일 인증 완료
      handleEmailVerification();
    } else if (accessToken) {
      // 세션 확인
      handleSession();
    } else {
      // 에러 처리
      router.push('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <Card variant="elevated" className="max-w-md w-full shadow-2xl">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Sparkles className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold mb-4">인증 처리 중...</h2>
          <p className="text-gray-600">
            잠시만 기다려주세요.
          </p>
          <div className="mt-6 flex justify-center space-x-2">
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce animate-delay-100"></div>
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce animate-delay-200"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

