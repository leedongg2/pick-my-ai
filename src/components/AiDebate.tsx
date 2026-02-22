'use client';

import React, { useState, useCallback } from 'react';
import { useStore } from '@/store';
import { toast } from 'sonner';
import { Play, Copy, RotateCcw } from 'lucide-react';
import { cn } from '@/utils/cn';

type Props = {
  availableModels: any[];
  walletCredits: { [modelId: string]: number };
  modelById: Map<string, any>;
  onClose?: () => void;
  language?: string;
  speechLevel?: string;
};

type DebateMessage = {
  modelId: string;
  side: 'A' | 'B';
  round: number;
  content: string;
  loading?: boolean;
};

export const AiDebate: React.FC<Props> = ({ availableModels, walletCredits, modelById, language, speechLevel }) => {
  const { deductCredit } = useStore();
  const [topic, setTopic] = useState('');
  const [modelA, setModelA] = useState('');
  const [modelB, setModelB] = useState('');
  const [rounds, setRounds] = useState(3);
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [conclusion, setConclusion] = useState('');

  const textModels = availableModels.filter(m =>
    m.series !== 'image' && m.series !== 'video' && !m.isBatch
  );

  const totalCost = rounds * 2 + 1;

  const callModel = async (modelId: string, messages: { role: string; content: string }[]) => {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        modelId,
        language: language || 'ko',
        speechLevel: speechLevel || 'formal',
        temperature: 0.8,
      }),
    });
    if (!res.ok) throw new Error('API 오류');
    const data = await res.json();
    return data.content || '';
  };

  const handleRun = useCallback(async () => {
    if (!topic.trim()) { toast.error('토론 주제를 입력해주세요.'); return; }
    if (!modelA || !modelB) { toast.error('두 AI를 모두 선택해주세요.'); return; }
    if (modelA === modelB) { toast.error('서로 다른 AI를 선택해주세요.'); return; }

    const creditsA = walletCredits[modelA] || 0;
    const creditsB = walletCredits[modelB] || 0;
    if (creditsA < rounds + 1) { toast.error(`${modelById.get(modelA)?.displayName} 크레딧이 부족합니다.`); return; }
    if (creditsB < rounds) { toast.error(`${modelById.get(modelB)?.displayName} 크레딧이 부족합니다.`); return; }

    setIsRunning(true);
    setMessages([]);
    setConclusion('');

    const modelAName = modelById.get(modelA)?.displayName || 'AI-A';
    const modelBName = modelById.get(modelB)?.displayName || 'AI-B';
    const debateHistory: DebateMessage[] = [];

    const addMessage = (msg: DebateMessage) => {
      debateHistory.push(msg);
      setMessages([...debateHistory]);
    };

    try {
      for (let round = 1; round <= rounds; round++) {
        // A의 주장
        const aHistoryMsgs = debateHistory.map(m => ({
          role: 'user' as const,
          content: `[${m.side === 'A' ? modelAName : modelBName}의 ${m.round}라운드 주장]\n${m.content}`
        }));

        const aPrompt = round === 1
          ? `당신은 "${topic}"에 대한 토론에서 찬성 측 입장입니다. 강력하고 설득력 있는 첫 번째 주장을 3-4문장으로 펼쳐주세요.`
          : `당신은 "${topic}"에 대한 토론에서 찬성 측 입장입니다. 상대방의 주장에 반박하고 자신의 입장을 강화해주세요. 3-4문장으로.`;

        addMessage({ modelId: modelA, side: 'A', round, content: '', loading: true });
        deductCredit(modelA).catch(() => {});

        const aContent = await callModel(modelA, [
          ...aHistoryMsgs,
          { role: 'user', content: aPrompt }
        ]);

        debateHistory[debateHistory.length - 1] = { modelId: modelA, side: 'A', round, content: aContent };
        setMessages([...debateHistory]);

        // B의 반박
        const bHistoryMsgs = debateHistory.map(m => ({
          role: 'user' as const,
          content: `[${m.side === 'A' ? modelAName : modelBName}의 ${m.round}라운드 주장]\n${m.content}`
        }));

        const bPrompt = `당신은 "${topic}"에 대한 토론에서 반대 측 입장입니다. ${modelAName}의 주장에 날카롭게 반박하고 반대 입장을 강화해주세요. 3-4문장으로.`;

        addMessage({ modelId: modelB, side: 'B', round, content: '', loading: true });
        deductCredit(modelB).catch(() => {});

        const bContent = await callModel(modelB, [
          ...bHistoryMsgs,
          { role: 'user', content: bPrompt }
        ]);

        debateHistory[debateHistory.length - 1] = { modelId: modelB, side: 'B', round, content: bContent };
        setMessages([...debateHistory]);
      }

      // 결론 (A가 최종 정리)
      const allHistory = debateHistory.map(m => ({
        role: 'user' as const,
        content: `[${m.side === 'A' ? modelAName : modelBName}의 ${m.round}라운드]\n${m.content}`
      }));

      deductCredit(modelA).catch(() => {});
      const conclusionContent = await callModel(modelA, [
        ...allHistory,
        { role: 'user', content: `위의 토론을 종합하여 "${topic}"에 대한 균형 잡힌 최종 결론을 5-6문장으로 내려주세요. 양측 논거를 공정하게 정리하고 핵심 인사이트를 도출해주세요.` }
      ]);

      setConclusion(conclusionContent);
      toast.success('토론이 완료되었습니다! 🏆');
    } catch (e: any) {
      toast.error('토론 중 오류가 발생했습니다.');
    } finally {
      setIsRunning(false);
    }
  }, [topic, modelA, modelB, rounds, walletCredits, modelById, deductCredit, language, speechLevel]);

  const handleReset = () => {
    setMessages([]);
    setConclusion('');
  };

  const modelAName = modelById.get(modelA)?.displayName || 'AI A';
  const modelBName = modelById.get(modelB)?.displayName || 'AI B';

  return (
    <div className="p-5">
      <div className="mb-4 p-3 bg-red-50 rounded-xl text-sm text-red-700 border border-red-200">
        ⚔️ 두 AI가 주제에 대해 찬반으로 나뉘어 실제 토론합니다. 총 {totalCost}회 크레딧이 차감됩니다.
      </div>

      {/* 설정 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">찬성 측 AI</label>
          <select
            value={modelA}
            onChange={e => setModelA(e.target.value)}
            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            <option value="">선택...</option>
            {textModels.map(m => (
              <option key={m.id} value={m.id} disabled={m.id === modelB}>{m.displayName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">반대 측 AI</label>
          <select
            value={modelB}
            onChange={e => setModelB(e.target.value)}
            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            <option value="">선택...</option>
            {textModels.map(m => (
              <option key={m.id} value={m.id} disabled={m.id === modelA}>{m.displayName}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="text-xs font-semibold text-gray-600 mb-1 block">라운드 수 (각 AI가 몇 번 주장할지)</label>
        <input
          type="number"
          min={1}
          max={5}
          value={rounds}
          onChange={e => setRounds(Math.max(1, Math.min(5, Number(e.target.value))))}
          className="w-24 text-sm px-3 py-2 border border-gray-300 rounded-xl focus:outline-none"
        />
        <span className="ml-2 text-xs text-gray-500">총 {totalCost}회 크레딧 차감</span>
      </div>

      <div className="mb-4">
        <textarea
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="토론 주제를 입력하세요. (예: 'AI가 인간의 일자리를 빼앗을 것인가?')"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
          rows={2}
        />
      </div>

      <div className="flex gap-2 mb-5">
        <button
          onClick={handleRun}
          disabled={isRunning || !topic.trim() || !modelA || !modelB}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Play className="w-4 h-4" />
          {isRunning ? '토론 진행 중...' : '토론 시작'}
        </button>
        {messages.length > 0 && !isRunning && (
          <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200 transition-colors">
            <RotateCcw className="w-4 h-4" />초기화
          </button>
        )}
      </div>

      {/* 토론 내용 */}
      {messages.length > 0 && (
        <div className="space-y-3">
          {/* 헤더 */}
          <div className="flex gap-2 text-xs font-semibold">
            <div className="flex-1 text-center py-1 bg-blue-100 text-blue-700 rounded-lg">{modelAName} (찬성)</div>
            <div className="flex-1 text-center py-1 bg-red-100 text-red-700 rounded-lg">{modelBName} (반대)</div>
          </div>

          {Array.from({ length: rounds }, (_, i) => i + 1).map(round => {
            const aMsg = messages.find(m => m.side === 'A' && m.round === round);
            const bMsg = messages.find(m => m.side === 'B' && m.round === round);
            return (
              <div key={round}>
                <div className="text-xs text-center text-gray-400 my-2">— {round}라운드 —</div>
                <div className="flex gap-2">
                  <div className={cn('flex-1 p-3 rounded-xl text-sm', aMsg ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200 opacity-40')}>
                    {aMsg?.loading ? (
                      <div className="flex items-center gap-1 text-gray-400 text-xs">
                        <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />주장 중...
                      </div>
                    ) : (
                      <p className="text-gray-800 whitespace-pre-wrap">{aMsg?.content || ''}</p>
                    )}
                  </div>
                  <div className={cn('flex-1 p-3 rounded-xl text-sm', bMsg ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200 opacity-40')}>
                    {bMsg?.loading ? (
                      <div className="flex items-center gap-1 text-gray-400 text-xs">
                        <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />반박 중...
                      </div>
                    ) : (
                      <p className="text-gray-800 whitespace-pre-wrap">{bMsg?.content || ''}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* 최종 결론 */}
          {conclusion && (
            <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-xl">
              <div className="text-sm font-bold text-yellow-700 mb-2">🏆 최종 결론</div>
              <div className="text-sm text-gray-800 whitespace-pre-wrap">{conclusion}</div>
              <button
                onClick={() => { navigator.clipboard.writeText(conclusion); toast.success('복사했습니다!'); }}
                className="mt-2 text-xs text-yellow-600 flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />복사
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
