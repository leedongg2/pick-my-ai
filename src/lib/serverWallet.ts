import { createClient } from '@supabase/supabase-js';
import { PMCBalance, PMCTransaction } from '@/types';

export type WalletCredits = Record<string, number>;

type WalletRow = {
  id?: string;
  user_id: string;
  credits: WalletCredits;
  created_at?: string;
  updated_at?: string;
};

type CreditTransactionType = 'purchase' | 'usage';

type ApplyCreditDeltaOptions = {
  amount?: number | null;
  description: string;
  idempotencyKey?: string;
  requireSufficient?: boolean;
  transactionType: CreditTransactionType;
};

export const WELCOME_CREDITS: WalletCredits = {
  gpt5: 10,
  haiku45: 10,
  sonar: 10,
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const PMC_EXPIRY_DAYS = 90;

function getAdminDb() {
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.');
  }

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function normalizeCreditAmount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  const normalized = Math.trunc(value);
  if (!Number.isFinite(normalized)) {
    return 0;
  }

  return normalized;
}

export function normalizeCreditsMap(input: unknown): WalletCredits {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  return Object.entries(input as Record<string, unknown>).reduce<WalletCredits>((acc, [modelId, value]) => {
    if (typeof modelId !== 'string' || !modelId.trim()) {
      return acc;
    }

    const normalized = normalizeCreditAmount(value);
    if (normalized !== 0) {
      acc[modelId] = normalized;
    }

    return acc;
  }, {});
}

function normalizeWalletCredits(input: unknown): WalletCredits {
  const normalized = normalizeCreditsMap(input);

  return Object.entries(normalized).reduce<WalletCredits>((acc, [modelId, amount]) => {
    if (amount > 0) {
      acc[modelId] = amount;
    }
    return acc;
  }, {});
}

export async function getOrCreateWallet(userId: string): Promise<WalletRow> {
  const db = getAdminDb();
  const { data, error } = await db
    .from('user_wallets')
    .select('*')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || '지갑 조회에 실패했습니다.');
  }

  if (data) {
    return {
      ...data,
      credits: normalizeWalletCredits(data.credits),
    } as WalletRow;
  }

  const { data: created, error: createError } = await db
    .from('user_wallets')
    .insert({ user_id: userId, credits: {} })
    .select('*')
    .single();

  if (createError || !created) {
    throw new Error(createError?.message || '지갑 생성에 실패했습니다.');
  }

  return {
    ...created,
    credits: normalizeWalletCredits(created.credits),
  } as WalletRow;
}

export async function loadUserSettings(userId: string): Promise<Record<string, any> | null> {
  const db = getAdminDb();
  const { data, error } = await db
    .from('user_settings')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return null;
    }
    throw new Error(error.message || '사용자 설정 조회에 실패했습니다.');
  }

  return (data?.data as Record<string, any> | null) || null;
}

export async function saveUserSettings(userId: string, settings: Record<string, any>): Promise<void> {
  const db = getAdminDb();
  const { error } = await db
    .from('user_settings')
    .upsert(
      {
        user_id: userId,
        data: settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return;
    }
    throw new Error(error.message || '사용자 설정 저장에 실패했습니다.');
  }
}

function normalizeDate(value: unknown, fallback: Date): Date {
  const date = value instanceof Date ? value : new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? fallback : date;
}

export function normalizePMCBalance(input: unknown): PMCBalance {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { amount: 0, history: [] };
  }

  const source = input as Record<string, unknown>;
  const rawHistory = Array.isArray(source.history) ? source.history : [];
  const now = new Date();

  const history = rawHistory.reduce<PMCTransaction[]>((acc, item) => {
    if (!item || typeof item !== 'object') {
      return acc;
    }

    const tx = item as Record<string, unknown>;
    const type = tx.type === 'earn' || tx.type === 'use' || tx.type === 'expire' ? tx.type : null;
    const amount = normalizeCreditAmount(tx.amount);
    const description = typeof tx.description === 'string' ? tx.description : '';

    if (!type || !description) {
      return acc;
    }

    acc.push({
      id: typeof tx.id === 'string' && tx.id ? tx.id : `${Date.now()}_${acc.length}`,
      type,
      amount,
      description,
      orderId: typeof tx.orderId === 'string' && tx.orderId ? tx.orderId : undefined,
      expiresAt: normalizeDate(tx.expiresAt, now),
      createdAt: normalizeDate(tx.createdAt, now),
    });

    return acc;
  }, []);

  const available = getAvailablePMCAmount({ amount: 0, history });

  return {
    amount: typeof source.amount === 'number' && Number.isFinite(source.amount) ? Math.max(0, Math.trunc(source.amount)) : available,
    history,
  };
}

export function getAvailablePMCAmount(balance: PMCBalance): number {
  const now = new Date();
  let available = 0;

  balance.history.forEach((tx) => {
    if (tx.type === 'earn' && new Date(tx.expiresAt) > now) {
      available += tx.amount;
      return;
    }

    if (tx.type === 'use') {
      available += tx.amount;
    }
  });

  return Math.max(0, available);
}

