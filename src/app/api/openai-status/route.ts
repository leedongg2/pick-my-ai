import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIStatus } from '@/lib/openaiStatusServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET || '';

function isAuthorizedCronRequest(request: NextRequest): boolean {
  if (!CRON_SECRET) return false;
  return request.headers.get('authorization') === `Bearer ${CRON_SECRET}`;
}

export async function GET(request: NextRequest) {
  try {
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
        error: error?.message || 'Unknown error',
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
