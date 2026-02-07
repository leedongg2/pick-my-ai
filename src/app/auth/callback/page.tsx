'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store';
import { Card, CardContent } from '@/components/ui/Card';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { safeRedirect, redirectToLogin, redirectToChat } from '@/lib/redirect';

export default function AuthCallbackPage() {
  const router = useRouter();

  const handleEmailVerification = async () => {
    try {
      // 세션 확인
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Session error:', error);
        redirectToLogin('verification_failed');
        return;
      }

      if (session) {
        // 인증 성공
        setTimeout(() => {
          safeRedirect('/login?verified=true');
        }, 2000);
      } else {
        redirectToLogin();
      }
    } catch (error) {
      console.error('Verification error:', error);
      redirectToLogin('verification_failed');
    }
  };

  const handleSession = async () => {
    try {
      // 잠시 대기하여 토큰이 설정될 시간을 확보
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Session error:', error);
        redirectToLogin('session_failed');
        return;
      }

      if (session?.user) {
        console.log('Session found for user:', session.user.email);
        // 사용자 정보 가져오기 또는 생성
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (userError || !userData) {
          console.log('Creating new user for:', session.user.email);
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
            toast.error('사용자 정보 생성에 실패했습니다.');
            redirectToLogin('user_creation_failed');
            return;
          } else {
            console.log('User created successfully:', newUser);
            // 지갑도 생성
            const { error: walletError } = await supabase
              .from('user_wallets')
              .insert({
                user_id: session.user.id,
                credits: {},
              });
              
            if (walletError) {
              console.error('지갑 생성 실패:', walletError);
            } else {
              console.log('Wallet created successfully');
            }
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
        redirectToChat();
      } else {
        console.log('No session found, redirecting to login');
        redirectToLogin('no_session');
      }
    } catch (error) {
      console.error('Session handling error:', error);
      toast.error('로그인 처리 중 오류가 발생했습니다.');
      redirectToLogin('session_failed');
    }
  };

  useEffect(() => {
    console.log('Auth callback page loaded');
    console.log('Current URL:', window.location.href);
    
    // URL 해시에서 토큰 확인
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    
    console.log('Hash params:', { accessToken: !!accessToken, type });

    if (type === 'signup' || type === 'email') {
      // 이메일 인증 완료
      console.log('Handling email verification');
      handleEmailVerification();
    } else if (accessToken) {
      // 세션 확인
      console.log('Handling OAuth callback');
      handleSession();
    } else {
      // 에러 처리
      console.log('No access token or type found, redirecting to login');
      redirectToLogin('no_token');
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

