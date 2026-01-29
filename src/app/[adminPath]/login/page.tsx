'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Shield, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function SecretAdminLoginPage() {
  const router = useRouter();
  const params = useParams();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  // 비밀 경로 확인
  const secretPath = process.env.NEXT_PUBLIC_ADMIN_SECRET_PATH;
  const adminPath = params.adminPath as string;

  useEffect(() => {
    if (!secretPath || adminPath !== secretPath) {
      router.replace('/404');
    }
  }, [adminPath, secretPath, router]);

  // 잠금 타이머
  useEffect(() => {
    if (!lockedUntil) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = lockedUntil - now;

      if (diff <= 0) {
        setLockedUntil(null);
        setRemainingAttempts(null);
        setTimeLeft('');
      } else {
        const minutes = Math.floor(diff / 1000 / 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${minutes}분 ${seconds}초`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockedUntil]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast.error('비밀번호를 입력해주세요.');
      return;
    }

    if (lockedUntil && Date.now() < lockedUntil) {
      toast.error(`계정이 잠겨 있습니다. ${timeLeft} 후에 다시 시도해주세요.`);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // 로그인 성공
        localStorage.setItem('adminAuthenticated', 'true');
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminTokenExpiry', String(Date.now() + data.expiresIn));
        
        toast.success('관리자 로그인 성공!');
        router.push(`/${adminPath}`);
      } else {
        // 로그인 실패
        if (data.locked) {
          setLockedUntil(data.lockedUntil);
          toast.error(data.error);
        } else {
          setRemainingAttempts(data.remainingAttempts || null);
          toast.error(data.error);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('로그인 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
      setPassword('');
    }
  };

  if (!secretPath || adminPath !== secretPath) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <Card variant="elevated" className="max-w-md w-full shadow-2xl border-2 border-gray-700 bg-gray-800">
        <CardHeader className="border-b border-gray-700">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-white">관리자 인증</h2>
          <p className="text-sm text-gray-400 text-center mt-2">
            최고 권한 접근 - 비밀번호를 입력하세요
          </p>
        </CardHeader>

        <CardContent className="p-6">
          {lockedUntil && Date.now() < lockedUntil ? (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">계정이 잠겼습니다</h3>
                <p className="text-gray-300 mb-4">
                  너무 많은 로그인 시도로 인해 일시적으로 접근이 차단되었습니다.
                </p>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center justify-center space-x-2 text-red-400">
                    <Clock className="w-5 h-5" />
                    <span className="text-xl font-mono font-bold">{timeLeft}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 text-center">후에 다시 시도할 수 있습니다</p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  관리자 비밀번호
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-white placeholder-gray-400"
                  placeholder="••••••••"
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              {remainingAttempts !== null && (
                <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-yellow-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      남은 시도: {remainingAttempts}회
                    </span>
                  </div>
                  <p className="text-xs text-yellow-300 mt-1">
                    5회 실패 시 30분간 접근이 차단됩니다.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
                disabled={isLoading}
                isLoading={isLoading}
              >
                로그인
              </Button>

              <div className="text-center">
                <p className="text-xs text-gray-500">
                  이 페이지는 최고 보안 수준으로 보호됩니다
                </p>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* 보안 정보 */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <p className="text-xs text-gray-600">
          🔒 256-bit Encrypted Path • IP-based Rate Limiting • Session Token Authentication
        </p>
      </div>
    </div>
  );
}
