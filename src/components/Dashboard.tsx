'use client';

import React, { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  CreditCard, 
  TrendingUp, 
  Package, 
  MessageSquare,
  AlertCircle,
  Plus,
  BarChart3,
  Sparkles,
  Gift,
  X,
  Coins
} from 'lucide-react';
import dynamic from 'next/dynamic';

// 동적 임포트
const CreditGift = dynamic(() => import('@/components/CreditGift').then(mod => ({ default: mod.CreditGift })), { ssr: false });
import { formatWon, getFixedDisplayPriceOrFallback } from '@/utils/pricing';
import { cn } from '@/utils/cn';

export const Dashboard: React.FC = () => {
  const router = useRouter();
  const { models, wallet, chatSessions, getAvailablePMC, pmcBalance } = useStore();
  const [showGiftModal, setShowGiftModal] = React.useState(false);
  
  // PMC 잔액
  const availablePMC = getAvailablePMC();
  
  // 크레딧 통계 계산
  const creditStats = useMemo(() => {
    if (!wallet) return { total: 0, used: 0, remaining: 0, models: [] };
    
    const modelStats = models
      .filter(m => m.enabled)
      .map(model => {
        const credits = wallet.credits[model.id] || 0;
        const used = wallet.transactions.filter(
          t => t.type === 'usage' && t.modelId === model.id
        ).length;
        const total = credits + used;
        
        return {
          model,
          total,
          used,
          remaining: credits,
          usageRate: total > 0 ? (used / total) * 100 : 0,
        };
      })
      .filter(stat => stat.total > 0)
      .sort((a, b) => b.remaining - a.remaining);
    
    const totalCredits = modelStats.reduce((sum, stat) => sum + stat.total, 0);
    const usedCredits = modelStats.reduce((sum, stat) => sum + stat.used, 0);
    const remainingCredits = modelStats.reduce((sum, stat) => sum + stat.remaining, 0);
    
    return {
      total: totalCredits,
      used: usedCredits,
      remaining: remainingCredits,
      models: modelStats,
    };
  }, [models, wallet]);
  
  // 최근 거래 내역
  const recentTransactions = useMemo(() => {
    if (!wallet) return [];
    return [...wallet.transactions]
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA;
      })
      .slice(0, 5);
  }, [wallet]);
  
  const handleRefill = useCallback(() => {
    router.push('/configurator');
  }, [router]);
  
  const handleStartChat = useCallback(() => {
    router.push('/chat');
  }, [router]);
  
  const getUsageColor = useCallback((rate: number) => {
    if (rate >= 80) return 'text-red-600 bg-red-100';
    if (rate >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  }, []);
  
  const getProgressColor = useCallback((rate: number) => {
    if (rate >= 80) return 'bg-red-500';
    if (rate >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  }, []);

  const handleShowGiftModal = useCallback(() => {
    setShowGiftModal(true);
  }, []);

  const handleCloseGiftModal = useCallback(() => {
    setShowGiftModal(false);
  }, []);
  
  if (!wallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center particles-bg">
        <Card variant="bordered" className="max-w-md w-full glass-card shadow-soft-lg animate-scale-in">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-100 to-purple-100 flex items-center justify-center">
              <Package className="w-8 h-8 text-primary-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">크레딧이 없습니다</h2>
            <p className="text-gray-600 mb-4">
              AI 모델을 사용하려면 먼저 크레딧을 구매해주세요.
            </p>
            <Button variant="primary" onClick={handleRefill}>
              <Plus className="w-4 h-4 mr-2" />
              크레딧 구매하기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 헤더 */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-1">대시보드</h1>
            <p className="text-gray-600 text-sm">크레딧 사용 현황을 확인하세요</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleStartChat}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              채팅 시작
            </button>
            <button
              onClick={handleRefill}
              className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              크레딧 충전
            </button>
          </div>
        </div>
        
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-8">
          {/* PMC 잔액 카드 */}
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Coins className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
            <p className="text-2xl font-bold mb-1 text-yellow-700">{availablePMC.toLocaleString()}</p>
            <p className="text-sm text-yellow-600 font-medium">보유 PMC</p>
            <p className="text-xs text-yellow-500 mt-1">1 PMC = 1원</p>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-semibold mb-1 text-gray-900">{creditStats.total}</p>
            <p className="text-sm text-gray-600">총 크레딧</p>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900 mb-1">{creditStats.used}</p>
            <p className="text-sm text-gray-600">사용한 크레딧</p>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900 mb-1">{creditStats.remaining}</p>
            <p className="text-sm text-gray-600">남은 크레딧</p>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900 mb-1">{chatSessions.length}</p>
            <p className="text-sm text-gray-600">총 대화 수</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 모델별 크레딧 현황 */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-900">모델별 크레딧 현황</h2>
                <BarChart3 className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                {creditStats.models.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">구매한 크레딧이 없습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {creditStats.models.map(stat => (
                      <div key={stat.model.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-medium text-gray-900">{stat.model.displayName}</h4>
                            <span className="text-xs text-gray-500">
                              {formatWon(getFixedDisplayPriceOrFallback(stat.model.id, stat.model.piWon).price)}/회
                            </span>
                          </div>
                          <span className="text-sm text-gray-600">
                            {stat.remaining} / {stat.total}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className={cn('h-1.5 rounded-full transition-all', getProgressColor(stat.usageRate))}
                            style={{ width: `${stat.usageRate}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {creditStats.remaining < 10 && creditStats.remaining > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg flex items-start space-x-2 border border-yellow-200">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-900">
                        크레딧이 얼마 남지 않았습니다
                      </p>
                      <p className="text-yellow-700 text-xs mt-0.5">
                        원활한 서비스 이용을 위해 충전을 권장합니다.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* 최근 거래 내역 */}
          <div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-5">최근 활동</h2>
              <div>
                {recentTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">거래 내역이 없습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentTransactions.map(transaction => {
                      const model = transaction.modelId 
                        ? models.find(m => m.id === transaction.modelId)
                        : null;
                      
                      return (
                        <div
                          key={transaction.id}
                          className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                            transaction.type === 'purchase' 
                              ? 'bg-green-100' 
                              : 'bg-blue-100'
                          )}>
                            {transaction.type === 'purchase' ? (
                              <CreditCard className="w-4 h-4 text-green-600" />
                            ) : (
                              <MessageSquare className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {transaction.type === 'purchase' ? '크레딧 구매' : '크레딧 사용'}
                            </p>
                            {model && (
                              <p className="text-xs text-gray-600">
                                {model.displayName}
                              </p>
                            )}
                            {transaction.credits && (
                              <p className="text-xs text-gray-500 truncate">
                                {Object.entries(transaction.credits)
                                  .map(([id, amount]) => {
                                    const m = models.find(model => model.id === id);
                                    return m ? `${m.displayName}: ${amount}회` : '';
                                  })
                                  .filter(Boolean)
                                  .join(', ')
                                }
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(transaction.timestamp).toLocaleString('ko-KR', { 
                                month: 'short', 
                                day: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 크레딧 선물 모달 */}
      {showGiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowGiftModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">크레딧 선물</h2>
              <button onClick={handleCloseGiftModal} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <CreditGift />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
