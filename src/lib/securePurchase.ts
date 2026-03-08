import crypto from 'crypto';
import { secureCompare } from '@/lib/secureAuth';
import { WalletCredits, normalizeCreditsMap } from '@/lib/serverWallet';

export type PurchaseTokenPayload = {
  v: 1;
  userId: string;
  orderId: string;
  amount: number;
  credits: WalletCredits;
  pmcToUse: number;
  pmcEarnAmount: number;
  iat: number;
  exp: number;
};

const PURCHASE_TOKEN_TTL_MS = 60 * 60 * 1000;

function getPurchaseSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!secret || secret.length < 32) {
    throw new Error('결제 서명용 비밀키가 없거나 너무 짧습니다. JWT_SECRET 또는 SUPABASE_SERVICE_ROLE_KEY를 확인해주세요.');
  }

  return secret;
}

function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function signPayload(encodedPayload: string): string {
  return crypto
    .createHmac('sha256', getPurchaseSecret())
    .update(encodedPayload)
    .digest('base64url');
}

export function createPurchaseToken(data: {
  userId: string;
  orderId: string;
  amount: number;
  credits: WalletCredits;
  pmcToUse: number;
  pmcEarnAmount: number;
}): string {
  const now = Date.now();
  const payload: PurchaseTokenPayload = {
    v: 1,
    userId: data.userId,
    orderId: data.orderId,
    amount: Math.max(0, Math.trunc(data.amount)),
    credits: normalizeCreditsMap(data.credits),
    pmcToUse: Math.max(0, Math.trunc(data.pmcToUse)),
    pmcEarnAmount: Math.max(0, Math.trunc(data.pmcEarnAmount)),
    iat: now,
    exp: now + PURCHASE_TOKEN_TTL_MS,
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyPurchaseToken(token: string): PurchaseTokenPayload | null {
  try {
    const [encodedPayload, providedSignature] = token.split('.');
    if (!encodedPayload || !providedSignature) {
      return null;
    }

    const expectedSignature = signPayload(encodedPayload);
    if (!secureCompare(providedSignature, expectedSignature)) {
      return null;
    }

    const payload = JSON.parse(fromBase64Url(encodedPayload)) as Partial<PurchaseTokenPayload>;
    if (payload.v !== 1) {
      return null;
    }

    if (typeof payload.userId !== 'string' || !payload.userId) {
      return null;
    }

    if (typeof payload.orderId !== 'string' || !payload.orderId) {
      return null;
    }

    if (typeof payload.amount !== 'number' || !Number.isFinite(payload.amount) || payload.amount < 0) {
      return null;
    }

    if (typeof payload.iat !== 'number' || typeof payload.exp !== 'number') {
      return null;
    }

    if (payload.exp < Date.now()) {
      return null;
    }

    return {
      v: 1,
      userId: payload.userId,
      orderId: payload.orderId,
      amount: Math.trunc(payload.amount),
      credits: normalizeCreditsMap(payload.credits),
      pmcToUse: Math.max(0, Math.trunc(payload.pmcToUse || 0)),
      pmcEarnAmount: Math.max(0, Math.trunc(payload.pmcEarnAmount || 0)),
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
