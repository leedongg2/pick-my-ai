type ReactCommitMetric = {
  count: number;
  totalActualDurationMs: number;
  maxActualDurationMs: number;
};

type ChatPerfSnapshot = {
  t: number;
  lsSetItemCount: number;
  lsSetItemTotalDurationMs: number;
  lsSetItemPickMyAiStorageCount: number;
  lsSetItemPickMyAiStorageBytes: number;
  longTaskCount: number;
  longTaskTotalDurationMs: number;
  longTaskMaxDurationMs: number;
  eventCount: number;
  eventMaxDurationMs: number;
  interactionMaxDurationMs: number;
  reactCommits: Record<string, ReactCommitMetric>;
};

type ChatPerfRun = {
  id: string;
  label: string;
  streamingDraftV2: boolean;
  start: ChatPerfSnapshot;
  end: ChatPerfSnapshot;
  durationMs: number;
  deltas: Record<string, number>;
};

type ChatPerfState = {
  initialized: boolean;
  lsSetItemCount: number;
  lsSetItemTotalDurationMs: number;
  lsSetItemPickMyAiStorageCount: number;
  lsSetItemPickMyAiStorageBytes: number;
  longTaskCount: number;
  longTaskTotalDurationMs: number;
  longTaskMaxDurationMs: number;
  eventCount: number;
  eventMaxDurationMs: number;
  interactionMaxDurationMs: number;
  reactCommits: Record<string, ReactCommitMetric>;
  activeRuns: Map<string, { id: string; label: string; streamingDraftV2: boolean; start: ChatPerfSnapshot }>;
  runs: ChatPerfRun[];
};

const REACT_IDS = ['ChatRoot', 'ChatSidebar', 'ChatMessages', 'ChatInput'];

let cachedEnabled: boolean | null = null;

export function isChatPerfEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  if (typeof window === 'undefined') return false;
  if (cachedEnabled !== null) return cachedEnabled;

  try {
    const urlFlag = new URLSearchParams(window.location.search).get('chatPerf');
    if (urlFlag === '1' || urlFlag === 'true') {
      cachedEnabled = true;
      return true;
    }

    const lsFlag = window.localStorage.getItem('chatPerf');
    cachedEnabled = lsFlag === '1' || lsFlag === 'true';
    return cachedEnabled;
  } catch {
    cachedEnabled = false;
    return false;
  }
}

function getState(): ChatPerfState {
  const w = window as any;
  if (!w.__chatPerfState) {
    const reactCommits: Record<string, ReactCommitMetric> = {};
    for (const id of REACT_IDS) {
      reactCommits[id] = { count: 0, totalActualDurationMs: 0, maxActualDurationMs: 0 };
    }

    w.__chatPerfState = {
      initialized: false,
      lsSetItemCount: 0,
      lsSetItemTotalDurationMs: 0,
      lsSetItemPickMyAiStorageCount: 0,
      lsSetItemPickMyAiStorageBytes: 0,
      longTaskCount: 0,
      longTaskTotalDurationMs: 0,
      longTaskMaxDurationMs: 0,
      eventCount: 0,
      eventMaxDurationMs: 0,
      interactionMaxDurationMs: 0,
      reactCommits,
      activeRuns: new Map(),
      runs: [],
    } satisfies ChatPerfState;
  }

  return w.__chatPerfState as ChatPerfState;
}

export function initChatPerfOnce(): void {
  if (!isChatPerfEnabled()) return;

  const state = getState();
  if (state.initialized) return;
  state.initialized = true;

  if (typeof PerformanceObserver === 'undefined') return;

  try {
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const durationMs = typeof entry.duration === 'number' ? entry.duration : 0;
        if (durationMs >= 50) {
          state.longTaskCount += 1;
          state.longTaskTotalDurationMs += durationMs;
          state.longTaskMaxDurationMs = Math.max(state.longTaskMaxDurationMs, durationMs);
        }
      }
    });

    longTaskObserver.observe({ entryTypes: ['longtask'] as any });
  } catch {}

  try {
    const eventObserver = new PerformanceObserver((list) => {
      for (const e of list.getEntries() as any[]) {
        const durationMs = typeof e?.duration === 'number' ? e.duration : 0;
        if (durationMs <= 0) continue;

        state.eventCount += 1;
        state.eventMaxDurationMs = Math.max(state.eventMaxDurationMs, durationMs);

        const interactionId = typeof e?.interactionId === 'number' ? e.interactionId : 0;
        if (interactionId > 0) {
          state.interactionMaxDurationMs = Math.max(state.interactionMaxDurationMs, durationMs);
        }
      }
    });

    eventObserver.observe({ type: 'event', buffered: true, durationThreshold: 0 } as any);
  } catch {}
}

export function recordChatPerfLsSetItem(key: string, value: string, durationMs: number): void {
  if (!isChatPerfEnabled()) return;

  const state = getState();
  state.lsSetItemCount += 1;
  state.lsSetItemTotalDurationMs += durationMs;

  if (key === 'pick-my-ai-storage') {
    state.lsSetItemPickMyAiStorageCount += 1;
    state.lsSetItemPickMyAiStorageBytes += typeof value === 'string' ? value.length : 0;
  }
}

