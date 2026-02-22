'use client';

import React, { useState, useCallback } from 'react';
import { Sparkles, Loader2, Lock } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useStore } from '@/store';

type Props = {
  question: string;
  models: any[];
  speechLevel?: string;
  language?: string;
  compact?: boolean;
};

export const SmartRouter: React.FC<Props> = ({ question, models, speechLevel, language, compact }) => {
  const { smartRouterPurchased } = useStore();
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  const handleAnalyze = useCallback(async (premium = false) => {
    if (!question.trim()) return;
    setLoading(true);
    setIsPremium(premium);
    try {
      const res = await fetch('/api/smart-router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          models: models.map(m => ({ id: m.id, displayName: m.displayName, description: m.description || '' })),
          speechLevel: speechLevel || 'formal',
          language: language || 'ko',
          premium,
        }),
      });
      if (!res.ok) throw new Error('분석 실패');
      const data = await res.json();
      setRecommendation(data.recommendation);
    } catch {
      setRecommendation('분석에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }, [question, models, speechLevel, language]);

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

        {smartRouterPurchased ? (
          <button
            onClick={() => handleAnalyze(true)}
            disabled={loading}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              'bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {loading && isPremium ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            5위 상세 분석
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
