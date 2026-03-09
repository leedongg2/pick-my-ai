import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/apiAuth';
import { RateLimiter, getClientIp } from '@/lib/rateLimit';
import {
  applyCreditDelta,
  ensureUserWallet,
  extractPendingPurchaseMeta,
  extractPurchaseCredits,
  getPendingTossPurchase,
  getUserSettingsData,
  isTossPurchaseAlreadyConfirmed,
  markTossPurchaseConfirmed,
  sanitizePMCBalance,
  saveUserSettingsData,
} from '@/lib/walletSecurity';

const confirmRateLimiter = new RateLimiter(10, 5 * 60 * 1000);

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session.authenticated || !session.userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const clientIp = getClientIp(req);
    const rl = confirmRateLimiter.check(`${session.userId}:${clientIp}:toss-confirm`);
    if (!rl.success) {
      return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429 });
    }

    const { paymentKey, orderId, amount } = await req.json();

    if (
      typeof paymentKey !== 'string' || !paymentKey.trim() || paymentKey.trim().length > 256 ||
      typeof orderId !== 'string' || !/^order_[a-zA-Z0-9]+$/.test(orderId) ||
      !Number.isFinite(Number(amount)) || Number(amount) < 100
    ) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const requestedAmount = Math.round(Number(amount));

    if (await isTossPurchaseAlreadyConfirmed(session.userId, orderId)) {
      const wallet = await ensureUserWallet(session.userId);
      const settings: Record<string, any> = await getUserSettingsData(session.userId).catch(() => ({}));
      return NextResponse.json({ ok: true, wallet, pmcBalance: sanitizePMCBalance(settings.pmcBalance), hasFirstPurchase: true });
    }

    const pendingPurchase = await getPendingTossPurchase(session.userId, orderId);
    if (!pendingPurchase) {
      return NextResponse.json({ error: '결제 준비 정보가 없습니다.' }, { status: 404 });
    }

    if (Math.round(Number(pendingPurchase.amount || 0)) !== requestedAmount) {
      return NextResponse.json({ error: '결제 금액 검증에 실패했습니다.' }, { status: 400 });
    }

    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'Server payment key not configured' }, { status: 500 });
    }

    const basicToken = Buffer.from(`${secretKey}:`).toString('base64');

    const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data?.message || 'Payment confirm failed' }, { status: 400 });
    }

    const confirmedAmount = Math.round(Number(data?.totalAmount ?? requestedAmount));
    if (confirmedAmount !== requestedAmount || data?.orderId !== orderId) {
      return NextResponse.json({ error: '결제 검증에 실패했습니다.' }, { status: 400 });
    }

    const credits = extractPurchaseCredits(pendingPurchase.credits);
    if (Object.keys(credits).length === 0) {
      return NextResponse.json({ error: '지급할 크레딧이 없습니다.' }, { status: 400 });
    }

    const meta = extractPendingPurchaseMeta(pendingPurchase.credits);
    const walletCredits = await applyCreditDelta(session.userId, credits, {
      type: 'purchase',
      amount: confirmedAmount,
      credits,
      description: `Toss 결제 완료: ${orderId}`,
    });

    const currentSettings: Record<string, any> = await getUserSettingsData(session.userId).catch(() => ({}));
    const currentPmc = sanitizePMCBalance(currentSettings.pmcBalance);
    const pmcHistory = [...currentPmc.history];
    let nextPmcAmount = currentPmc.amount;

    if (meta.pmcToUse > 0) {
      nextPmcAmount = Math.max(0, nextPmcAmount - meta.pmcToUse);
      pmcHistory.unshift({
        id: crypto.randomUUID(),
        type: 'use',
        amount: -meta.pmcToUse,
        description: '결제 시 사용',
        orderId,
        expiresAt: new Date(),
        createdAt: new Date(),
      });
    }

    if (meta.pmcEarn > 0) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);
      nextPmcAmount += meta.pmcEarn;
      pmcHistory.unshift({
        id: crypto.randomUUID(),
        type: 'earn',
        amount: meta.pmcEarn,
        description: '결제 적립',
        orderId,
        expiresAt,
        createdAt: new Date(),
      });
    }

    await saveUserSettingsData(session.userId, {
      ...currentSettings,
      hasFirstPurchase: true,
      pmcBalance: {
        amount: nextPmcAmount,
        history: pmcHistory.slice(0, 500),
      },
    }).catch(() => undefined);

    await markTossPurchaseConfirmed(pendingPurchase.id, orderId, credits, confirmedAmount);

    return NextResponse.json({
      ok: true,
      data,
      wallet: { userId: session.userId, credits: walletCredits },
      pmcBalance: {
        amount: nextPmcAmount,
        history: pmcHistory.slice(0, 500),
      },
      hasFirstPurchase: true,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}


