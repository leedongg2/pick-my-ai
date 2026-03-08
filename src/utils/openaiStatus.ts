export type OpenAIStatusIncident = {
  title: string;
  status: string;
  link?: string;
  source: 'rss' | 'status-page';
  updatedAt?: string;
};

export type OpenAIStatusSnapshot = {
  available: boolean;
  message: string;
  reason?: string;
  lastCheckedAt: string | null;
  incidents: OpenAIStatusIncident[];
  source: 'live' | 'cache' | 'fallback';
};

export const OPENAI_STATUS_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
export const OPENAI_STATUS_ERROR_CODE = 'ERR_OPENAI_STATUS';

const OPENAI_TEXT_BASE_MODEL_IDS = new Set(['o3', 'o3mini', 'o4mini']);
const OPENAI_TEXT_EXCLUDED_IDS = new Set(['gptimage1']);

export function isOpenAITextModelId(modelId?: string | null): boolean {
  if (!modelId) return false;

  const normalized = modelId.toLowerCase();
  const baseModelId = normalized.endsWith('_48h') ? normalized.slice(0, -4) : normalized;

  if (OPENAI_TEXT_EXCLUDED_IDS.has(baseModelId)) {
    return false;
  }

  return baseModelId.startsWith('gpt') || OPENAI_TEXT_BASE_MODEL_IDS.has(baseModelId);
}

export function createDefaultOpenAIStatusSnapshot(
  partial: Partial<OpenAIStatusSnapshot> = {}
): OpenAIStatusSnapshot {
  return {
    available: true,
    message: 'OpenAI GPT 서비스가 정상입니다.',
    reason: undefined,
    lastCheckedAt: null,
    incidents: [],
    source: 'fallback',
    ...partial,
  };
}

export function getOpenAIStatusBlockedMessage(reason?: string): string {
  return reason?.trim()
    ? reason.trim()
    : '현재 OpenAI 상태 페이지에서 미해결 장애가 감지되어 GPT 모델 사용이 일시 중단되었습니다. 잠시 후 다시 시도해주세요.';
}

export function formatOpenAIStatusReason(snapshot: Pick<OpenAIStatusSnapshot, 'reason' | 'incidents'>): string {
  if (snapshot.reason?.trim()) {
    return snapshot.reason.trim();
  }

  const firstIncident = snapshot.incidents[0];
  if (!firstIncident) {
    return getOpenAIStatusBlockedMessage();
  }

  return `${firstIncident.title} (${firstIncident.status})`;
}
