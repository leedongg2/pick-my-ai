import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIStatus } from '@/lib/openaiStatusServer';
import { RateLimiter, getClientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET || '';
const openAIStatusRateLimiter = new RateLimiter(120, 5 * 60 * 1000);

function isAuthorizedCronRequest(request: NextRequest): boolean {
  if (!CRON_SECRET) return false;
  return request.headers.get('authorization') === `Bearer ${CRON_SECRET}`;
}

export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rl = openAIStatusRateLimiter.check(`openai-status:${clientIp}`);
    if (!rl.success) {
      return NextResponse.json(
        {
          available: true,
          message: '상태 요청이 너무 많아 기본 허용 모드로 응답합니다.',
          reason: undefined,
          lastCheckedAt: new Date().toISOString(),
          incidents: [],
          source: 'rate-limit-fallback',
        },
        {
          status: 429,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    const forceRefresh = isAuthorizedCronRequest(request) || (request.nextUrl.searchParams.get('refresh') === '1' && isAuthorizedCronRequest(request));
    const status = await getOpenAIStatus({ forceRefresh });
    return NextResponse.json(status, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        available: true,
        message: 'OpenAI 상태를 확인하지 못해 기본적으로 GPT 사용을 허용합니다.',
        reason: undefined,
        lastCheckedAt: new Date().toISOString(),
        incidents: [],
        source: 'fallback',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}
