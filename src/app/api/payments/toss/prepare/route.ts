import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/apiAuth';
import { prepareTossPurchase } from '@/lib/walletSecurity';
import { RateLimiter, getClientIp } from '@/lib/rateLimit';

const prepareRateLimiter = new RateLimiter(10, 5 * 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession(request);
    if (!session.authenticated || !session.userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const clientIp = getClientIp(request);
    const rl = prepareRateLimiter.check(`${session.userId}:${clientIp}`);
    if (!rl.success) {
      return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const result = await prepareTossPurchase(session.userId, body?.selections, body?.pmcToUse);

    return NextResponse.json({
      orderId: result.orderId,
      orderName: result.orderName,
      amount: result.amount,
      pmcToUse: result.pmcToUse,
      pmcEarn: result.pmcEarn,
    });
  } catch (error: any) {
    if (error?.message === 'INVALID_SELECTIONS') {
      return NextResponse.json({ error: '유효한 결제 항목이 없습니다.' }, { status: 400 });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.error('Toss prepare error:', error);
    }

    return NextResponse.json({ error: error?.message || '결제 준비 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
