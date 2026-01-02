'use client';

import React, { useState } from 'react';
import { useStore } from '@/store';
import { toast } from 'sonner';
import { 
  CreditCard, RefreshCw, Settings, Shield, 
  TrendingUp, DollarSign, Calendar, AlertTriangle,
  Check, X, Info
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatWon } from '@/utils/pricing';

const presetAmounts = [10000, 30000, 50000, 100000, 200000];
const thresholdOptions = [5, 10, 20, 50, 100];

export const AutoRechargeSettings: React.FC = () => {
  const {
    autoRecharge,
    setAutoRecharge,
    triggerAutoRecharge,
    wallet,
  } = useStore();

  const [testMode, setTestMode] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [customThreshold, setCustomThreshold] = useState('');

  // 자동 충전 활성화/비활성화
  const handleToggleAutoRecharge = () => {
    setAutoRecharge({ enabled: !autoRecharge.enabled });
    toast.success(
      autoRecharge.enabled ? '자동 충전이 비활성화되었습니다.' : '자동 충전이 활성화되었습니다.'
    );
  };

  // 충전 금액 설정
  const handleSetAmount = (amount: number) => {
    setAutoRecharge({ amount });
    toast.success(`충전 금액이 ${formatWon(amount)}로 설정되었습니다.`);
  };

  // 임계값 설정
  const handleSetThreshold = (threshold: number) => {
    setAutoRecharge({ threshold });
    toast.success(`임계값이 ${threshold}로 설정되었습니다.`);
  };

  // 월 한도 설정
  const handleSetMonthlyLimit = (limit: number) => {
    setAutoRecharge({ maxMonthlyAmount: limit });
    toast.success(`월 한도가 ${formatWon(limit)}로 설정되었습니다.`);
  };

  // 테스트 충전
  const handleTestRecharge = async () => {
    setTestMode(true);
    const result = await triggerAutoRecharge();
    
    if (result) {
      toast.success('테스트 충전이 성공했습니다!');
    } else {
      toast.error('테스트 충전 조건을 만족하지 않습니다.');
    }
    setTestMode(false);
  };

  // 현재 총 크레딧 계산
  const totalCredits = Object.values(wallet?.credits || {}).reduce((sum, c) => sum + c, 0);

  // 월 사용률 계산
  const monthlyUsagePercent = (autoRecharge.monthlyUsage / autoRecharge.maxMonthlyAmount) * 100;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">자동 충전 설정</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          크레딧이 부족할 때 자동으로 충전되도록 설정하세요.
        </p>
      </div>

      {/* 현재 상태 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-lg mb-1">자동 충전</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              크레딧이 설정한 임계값 이하로 떨어지면 자동으로 충전됩니다.
            </p>
          </div>
          <button
            onClick={handleToggleAutoRecharge}
            className={cn(
              'relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-4',
              autoRecharge.enabled
                ? 'bg-green-600 focus:ring-green-300 dark:focus:ring-green-800'
                : 'bg-gray-200 dark:bg-gray-700 focus:ring-gray-300 dark:focus:ring-gray-600'
            )}
          >
            <span
              className={cn(
                'inline-block h-6 w-6 transform rounded-full bg-white transition-transform',
                autoRecharge.enabled ? 'translate-x-7' : 'translate-x-1'
              )}
            />
          </button>
        </div>

        {/* 상태 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">현재 크레딧</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {totalCredits}
            </div>
            {totalCredits <= autoRecharge.threshold && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                임계값 이하
              </p>
            )}
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">이번 달 사용</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatWon(autoRecharge.monthlyUsage)}
            </div>
            <div className="mt-2">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all',
                    monthlyUsagePercent > 80 ? 'bg-red-500' :
                    monthlyUsagePercent > 50 ? 'bg-yellow-500' : 'bg-green-500'
                  )}
                  style={{ width: `${Math.min(monthlyUsagePercent, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">마지막 충전</span>
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {autoRecharge.lastRecharge 
                ? new Date(autoRecharge.lastRecharge).toLocaleDateString()
                : '없음'
              }
            </div>
          </div>
        </div>
      </div>

      {/* 충전 설정 */}
      {autoRecharge.enabled && (
        <>
          {/* 충전 금액 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold mb-4">충전 금액</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              자동 충전 시 충전할 금액을 선택하세요.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              {presetAmounts.map(amount => (
                <button
                  key={amount}
                  onClick={() => handleSetAmount(amount)}
                  className={cn(
                    'p-3 rounded-lg border-2 transition-all font-medium',
                    autoRecharge.amount === amount
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                  )}
                >
                  {formatWon(amount)}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="직접 입력"
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-900"
              />
              <button
                onClick={() => {
                  const amount = Number(customAmount);
                  if (amount > 0) {
                    handleSetAmount(amount);
                    setCustomAmount('');
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                설정
              </button>
            </div>
          </div>

          {/* 임계값 설정 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold mb-4">충전 임계값</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              총 크레딧이 이 수치 이하로 떨어지면 자동 충전이 실행됩니다.
            </p>
            
            <div className="grid grid-cols-5 gap-3 mb-4">
              {thresholdOptions.map(threshold => (
                <button
                  key={threshold}
                  onClick={() => handleSetThreshold(threshold)}
                  className={cn(
                    'p-3 rounded-lg border-2 transition-all font-medium',
                    autoRecharge.threshold === threshold
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                  )}
                >
                  {threshold}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                value={customThreshold}
                onChange={(e) => setCustomThreshold(e.target.value)}
                placeholder="직접 입력"
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-900"
              />
              <button
                onClick={() => {
                  const threshold = Number(customThreshold);
                  if (threshold > 0) {
                    handleSetThreshold(threshold);
                    setCustomThreshold('');
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                설정
              </button>
            </div>
          </div>

          {/* 월 한도 설정 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold mb-4">월 충전 한도</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              한 달 동안 자동 충전 가능한 최대 금액을 설정하세요.
            </p>
            
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  현재 설정: {formatWon(autoRecharge.maxMonthlyAmount)}
                </span>
                <span className="text-sm text-gray-500">
                  남은 한도: {formatWon(autoRecharge.maxMonthlyAmount - autoRecharge.monthlyUsage)}
                </span>
              </div>
              <input
                type="range"
                min="10000"
                max="1000000"
                step="10000"
                value={autoRecharge.maxMonthlyAmount}
                onChange={(e) => handleSetMonthlyLimit(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{formatWon(10000)}</span>
                <span>{formatWon(500000)}</span>
                <span>{formatWon(1000000)}</span>
              </div>
            </div>

            {monthlyUsagePercent > 80 && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    월 한도의 80% 이상을 사용했습니다.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 결제 수단 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold mb-4">결제 수단</h3>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-8 h-8 text-gray-400" />
                  <div>
                    <p className="font-medium">•••• •••• •••• 1234</p>
                    <p className="text-sm text-gray-500">유효기간: 12/25</p>
                  </div>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-700">
                  변경
                </button>
              </div>
            </div>
          </div>

          {/* 테스트 모드 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">테스트 모드</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  자동 충전이 제대로 작동하는지 테스트해보세요.
                </p>
              </div>
              <button
                onClick={handleTestRecharge}
                disabled={testMode}
                className={cn(
                  'px-4 py-2 rounded-lg transition-colors flex items-center gap-2',
                  testMode
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                )}
              >
                {testMode ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    테스트 중...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    테스트 실행
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* 안내 메시지 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">자동 충전 안내</p>
            <ul className="space-y-1 text-xs">
              <li>• 자동 충전은 하루 최대 3회까지 실행됩니다.</li>
              <li>• 충전 실패 시 이메일로 알림을 받습니다.</li>
              <li>• 월 한도에 도달하면 다음 달까지 자동 충전이 중지됩니다.</li>
              <li>• 언제든지 설정을 변경하거나 비활성화할 수 있습니다.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
