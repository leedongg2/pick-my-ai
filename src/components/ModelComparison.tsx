'use client';

import React, { useState, useCallback } from 'react';
import { useStore } from '@/store';
import { toast } from 'sonner';
import { Sparkles, Trophy, Clock, Zap, Copy, Check, RefreshCw, ArrowRight } from 'lucide-react';
import { cn } from '@/utils/cn';

export const ModelComparison: React.FC = () => {
  const { 
    models, 
    activeComparison,
    comparisonSessions,
    startComparison,
    updateComparisonResponse,
    setComparisonWinner,
    wallet,
    deductCredit,
  } = useStore();

  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isComparing, setIsComparing] = useState(false);
  const [copied, setCopied] = useState<{ [key: string]: boolean }>({});

  const availableModels = models.filter(m => m.enabled && (wallet?.credits[m.id] || 0) > 0);

  const toggleModel = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId)
        : prev.length < 4 ? [...prev, modelId] : prev
    );
  };

  const handleStartComparison = async () => {
    if (selectedModels.length < 2) {
      toast.error('최소 2개 이상의 모델을 선택해주세요.');
      return;
    }

    if (!prompt.trim()) {
      toast.error('프롬프트를 입력해주세요.');
      return;
    }

    const hasCredits = selectedModels.every(modelId => (wallet?.credits[modelId] || 0) > 0);
    if (!hasCredits) {
      toast.error('선택한 모델의 크레딧이 부족합니다.');
      return;
    }

    setIsComparing(true);
    const sessionId = startComparison(selectedModels, prompt);
    const startTime = Date.now();
    
    for (const modelId of selectedModels) {
      try {
        if (!deductCredit(modelId)) {
          toast.error(`${modelId} 크레딧 부족`);
          continue;
        }

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelId,
            messages: [{ role: 'user', content: prompt }],
            stream: false,
          }),
        });

        const data = await response.json();
        const endTime = Date.now();

        updateComparisonResponse(sessionId, modelId, {
          content: data.content || data.error || '응답 생성 실패',
          timestamp: new Date(),
          tokens: data.tokens || 0,
          cost: 1,
          latency: endTime - startTime,
        });

        toast.success(`${models.find(m => m.id === modelId)?.displayName} 응답 완료`);
      } catch (error) {
        console.error(`Error with ${modelId}:`, error);
        updateComparisonResponse(sessionId, modelId, {
          content: '오류가 발생했습니다.',
          timestamp: new Date(),
          tokens: 0,
          cost: 0,
          latency: 0,
        });
      }
    }

    setIsComparing(false);
    toast.success('모든 모델 비교 완료!');
  };

  const handleCopy = useCallback((modelId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(prev => ({ ...prev, [modelId]: true }));
    toast.success('복사되었습니다');
    setTimeout(() => {
      setCopied(prev => ({ ...prev, [modelId]: false }));
    }, 2000);
  }, []);

  const handleSelectWinner = (modelId: string) => {
    if (activeComparison) {
      setComparisonWinner(activeComparison.id, modelId);
      toast.success('승자가 선택되었습니다!', {
        icon: <Trophy className="w-4 h-4 text-yellow-500" />,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">모델 비교</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">여러 AI 모델의 응답을 동시에 비교하세요</p>
      </div>

      {/* 모델 선택 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">모델 선택</h3>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {selectedModels.length}/4 선택됨
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {availableModels.map(model => {
            const isSelected = selectedModels.includes(model.id);
            return (
              <button
                key={model.id}
                onClick={() => toggleModel(model.id)}
                className={cn(
                  "relative p-4 rounded-lg border-2 transition-colors",
                  isSelected
                    ? "border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600"
                )}
              >
                {isSelected && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white dark:text-gray-900" />
                  </div>
                )}
                <div className="text-left">
                  <div className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                    {model.displayName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {wallet?.credits[model.id] || 0}회 남음
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 프롬프트 입력 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
          비교할 프롬프트
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="여러 모델에게 동일한 질문을 해보세요..."
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={4}
        />
        
        <button
          onClick={handleStartComparison}
          disabled={isComparing || selectedModels.length < 2 || !prompt.trim()}
          className={cn(
            "mt-4 w-full py-3 px-6 rounded-lg font-medium transition-colors",
            "flex items-center justify-center gap-2",
            isComparing || selectedModels.length < 2 || !prompt.trim()
              ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              : "bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900"
          )}
        >
          {isComparing ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              비교 중...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              비교 시작
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>

      {/* 비교 결과 */}
      {activeComparison && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">비교 결과</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(activeComparison.responses).map(([modelId, response]) => {
              const model = models.find(m => m.id === modelId);
              const isWinner = activeComparison.winner === modelId;
              
              return (
                <div
                  key={modelId}
                  className={cn(
                    "relative bg-white dark:bg-gray-800 rounded-lg p-6 border-2 transition-colors",
                    isWinner
                      ? "border-yellow-500"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  {isWinner && (
                    <div className="absolute -top-3 -right-3 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-white" />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-gray-900 dark:text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {model?.displayName}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="w-3 h-3" />
                          {response.latency}ms
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(modelId, response.content)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="복사"
                      >
                        {copied[modelId] ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                      
                      {!isWinner && (
                        <button
                          onClick={() => handleSelectWinner(modelId)}
                          className="px-3 py-1 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-medium hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
                        >
                          승자 선택
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {response.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 비교 히스토리 */}
      {comparisonSessions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">최근 비교</h3>
          <div className="space-y-3">
            {comparisonSessions.slice(0, 3).map(session => (
              <div
                key={session.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                      {session.prompt}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{session.models.length}개 모델</span>
                      <span>•</span>
                      <span>{new Date(session.createdAt).toLocaleDateString('ko-KR')}</span>
                    </div>
                  </div>
                  {session.winner && (
                    <Trophy className="w-4 h-4 text-yellow-500 flex-shrink-0 ml-2" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelComparison;
