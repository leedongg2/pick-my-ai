'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useOpenAIStatus } from '@/components/OpenAIStatusProvider';
import { formatOpenAIStatusReason } from '@/utils/openaiStatus';

export function OpenAIStatusBanner() {
  const { status } = useOpenAIStatus();

  if (status.available) {
    return null;
  }

  const reason = formatOpenAIStatusReason(status);
  const checkedAt = status.lastCheckedAt
    ? new Date(status.lastCheckedAt).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="border-b border-amber-300 bg-amber-50 text-amber-900">
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-3 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">현재 OpenAI 장애로 GPT 모델 사용이 일시 중단되었습니다.</div>
          <div className="mt-1 break-words text-amber-800">{reason}</div>
          {checkedAt ? <div className="mt-1 text-xs text-amber-700">마지막 확인: {checkedAt}</div> : null}
        </div>
      </div>
    </div>
  );
}