export function recordChatPerfReactCommit(id: string, actualDurationMs: number): void {
  if (!isChatPerfEnabled()) return;

  const state = getState();
  const metric = state.reactCommits[id] ?? (state.reactCommits[id] = {
    count: 0,
    totalActualDurationMs: 0,
    maxActualDurationMs: 0,
  });

  metric.count += 1;
  metric.totalActualDurationMs += actualDurationMs;
  metric.maxActualDurationMs = Math.max(metric.maxActualDurationMs, actualDurationMs);
}

function cloneReactCommits(input: Record<string, ReactCommitMetric>): Record<string, ReactCommitMetric> {
  const out: Record<string, ReactCommitMetric> = {};
  for (const [id, m] of Object.entries(input)) {
    out[id] = {
      count: m.count,
      totalActualDurationMs: m.totalActualDurationMs,
      maxActualDurationMs: m.maxActualDurationMs,
    };
  }
  return out;
}

export function snapshotChatPerf(): ChatPerfSnapshot {
  const state = getState();
  return {
    t: performance.now(),
    lsSetItemCount: state.lsSetItemCount,
    lsSetItemTotalDurationMs: state.lsSetItemTotalDurationMs,
    lsSetItemPickMyAiStorageCount: state.lsSetItemPickMyAiStorageCount,
    lsSetItemPickMyAiStorageBytes: state.lsSetItemPickMyAiStorageBytes,
    longTaskCount: state.longTaskCount,
    longTaskTotalDurationMs: state.longTaskTotalDurationMs,
    longTaskMaxDurationMs: state.longTaskMaxDurationMs,
    eventCount: state.eventCount,
    eventMaxDurationMs: state.eventMaxDurationMs,
    interactionMaxDurationMs: state.interactionMaxDurationMs,
    reactCommits: cloneReactCommits(state.reactCommits),
  };
}

function computeDeltas(start: ChatPerfSnapshot, end: ChatPerfSnapshot): Record<string, number> {
  const getCommitCount = (snap: ChatPerfSnapshot) =>
    Object.values(snap.reactCommits).reduce((sum, m) => sum + m.count, 0);

  const getCommitDurationTotal = (snap: ChatPerfSnapshot) =>
    Object.values(snap.reactCommits).reduce((sum, m) => sum + m.totalActualDurationMs, 0);

  const deltas: Record<string, number> = {
    lsSetItemCount: end.lsSetItemCount - start.lsSetItemCount,
    lsSetItemTotalDurationMs: end.lsSetItemTotalDurationMs - start.lsSetItemTotalDurationMs,
    lsSetItemPickMyAiStorageCount: end.lsSetItemPickMyAiStorageCount - start.lsSetItemPickMyAiStorageCount,
    lsSetItemPickMyAiStorageBytes: end.lsSetItemPickMyAiStorageBytes - start.lsSetItemPickMyAiStorageBytes,
    longTaskCount: end.longTaskCount - start.longTaskCount,
    longTaskTotalDurationMs: end.longTaskTotalDurationMs - start.longTaskTotalDurationMs,
    eventCount: end.eventCount - start.eventCount,
    reactCommitCount: getCommitCount(end) - getCommitCount(start),
    reactCommitTotalActualDurationMs: getCommitDurationTotal(end) - getCommitDurationTotal(start),
  };

  for (const id of Object.keys(end.reactCommits)) {
    const startM = start.reactCommits[id];
    const endM = end.reactCommits[id];
    if (!endM) continue;

    deltas[`reactCommitCount.${id}`] = (endM.count ?? 0) - (startM?.count ?? 0);
    deltas[`reactCommitTotalActualDurationMs.${id}`] =
      (endM.totalActualDurationMs ?? 0) - (startM?.totalActualDurationMs ?? 0);
  }

  return deltas;
}

export function startChatPerfRun(label: string, streamingDraftV2: boolean): string {
  if (!isChatPerfEnabled()) return '';

  const state = getState();
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random()}`;

  state.activeRuns.set(id, {
    id,
    label,
    streamingDraftV2,
    start: snapshotChatPerf(),
  });

  return id;
}

export function endChatPerfRun(id: string): void {
  if (!isChatPerfEnabled()) return;
  if (!id) return;

  const state = getState();
  const active = state.activeRuns.get(id);
  if (!active) return;

  const end = snapshotChatPerf();
  const run: ChatPerfRun = {
    id: active.id,
    label: active.label,
    streamingDraftV2: active.streamingDraftV2,
    start: active.start,
    end,
    durationMs: end.t - active.start.t,
    deltas: computeDeltas(active.start, end),
  };

  state.activeRuns.delete(id);
  state.runs.push(run);

  if (process.env.NODE_ENV !== 'production') {
    console.log('[ChatPerf]', run);
  }
}

export function getChatPerfRuns(): ChatPerfRun[] {
  if (typeof window === 'undefined') return [];
  return getState().runs;
}