export function applyPMCUsage(balance: PMCBalance, amount: number, orderId: string): PMCBalance {
  const normalizedAmount = Math.max(0, Math.trunc(amount));
  if (normalizedAmount <= 0) {
    return {
      amount: getAvailablePMCAmount(balance),
      history: [...balance.history],
    };
  }

  const nextHistory = [
    {
      id: `${Date.now()}_pmc_use_${orderId}`,
      type: 'use' as const,
      amount: -normalizedAmount,
      description: '결제 시 PMC 사용',
      orderId,
      expiresAt: new Date(),
      createdAt: new Date(),
    },
    ...balance.history,
  ];

  const nextBalance = {
    amount: 0,
    history: nextHistory,
  };

  return {
    amount: getAvailablePMCAmount(nextBalance),
    history: nextHistory,
  };
}

export function applyPMCEarn(balance: PMCBalance, amount: number, orderId: string): PMCBalance {
  const normalizedAmount = Math.max(0, Math.trunc(amount));
  if (normalizedAmount <= 0) {
    return {
      amount: getAvailablePMCAmount(balance),
      history: [...balance.history],
    };
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + PMC_EXPIRY_DAYS);

  const nextHistory = [
    {
      id: `${Date.now()}_pmc_earn_${orderId}`,
      type: 'earn' as const,
      amount: normalizedAmount,
      description: '결제 PMC 적립',
      orderId,
      expiresAt,
      createdAt: new Date(),
    },
    ...balance.history,
  ];

  const nextBalance = {
    amount: 0,
    history: nextHistory,
  };

  return {
    amount: getAvailablePMCAmount(nextBalance),
    history: nextHistory,
  };
}

export async function hasAnyTransactions(userId: string): Promise<boolean> {
  const db = getAdminDb();
  const { data, error } = await db
    .from('transactions')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (error) {
    throw new Error(error.message || '거래 내역 조회에 실패했습니다.');
  }

  return Array.isArray(data) && data.length > 0;
}

export async function hasTransactionDescription(userId: string, description: string): Promise<boolean> {
  const db = getAdminDb();
  const { data, error } = await db
    .from('transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('description', description)
    .limit(1);

  if (error) {
    throw new Error(error.message || '거래 중복 확인에 실패했습니다.');
  }

  return Array.isArray(data) && data.length > 0;
}

export async function applyCreditDelta(
  userId: string,
  delta: WalletCredits,
  options: ApplyCreditDeltaOptions
): Promise<{
  ok: boolean;
  wallet?: WalletRow;
  alreadyProcessed?: boolean;
  insufficientCreditModelId?: string;
}> {
  const normalizedDelta = normalizeCreditsMap(delta);
  const deltaEntries = Object.entries(normalizedDelta);

  if (deltaEntries.length === 0) {
    return {
      ok: true,
      wallet: await getOrCreateWallet(userId),
    };
  }

  const description = options.idempotencyKey || options.description;
  if (description && await hasTransactionDescription(userId, description)) {
    return {
      ok: true,
      wallet: await getOrCreateWallet(userId),
      alreadyProcessed: true,
    };
  }

  const db = getAdminDb();
  const wallet = await getOrCreateWallet(userId);
  const currentCredits = normalizeWalletCredits(wallet.credits);
  const nextCredits: WalletCredits = { ...currentCredits };

  for (const [modelId, amount] of deltaEntries) {
    const nextAmount = (nextCredits[modelId] || 0) + amount;

    if (options.requireSufficient && nextAmount < 0) {
      return {
        ok: false,
        wallet,
        insufficientCreditModelId: modelId,
      };
    }

    if (nextAmount <= 0) {
      delete nextCredits[modelId];
    } else {
      nextCredits[modelId] = nextAmount;
    }
  }

  const { data: updatedWallet, error: updateError } = await db
    .from('user_wallets')
    .update({ credits: nextCredits, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select('*')
    .single();

  if (updateError || !updatedWallet) {
    throw new Error(updateError?.message || '지갑 업데이트에 실패했습니다.');
  }

  const { error: txError } = await db
    .from('transactions')
    .insert({
      user_id: userId,
      type: options.transactionType,
      amount: options.amount ?? null,
      credits: normalizedDelta,
      description,
    });

  if (txError) {
    await db
      .from('user_wallets')
      .update({ credits: currentCredits, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    throw new Error(txError.message || '거래 로그 저장에 실패했습니다.');
  }

  return {
    ok: true,
    wallet: {
      ...(updatedWallet as WalletRow),
      credits: normalizeWalletCredits(updatedWallet.credits),
    },
  };
}

export async function grantWelcomeCreditsIfEligible(userId: string): Promise<{
  granted: boolean;
  wallet: WalletRow;
}> {
  const welcomeDescription = 'welcome_credits_v1';
  if (await hasTransactionDescription(userId, welcomeDescription)) {
    return {
      granted: false,
      wallet: await getOrCreateWallet(userId),
    };
  }

  const existingSettings = await loadUserSettings(userId);
  if (existingSettings?.hasFirstPurchase) {
    return {
      granted: false,
      wallet: await getOrCreateWallet(userId),
    };
  }

  if (await hasAnyTransactions(userId)) {
    return {
      granted: false,
      wallet: await getOrCreateWallet(userId),
    };
  }

  const result = await applyCreditDelta(userId, WELCOME_CREDITS, {
    description: welcomeDescription,
    idempotencyKey: welcomeDescription,
    amount: 0,
    requireSufficient: false,
    transactionType: 'purchase',
  });

  if (!result.ok || !result.wallet) {
    throw new Error('무료 시작 크레딧 지급에 실패했습니다.');
  }

  return {
    granted: true,
    wallet: result.wallet,
  };
}
