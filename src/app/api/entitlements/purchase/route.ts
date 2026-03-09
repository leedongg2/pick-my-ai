import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/apiAuth';
import { RateLimiter, getClientIp } from '@/lib/rateLimit';
import { getUserSettingsData, saveUserSettingsData, sanitizePMCBalance } from '@/lib/walletSecurity';

const purchaseRateLimiter = new RateLimiter(10, 5 * 60 * 1000);

type EntitlementConfig = {
  price: number;
  purchasedKey: 'smartRouterPurchased' | 'insurancePurchased';
  purchasedAtKey?: 'insurancePurchaseDate';
};

const ENTITLEMENT_ITEMS: Record<'smart-router-premium' | 'error-insurance', EntitlementConfig> = {
  'smart-router-premium': {
    price: 250,
    purchasedKey: 'smartRouterPurchased',
  },
  'error-insurance': {
    price: 500,
    purchasedKey: 'insurancePurchased',
    purchasedAtKey: 'insurancePurchaseDate',
  },
};

type EntitlementId = keyof typeof ENTITLEMENT_ITEMS;

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession(request);
    if (!session.authenticated || !session.userId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const clientIp = getClientIp(request);
    const rl = purchaseRateLimiter.check(`${session.userId}:${clientIp}:entitlement-purchase`);
    if (!rl.success) {
      return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const itemId = typeof body?.itemId === 'string' ? body.itemId : '';

    if (!(itemId in ENTITLEMENT_ITEMS)) {
      return NextResponse.json({ error: '유효하지 않은 상품입니다.' }, { status: 400 });
    }

    const entitlement = ENTITLEMENT_ITEMS[itemId as EntitlementId];
    const settings: Record<string, any> = await getUserSettingsData(session.userId).catch(() => ({}));
    const pmcBalance = sanitizePMCBalance(settings.pmcBalance);

    if (settings[entitlement.purchasedKey] === true) {
      return NextResponse.json({ error: '이미 구매한 상품입니다.' }, { status: 409 });
    }

    if (pmcBalance.amount < entitlement.price) {
      return NextResponse.json({ error: 'PMC가 부족합니다.' }, { status: 409 });
    }

    const history = [
      {
        id: crypto.randomUUID(),
        type: 'use',
        amount: -entitlement.price,
        description: `${itemId} 구매`,
        orderId: `entitlement-${itemId}-${Date.now()}`,
        expiresAt: new Date(),
        createdAt: new Date(),
      },
      ...pmcBalance.history,
    ];

    const nextSettings: Record<string, unknown> = {
      ...settings,
      [entitlement.purchasedKey]: true,
      pmcBalance: {
        amount: Math.max(0, pmcBalance.amount - entitlement.price),
        history: history.slice(0, 500),
      },
    };

    if (entitlement.purchasedAtKey) {
      nextSettings[entitlement.purchasedAtKey] = new Date().toISOString();
    }

    await saveUserSettingsData(session.userId, nextSettings);

    return NextResponse.json({
      success: true,
      itemId,
      pmcBalance: nextSettings.pmcBalance,
      smartRouterPurchased: nextSettings.smartRouterPurchased === true,
      insurancePurchased: nextSettings.insurancePurchased === true,
      insurancePurchaseDate: typeof nextSettings.insurancePurchaseDate === 'string' ? nextSettings.insurancePurchaseDate : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || '구매 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
