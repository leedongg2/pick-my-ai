'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Sparkles, Loader2, Lock } from 'lucide-react';
import { useOpenAIStatus } from '@/components/OpenAIStatusProvider';
import { cn } from '@/utils/cn';
import { useStore } from '@/store';
import { getOpenAIStatusBlockedMessage } from '@/utils/openaiStatus';
import { shallow } from 'zustand/shallow';

type Props = {
  question: string;
  models: any[];
  speechLevel?: string;
  language?: string;
  compact?: boolean;
};

export const SmartRouter: React.FC<Props> = ({ question, models, speechLevel, language, compact }) => {
  const { smartRouterPurchased, smartRouterFreeUsed, setSmartRouterFreeUsed, setSmartRouterPurchased } = useStore(
    (state) => ({
      smartRouterPurchased: state.smartRouterPurchased,
      smartRouterFreeUsed: state.smartRouterFreeUsed,
      setSmartRouterFreeUsed: state.setSmartRouterFreeUsed,
      setSmartRouterPurchased: state.setSmartRouterPurchased,
    }),
    shallow
  );
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const { status: openAIStatus } = useOpenAIStatus();
  const openAIBlockedReason = useMemo(
    () => getOpenAIStatusBlockedMessage(openAIStatus.reason),
    [openAIStatus.reason]
  );
  const routerModels = useMemo(
    () => models.map((m) => ({ id: m.id, displayName: m.displayName, description: m.description || '' })),
    [models]
  );
  const ui = useMemo(() => {
    if (language === 'en') {
      return {
        analyze: 'Analyze question',
        premium: 'Top 5 detailed analysis',
        premiumFree: ' (first time free)',
        locked: 'Top 5 analysis (Buy AI Models > Other)',
        failed: 'Analysis failed. Please try again.',
        loginRequired: 'Login is required.',
      };
    }

    if (language === 'ja') {
      return {
        analyze: '質問分析',
        premium: '上位5件の詳細分析',
        premiumFree: '（初回無料）',
        locked: '5位分析（AIモデル購入 > その他）',
        failed: '分析に失敗しました。もう一度お試しください。',
        loginRequired: 'ログインが必要です。',
      };
    }

    return {
      analyze: '질문 분석하기',
      premium: '5위 상세 분석',
      premiumFree: ' (최초 1회 무료)',
      locked: '5위 분석 (구매페이지 > 기타)',
      failed: '분석에 실패했습니다. 다시 시도해주세요.',
      loginRequired: '로그인이 필요합니다.',
    };
  }, [language]);

  const handleAnalyze = useCallback(async (premium = false) => {
    if (!question.trim()) return;
    if (!openAIStatus.available) {
      setRecommendation(openAIBlockedReason);
      return;
    }
    setLoading(true);
    setIsPremium(premium);

    try {
      const res = await fetch('/api/smart-router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          models: routerModels,
          speechLevel: speechLevel || 'formal',
          language: language || 'ko',
          premium,
        }),
      });
      if (res.status === 401) {
        setRecommendation(ui.loginRequired);
        return;
      }
      if (res.status === 403) {
        setRecommendation(ui.locked);
        return;
      }
      if (!res.ok) throw new Error('analysis_failed');
      const data = await res.json();
      setSmartRouterPurchased(data?.smartRouterPurchased === true);
      setSmartRouterFreeUsed(data?.smartRouterFreeUsed === true);
      setRecommendation(data.recommendation);
    } catch {
      setRecommendation(ui.failed);
    } finally {
      setLoading(false);
    }
  }, [question, routerModels, speechLevel, language, smartRouterPurchased, smartRouterFreeUsed, setSmartRouterFreeUsed, setSmartRouterPurchased, openAIStatus.available, openAIBlockedReason, ui]);

  if (!question.trim() || models.length === 0) return null;

  return (
    <div className={cn('rounded-xl border bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200', compact ? 'p-2' : 'p-3')}>
      {!openAIStatus.available && (
        <div className="mb-2 text-xs text-amber-700">
          {openAIBlockedReason}
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => handleAnalyze(false)}
          disabled={loading || !openAIStatus.available}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed'
          )}
        >
          {loading && !isPremium ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          {ui.analyze}
        </button>

        {smartRouterPurchased || !smartRouterFreeUsed ? (
          <button
            onClick={() => handleAnalyze(true)}
            disabled={loading || !openAIStatus.available}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              'bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {loading && isPremium ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {ui.premium}{!smartRouterPurchased && !smartRouterFreeUsed ? ui.premiumFree : ''}
          </button>
        ) : (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Lock className="w-3 h-3" />{ui.locked}
          </span>
        )}
      </div>

      {recommendation && (
        <div className={cn('mt-2 text-sm text-gray-800', isPremium ? 'whitespace-pre-wrap' : '')}>
          <span className="font-semibold text-indigo-600">💡 </span>
          {recommendation}
        </div>
      )}
    </div>
  );
};
