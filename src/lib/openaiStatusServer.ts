import 'server-only';

import {
  OPENAI_STATUS_REFRESH_INTERVAL_MS,
  createDefaultOpenAIStatusSnapshot,
  formatOpenAIStatusReason,
  type OpenAIStatusIncident,
  type OpenAIStatusSnapshot,
} from '@/utils/openaiStatus';

const OPENAI_STATUS_FEED_URL = 'https://status.openai.com/feed.rss';
const OPENAI_STATUS_PAGE_URL = 'https://status.openai.com';
const OPENAI_STATUS_FETCH_TIMEOUT_MS = 10000;
const OPENAI_STATUS_USER_AGENT = 'PickMyAI OpenAI Status Monitor';
const NON_OPERATIONAL_STATUS_PATTERN = /(degraded performance|partial outage|major outage|under maintenance|maintenance)/i;

type CachedOpenAIStatus = OpenAIStatusSnapshot & {
  checkedAtMs: number;
};

let cachedOpenAIStatus: CachedOpenAIStatus | null = null;
let openAIStatusRefreshPromise: Promise<OpenAIStatusSnapshot> | null = null;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2F;/g, '/');
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractXmlTag(block: string, tagName: string): string {
  const pattern = new RegExp(`<${escapeRegExp(tagName)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapeRegExp(tagName)}>`, 'i');
  return block.match(pattern)?.[1]?.trim() || '';
}

function normalizeIncidentStatus(rawValue: string): string {
  const cleaned = stripHtml(rawValue).replace(/^status\s*:\s*/i, '').trim();
  return cleaned || 'Unknown';
}

function isResolvedIncident(status: string, content: string): boolean {
  return /resolved/i.test(status) || /status\s*:\s*resolved/i.test(content);
}

function dedupeIncidents(incidents: OpenAIStatusIncident[]): OpenAIStatusIncident[] {
  const seen = new Set<string>();
  return incidents.filter((incident) => {
    const key = `${incident.source}:${incident.title}:${incident.status}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value != null;
}

function parseRssIncidents(xml: string): OpenAIStatusIncident[] {
  const itemBlocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];

  return itemBlocks
    .map((block) => {
      const title = stripHtml(extractXmlTag(block, 'title'));
      const link = stripHtml(extractXmlTag(block, 'link')) || undefined;
      const description = extractXmlTag(block, 'description');
      const contentEncoded = extractXmlTag(block, 'content:encoded');
      const pubDate = stripHtml(extractXmlTag(block, 'pubDate')) || undefined;
      const combined = [description, contentEncoded].filter(Boolean).join(' ');
      const statusMatch = combined.match(/status\s*:\s*([^<\n\r]+)/i);
      const status = normalizeIncidentStatus(statusMatch?.[0] || 'Unknown');

      if (!title) {
        return null;
      }

      if (isResolvedIncident(status, combined)) {
        return null;
      }

      return {
        title,
        status,
        link,
        updatedAt: pubDate,
        source: 'rss' as const,
      };
    })
    .filter(isDefined);
}

function parseStatusPageIncidents(html: string): OpenAIStatusIncident[] {
  const incidents: OpenAIStatusIncident[] = [];

  const jsonLikeMatches = html.matchAll(/"name":"([^"]*API[^"]*)","status":"([a-z_]+)"/gi);
  for (const match of jsonLikeMatches) {
    const title = match[1]?.trim();
    const rawStatus = match[2]?.replace(/_/g, ' ').trim();
    if (!title || !rawStatus || /operational/i.test(rawStatus)) continue;
    incidents.push({
      title,
      status: rawStatus.replace(/\b\w/g, (char) => char.toUpperCase()),
      source: 'status-page',
      link: OPENAI_STATUS_PAGE_URL,
    });
  }

  if (incidents.length > 0) {
    return incidents;
  }

  const stripped = stripHtml(html);
  const componentMatches = stripped.matchAll(/(APIs?|API Platform|Responses API|Chat Completions API|Assistants API|Embeddings API)\s+(Operational|Degraded Performance|Partial Outage|Major Outage|Under Maintenance|Maintenance)/gi);
  for (const match of componentMatches) {
    const title = match[1]?.trim();
    const status = match[2]?.trim();
    if (!title || !status || /operational/i.test(status)) continue;
    incidents.push({
      title,
      status,
      source: 'status-page',
      link: OPENAI_STATUS_PAGE_URL,
    });
  }

  if (incidents.length > 0) {
    return incidents;
  }

  if (NON_OPERATIONAL_STATUS_PATTERN.test(stripped) && /api/i.test(stripped)) {
    incidents.push({
      title: 'OpenAI API status page',
      status: 'Degraded Performance',
      source: 'status-page',
      link: OPENAI_STATUS_PAGE_URL,
    });
  }

  return incidents;
}

async function fetchTextWithTimeout(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENAI_STATUS_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'User-Agent': OPENAI_STATUS_USER_AGENT,
        'Accept': 'text/html,application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`OpenAI status fetch failed: ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function refreshOpenAIStatusSnapshot(): Promise<OpenAIStatusSnapshot> {
  const [rssResult, pageResult] = await Promise.allSettled([
    fetchTextWithTimeout(OPENAI_STATUS_FEED_URL),
    fetchTextWithTimeout(OPENAI_STATUS_PAGE_URL),
  ]);

  const rssIncidents = rssResult.status === 'fulfilled' ? parseRssIncidents(rssResult.value) : [];
  const pageIncidents = pageResult.status === 'fulfilled' ? parseStatusPageIncidents(pageResult.value) : [];
  const incidents = dedupeIncidents([...rssIncidents, ...pageIncidents]);
  const available = incidents.length === 0;
  const lastCheckedAt = new Date().toISOString();

  if (rssResult.status === 'rejected' && pageResult.status === 'rejected') {
    throw new Error('Unable to fetch OpenAI status sources.');
  }

  const nextSnapshot = createDefaultOpenAIStatusSnapshot({
    available,
    message: available
      ? 'OpenAI GPT 서비스가 정상입니다.'
      : '현재 OpenAI 장애로 GPT 모델 사용이 일시 중단되었습니다.',
    reason: available ? undefined : formatOpenAIStatusReason({ reason: undefined, incidents }),
    lastCheckedAt,
    incidents,
    source: 'live',
  });

  cachedOpenAIStatus = {
    ...nextSnapshot,
    checkedAtMs: Date.now(),
  };

  return nextSnapshot;
}

export async function getOpenAIStatus(options: { forceRefresh?: boolean } = {}): Promise<OpenAIStatusSnapshot> {
  const now = Date.now();

  if (!options.forceRefresh && cachedOpenAIStatus && now - cachedOpenAIStatus.checkedAtMs < OPENAI_STATUS_REFRESH_INTERVAL_MS) {
    return {
      ...cachedOpenAIStatus,
      source: 'cache',
    };
  }

  if (!openAIStatusRefreshPromise) {
    openAIStatusRefreshPromise = refreshOpenAIStatusSnapshot().finally(() => {
      openAIStatusRefreshPromise = null;
    });
  }

  try {
    return await openAIStatusRefreshPromise;
  } catch (error) {
    if (cachedOpenAIStatus) {
      return {
        ...cachedOpenAIStatus,
        source: 'cache',
      };
    }

    return createDefaultOpenAIStatusSnapshot({
      available: true,
      message: 'OpenAI 상태를 확인하지 못해 기본적으로 GPT 사용을 허용합니다.',
      reason: undefined,
      lastCheckedAt: new Date().toISOString(),
      incidents: [],
      source: 'fallback',
    });
  }
}
