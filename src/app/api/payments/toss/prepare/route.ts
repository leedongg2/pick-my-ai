import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/apiAuth';
import { createPurchaseToken } from '@/lib/securePurchase';
import { getAvailablePMCAmount, loadUserSettings, normalizePMCBalance } from '@/lib/serverWallet';
import { initialModels } from '@/data/models';
import { calculatePMCEarn, calculatePrice, defaultPolicy } from '@/utils/pricing';
import type { ModelSelection } from '@/types';

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

function normalizeSelections(input: unknown): ModelSelection[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.reduce<ModelSelection[]>((acc, item) => {
    if (!item || typeof item !== 'object') {
      return acc;
    }

    const selection = item as Record<string, unknown>;
    const modelId = typeof selection.modelId === 'string' ? selection.modelId.trim() : '';
    const quantity = typeof selection.quantity === 'number' && Number.isFinite(selection.quantity)
      ? Math.trunc(selection.quantity)
      : 0;

    if (!modelId || quantity <= 0 || quantity > 10000) {
      return acc;
    }

    const model = initialModels.find((entry) => entry.id === modelId && entry.enabled);
    if (!model) {
      return acc;
    }

    acc.push({ modelId, quantity });
    return acc;
  }, []);
}

export async function POST(request: NextRequest) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ error: '허용되지 않은 Origin입니다.' }, { status: 403 });
    }

    const session = await verifySession(request);
    if (!session.authenticated || !session.userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const selections = normalizeSelections(body?.selections);

    if (selections.length === 0) {
      return NextResponse.json({ error: '선택한 모델이 없습니다.' }, { status: 400 });
    }

    const requestedPmcToUse = typeof body?.pmcToUse === 'number' && Number.isFinite(body.pmcToUse)
      ? Math.max(0, Math.trunc(body.pmcToUse))
      : 0;

    const settings = await loadUserSettings(session.userId).catch(() => null);
    const hasFirstPurchase = !!settings?.hasFirstPurchase;
    const userPlan = settings?.userPlan === 'plus' || settings?.userPlan === 'pro' || settings?.userPlan === 'max'
      ? settings.userPlan
      : 'free';
    const pmcBalance = normalizePMCBalance(settings?.pmcBalance);
    const availablePMC = getAvailablePMCAmount(pmcBalance);

    const priceCalculation = calculatePrice(initialModels, selections, defaultPolicy, !hasFirstPurchase);
    const pmcCalculation = calculatePMCEarn(initialModels, selections, priceCalculation.finalTotal, userPlan);
    const approvedPmcToUse = Math.min(requestedPmcToUse, availablePMC, pmcCalculation.maxUsable);
    const amount = Math.max(100, Math.round(priceCalculation.finalTotal - approvedPmcToUse));

    const credits = selections.reduce<Record<string, number>>((acc, selection) => {
      acc[selection.modelId] = selection.quantity;
      return acc;
    }, {});

    const selectedModels = selections.map((selection) => {
      const model = initialModels.find((entry) => entry.id === selection.modelId)!;
      return model;
    });

    const orderId = `order_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const orderName = selectedModels.length === 1
      ? selectedModels[0].displayName
      : `${selectedModels[0].displayName} 외 ${selectedModels.length - 1}건`;

    const purchaseToken = createPurchaseToken({
      userId: session.userId,
      orderId,
      amount,
      credits,
      pmcToUse: approvedPmcToUse,
      pmcEarnAmount: pmcCalculation.earnAmount,
    });

    return NextResponse.json({
      orderId,
      orderName,
      amount,
      purchaseToken,
      credits,
      pmcToUse: approvedPmcToUse,
      pmcEarnAmount: pmcCalculation.earnAmount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || '결제 준비 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
