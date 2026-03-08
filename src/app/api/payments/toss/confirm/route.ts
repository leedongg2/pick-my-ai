import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/apiAuth';
import { verifyPurchaseToken } from '@/lib/securePurchase';
import {
  applyCreditDelta,
  applyPMCEarn,
  applyPMCUsage,
  getOrCreateWallet,
  hasTransactionDescription,
  loadUserSettings,
  normalizePMCBalance,
  saveUserSettings,
} from '@/lib/serverWallet';

function isTrustedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!origin || !appUrl) {
    return true;
  }

  try {
    return new URL(origin).origin === new URL(appUrl).origin;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isTrustedOrigin(req)) {
      return NextResponse.json({ error: '허용되지 않은 Origin입니다.' }, { status: 403 });
    }

    const session = await verifySession(req);
    if (!session.authenticated || !session.userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { paymentKey, orderId, amount, purchaseToken } = await req.json();

    if (!paymentKey || !orderId || !amount || !purchaseToken) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const verifiedPurchase = verifyPurchaseToken(purchaseToken);
    if (!verifiedPurchase) {
      return NextResponse.json({ error: '유효하지 않은 결제 토큰입니다.' }, { status: 400 });
    }

    if (verifiedPurchase.userId !== session.userId) {
      return NextResponse.json({ error: '결제 사용자 정보가 일치하지 않습니다.' }, { status: 403 });
    }

    if (verifiedPurchase.orderId !== orderId || verifiedPurchase.amount !== Number(amount)) {
      return NextResponse.json({ error: '결제 금액 또는 주문 정보가 일치하지 않습니다.' }, { status: 400 });
    }

    const orderDescription = `payment:${orderId}`;
    if (await hasTransactionDescription(session.userId, orderDescription)) {
      const wallet = await getOrCreateWallet(session.userId);
      const settings = await loadUserSettings(session.userId).catch(() => null);
      return NextResponse.json({
        ok: true,
        alreadyProcessed: true,
        wallet,
        pmcBalance: normalizePMCBalance(settings?.pmcBalance),
        hasFirstPurchase: !!settings?.hasFirstPurchase,
      });
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

    const purchaseResult = await applyCreditDelta(session.userId, verifiedPurchase.credits, {
      amount: verifiedPurchase.amount,
      description: orderDescription,
      idempotencyKey: orderDescription,
      requireSufficient: false,
      transactionType: 'purchase',
    });

    if (!purchaseResult.ok || !purchaseResult.wallet) {
      return NextResponse.json({ error: '크레딧 지급에 실패했습니다.' }, { status: 500 });
    }

    const settings = await loadUserSettings(session.userId).catch(() => null);
    const currentPmcBalance = normalizePMCBalance(settings?.pmcBalance);
    const nextPmcBalance = applyPMCEarn(
      applyPMCUsage(currentPmcBalance, verifiedPurchase.pmcToUse, verifiedPurchase.orderId),
      verifiedPurchase.pmcEarnAmount,
      verifiedPurchase.orderId
    );

    await saveUserSettings(session.userId, {
      ...(settings || {}),
      pmcBalance: nextPmcBalance,
      hasFirstPurchase: true,
    });

    return NextResponse.json({
      ok: true,
      data,
      wallet: purchaseResult.wallet,
      pmcBalance: nextPmcBalance,
      hasFirstPurchase: true,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}


