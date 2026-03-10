'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useStore } from '@/store';
import { toast } from 'sonner';
import { Send, X, Copy, Check } from 'lucide-react';
import { cn } from '@/utils/cn';

type Props = {
  availableModels: any[];
  walletCredits: { [modelId: string]: number };
  modelById: Map<string, any>;
  onClose?: () => void;
  language?: string;
  speechLevel?: string;
};

type ModelResponse = {
  modelId: string;
  content: string;
  loading: boolean;
  error?: string;
};

export const SideBySide: React.FC<Props> = ({ availableModels, walletCredits, modelById, language, speechLevel }) => {
  const { deductCredit } = useStore();
  const [prompt, setPrompt] = useState('');
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [responses, setResponses] = useState<ModelResponse[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const abortRefs = useRef<{ [modelId: string]: AbortController }>({});

  const textModels = availableModels.filter(m =>
    m.series !== 'image' && m.series !== 'video' && !m.isBatch
  );

  const toggleModel = (modelId: string) => {
    setSelectedModelIds(prev =>
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : prev.length < 4 ? [...prev, modelId] : prev
    );
  };

  const handleRun = useCallback(async () => {
    if (!prompt.trim()) { toast.error('질문을 입력해주세요.'); return; }
    if (selectedModelIds.length < 2) { toast.error('최소 2개 모델을 선택해주세요.'); return; }

    const initResponses: ModelResponse[] = selectedModelIds.map(modelId => ({
      modelId, content: '', loading: true, error: undefined
    }));
    setResponses(initResponses);
    setIsRunning(true);

    selectedModelIds.forEach(async (modelId) => {
      const controller = new AbortController();
      abortRefs.current[modelId] = controller;
      try {
        deductCredit(modelId).catch(() => {});
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            modelId,
            language: language || 'ko',
            speechLevel: speechLevel || 'formal',
            temperature: 0.7,
          }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`${modelById.get(modelId)?.displayName} 오류`);
        const data = await res.json();
        setResponses(prev => prev.map(r =>
          r.modelId === modelId ? { ...r, content: data.content || '', loading: false } : r
        ));
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          setResponses(prev => prev.map(r =>
            r.modelId === modelId ? { ...r, loading: false, error: '오류가 발생했습니다.' } : r
          ));
        }
      }
    });

    setIsRunning(false);
  }, [prompt, selectedModelIds, deductCredit, modelById, language, speechLevel]);

  const handleStop = () => {
    Object.values(abortRefs.current).forEach(c => c.abort());
    abortRefs.current = {};
    setResponses(prev => prev.map(r => r.loading ? { ...r, loading: false, error: '취소됨' } : r));
  };

  const handleCopy = (modelId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(modelId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const cols = responses.length >= 3 ? 3 : responses.length || 2;

  return (
    <div className="p-5">
      {/* 모델 선택 */}
      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-700 mb-2">비교할 모델 선택 (최대 4개)</div>
        <div className="flex flex-wrap gap-2">
          {textModels.map(m => (
            <button
              key={m.id}
              onClick={() => toggleModel(m.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm border transition-colors',
                selectedModelIds.includes(m.id)
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
              )}
            >
              {m.displayName}
              {selectedModelIds.includes(m.id) && <span className="ml-1 text-xs opacity-70">✓</span>}
            </button>
          ))}
        </div>
        {selectedModelIds.length > 0 && (
          <div className="mt-1 text-xs text-gray-500">선택됨: {selectedModelIds.map(id => modelById.get(id)?.displayName).join(', ')} · 총 {selectedModelIds.length}회 크레딧 차감</div>
        )}
      </div>

      {/* 질문 입력 */}
      <div className="mb-4">
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="모든 AI에게 동시에 보낼 질문을 입력하세요..."
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
          rows={3}
        />
      </div>

      <div className="flex gap-2 mb-5">
        <button
          onClick={handleRun}
          disabled={!prompt.trim() || selectedModelIds.length < 2}
          className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
          동시 질문 시작
        </button>
        {responses.some(r => r.loading) && (
          <button onClick={handleStop} className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200 transition-colors">
            <X className="w-4 h-4" />중지
          </button>
        )}
      </div>

      {/* 응답 영역 */}
      {responses.length > 0 && (
        <div className={cn('grid gap-4', cols === 4 ? 'grid-cols-2' : cols === 3 ? 'grid-cols-3' : cols === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
          {responses.map(r => (
            <div key={r.modelId} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 flex items-center justify-between border-b border-gray-200">
                <span className="text-sm font-semibold text-gray-800">{modelById.get(r.modelId)?.displayName}</span>
                {r.content && (
                  <button onClick={() => handleCopy(r.modelId, r.content)} className="p-1 hover:bg-gray-200 rounded">
                    {copiedId === r.modelId ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                  </button>
                )}
              </div>
              <div className="p-3 min-h-[120px] text-sm text-gray-800">
                {r.loading ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    생성 중...
                  </div>
                ) : r.error ? (
                  <div className="text-red-500 text-xs">{r.error}</div>
                ) : (
                  <div className="whitespace-pre-wrap">{r.content}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
