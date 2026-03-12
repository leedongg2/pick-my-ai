'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Sparkles, Loader2, Lock } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useStore } from '@/store';
import { shallow } from 'zustand/shallow';

type Props = {
  question: string;
  models: any[];
  speechLevel?: string;
  language?: string;
  compact?: boolean;
};

export const SmartRouter: React.FC<Props> = ({ question, models, speechLevel, language, compact }) => {
  const { smartRouterPurchased, smartRouterFreeUsed, setSmartRouterFreeUsed } = useStore(
    (state) => ({
      smartRouterPurchased: state.smartRouterPurchased,
      smartRouterFreeUsed: state.smartRouterFreeUsed,
      setSmartRouterFreeUsed: state.setSmartRouterFreeUsed,
    }),
    shallow
  );
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const routerModels = useMemo(
    () => models.map((m) => ({ id: m.id, displayName: m.displayName, description: m.description || '' })),
    [models]
  );

  const loginRequiredMessage = language === 'en'
    ? 'Login is required to analyze a question.'
    : language === 'ja'
      ? '質問を分析するにはログインが必要です。'
      : '질문 분석을 사용하려면 로그인이 필요합니다.';

  const failedMessage = language === 'en'
    ? 'Analysis failed. Please try again.'
    : language === 'ja'
      ? '分析に失敗しました。もう一度お試しください。'
      : '분석에 실패했습니다. 다시 시도해주세요.';

  const handleAnalyze = useCallback(async (premium = false) => {
    if (!question.trim()) return;
    setLoading(true);
    setIsPremium(premium);
    
    // 프리미엄 최초 1회 무료 사용 처리
    if (premium && !smartRouterPurchased && !smartRouterFreeUsed) {
      setSmartRouterFreeUsed(true);
    }
    
    try {
      const res = await fetch('/api/smart-router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          question,
          models: routerModels,
          speechLevel: speechLevel || 'formal',
          language: language || 'ko',
          premium,
        }),
      });
      if (res.status === 401) {
        throw new Error('ERR_AUTH');
      }
      if (!res.ok) throw new Error('ERR_ANALYZE');
      const data = await res.json();
      setRecommendation(data.recommendation);
    } catch (error: any) {
      setRecommendation(error?.message === 'ERR_AUTH' ? loginRequiredMessage : failedMessage);
    } finally {
      setLoading(false);
    }
  }, [question, routerModels, speechLevel, language, smartRouterPurchased, smartRouterFreeUsed, setSmartRouterFreeUsed, loginRequiredMessage, failedMessage]);

  if (!question.trim() || models.length === 0) return null;

  return (
    <div className={cn('rounded-xl border bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200', compact ? 'p-2' : 'p-3')}>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => handleAnalyze(false)}
          disabled={loading}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed'
          )}
        >
          {loading && !isPremium ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          질문 분석하기
        </button>

        {smartRouterPurchased || !smartRouterFreeUsed ? (
          <button
            onClick={() => handleAnalyze(true)}
            disabled={loading}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              'bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {loading && isPremium ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            5위 상세 분석{!smartRouterPurchased && !smartRouterFreeUsed ? ' (최초 1회 무료)' : ''}
          </button>
        ) : (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Lock className="w-3 h-3" />5위 분석 (구매페이지 &gt; 기타)
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
