import { createClient } from '@supabase/supabase-js';
import { initialModels } from '@/data/models';
import type { ModelSelection, PMCBalance, PMCTransaction, UserPlan } from '@/types';
import { calculatePMCEarn, calculatePrice, defaultPolicy } from '@/utils/pricing';

type CreditsMap = Record<string, number>;

type TransactionRecord = {
  id: string;
  amount: number | null;
  credits: Record<string, unknown> | null;
  description: string | null;
};

const STARTER_CREDITS: CreditsMap = {
  gpt5: 10,
  haiku45: 10,
  sonar: 10,
};

const PENDING_TOSS_PURCHASE_PREFIX = 'PENDING_TOSS_PURCHASE:';
const CONFIRMED_TOSS_PURCHASE_PREFIX = 'TOSS_CONFIRMED:';
const MAX_SELECTIONS = 50;
const MAX_QUANTITY_PER_MODEL = 10000;
const MAX_CREDIT_DELTA = 100000;
const USER_PLAN_VALUES = new Set<UserPlan>(['free', 'plus', 'pro', 'max']);

function getDb() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase service role is not configured.');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function isSafeModelId(value: string): boolean {
  return /^[a-zA-Z0-9_:-]{1,64}$/.test(value);
}

function toSafePositiveInt(value: unknown, max: number): number {
  const normalized = Math.floor(Number(value));
  if (!Number.isFinite(normalized) || normalized <= 0) return 0;
  return Math.min(normalized, max);
}

function toSafeSignedInt(value: unknown, maxAbs: number): number {
  const normalized = Math.trunc(Number(value));
  if (!Number.isFinite(normalized) || normalized === 0) return 0;
  return Math.max(-maxAbs, Math.min(maxAbs, normalized));
}

function sanitizeCreditsObject(input: unknown, allowPositive: boolean, allowNegative: boolean): CreditsMap {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  const sanitized: CreditsMap = {};

  for (const [rawModelId, rawAmount] of Object.entries(input as Record<string, unknown>)) {
    if (!isSafeModelId(rawModelId) || rawModelId.startsWith('__meta_')) {
      continue;
    }

    const amount = toSafeSignedInt(rawAmount, MAX_CREDIT_DELTA);
    if (amount === 0) {
      continue;
    }
    if (amount > 0 && !allowPositive) {
      continue;
    }
    if (amount < 0 && !allowNegative) {
      continue;
    }

    sanitized[rawModelId] = amount;
  }

  return sanitized;
}

export function sanitizeStoredCredits(input: unknown): CreditsMap {
  return sanitizeCreditsObject(input, true, false);
}

export function sanitizeUsageDeltas(input: unknown): CreditsMap {
  return sanitizeCreditsObject(input, false, true);
}

export function sanitizeSelections(input: unknown): ModelSelection[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const merged = new Map<string, number>();

  for (const entry of input) {
    const modelId = typeof entry?.modelId === 'string' ? entry.modelId.trim() : '';
    if (!isSafeModelId(modelId)) {
      continue;
    }

    const quantity = toSafePositiveInt(entry?.quantity, MAX_QUANTITY_PER_MODEL);
    if (quantity <= 0) {
      continue;
    }

    merged.set(modelId, (merged.get(modelId) || 0) + quantity);
    if (merged.size >= MAX_SELECTIONS) {
      break;
    }
  }

  return Array.from(merged.entries()).map(([modelId, quantity]) => ({ modelId, quantity }));
}

export function creditsFromSelections(selections: ModelSelection[]): CreditsMap {
  const credits: CreditsMap = {};

  for (const selection of selections) {
    if (!isSafeModelId(selection.modelId)) {
      continue;
    }

    const quantity = toSafePositiveInt(selection.quantity, MAX_QUANTITY_PER_MODEL);
    if (quantity <= 0) {
      continue;
    }

    credits[selection.modelId] = (credits[selection.modelId] || 0) + quantity;
  }

  return credits;
}

function sanitizeDateString(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toISOString();
}

function sanitizePMCTransaction(input: unknown): PMCTransaction | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const raw = input as Record<string, unknown>;
  const type = raw.type;
  if (type !== 'earn' && type !== 'use' && type !== 'expire') {
    return null;
  }

  const amount = toSafeSignedInt(raw.amount, 1000000);
  const description = typeof raw.description === 'string' ? raw.description.slice(0, 160) : '';
  if (!description) {
    return null;
  }

  const nowIso = new Date().toISOString();

  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.slice(0, 128) : crypto.randomUUID(),
    type,
    amount,
    description,
    orderId: typeof raw.orderId === 'string' && raw.orderId.trim() ? raw.orderId.slice(0, 128) : undefined,
    expiresAt: new Date(sanitizeDateString(raw.expiresAt, nowIso)),
    createdAt: new Date(sanitizeDateString(raw.createdAt, nowIso)),
  };
}

export function sanitizePMCBalance(input: unknown): PMCBalance {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { amount: 0, history: [] };
  }

  const raw = input as Record<string, unknown>;
  const history = Array.isArray(raw.history)
    ? raw.history.map(sanitizePMCTransaction).filter((entry): entry is PMCTransaction => !!entry).slice(0, 500)
    : [];

  const computed = history.reduce((sum, tx) => {
    if (tx.type === 'earn') return sum + Math.max(0, tx.amount);
    if (tx.type === 'use' || tx.type === 'expire') return sum + Math.min(0, tx.amount);
    return sum;
  }, 0);

  const normalizedAmount = Math.max(0, Math.floor(Number(raw.amount)) || computed || 0);

  return {
    amount: normalizedAmount,
    history,
  };
}

export function sanitizeUserPlan(input: unknown): UserPlan {
  return USER_PLAN_VALUES.has(input as UserPlan) ? (input as UserPlan) : 'free';
}

export async function getUserSettingsData(userId: string): Promise<Record<string, any>> {
  const db = getDb();
  const { data } = await db.from('user_settings').select('data').eq('user_id', userId).single();
  return (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) ? data.data : {};
}

export async function saveUserSettingsData(userId: string, data: Record<string, any>): Promise<void> {
  const db = getDb();
  const { error } = await db
    .from('user_settings')
    .upsert({ user_id: userId, data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

  if (error && error.code !== '42P01') {
    throw new Error(error.message || 'Failed to save user settings.');
  }
}

export async function ensureUserWallet(userId: string): Promise<{ id: string; user_id: string; credits: CreditsMap }> {
  const db = getDb();
  const { data, error } = await db.from('user_wallets').select('id, user_id, credits').eq('user_id', userId).single();

  if (data) {
    return {
      id: data.id,
      user_id: data.user_id,
      credits: sanitizeStoredCredits(data.credits),
    };
  }

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message || 'Failed to load wallet.');
  }

  const { data: inserted, error: insertError } = await db
    .from('user_wallets')
    .insert({ user_id: userId, credits: {} })
    .select('id, user_id, credits')
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message || 'Failed to create wallet.');
  }

  return {
    id: inserted.id,
    user_id: inserted.user_id,
    credits: {},
  };
}

export async function setWalletCredits(userId: string, credits: CreditsMap): Promise<CreditsMap> {
  const db = getDb();
  const sanitized = sanitizeStoredCredits(credits);
  const wallet = await ensureUserWallet(userId);
  const { error } = await db.from('user_wallets').update({ credits: sanitized, updated_at: new Date().toISOString() }).eq('id', wallet.id);

  if (error) {
    throw new Error(error.message || 'Failed to update wallet.');
  }

  return sanitized;
}

export async function applyCreditDelta(
  userId: string,
  deltas: CreditsMap,
  transaction?: { type: 'purchase' | 'usage'; description: string; amount?: number | null; credits?: CreditsMap }
): Promise<CreditsMap> {
  const db = getDb();
  const wallet = await ensureUserWallet(userId);
  const nextCredits: CreditsMap = { ...wallet.credits };

  for (const [modelId, delta] of Object.entries(deltas)) {
    if (!isSafeModelId(modelId)) {
      continue;
    }

    const normalizedDelta = toSafeSignedInt(delta, MAX_CREDIT_DELTA);
    if (normalizedDelta === 0) {
      continue;
    }

    const nextValue = (nextCredits[modelId] || 0) + normalizedDelta;
    if (nextValue < 0) {
      throw new Error('INSUFFICIENT_CREDITS');
    }
    if (nextValue === 0) {
      delete nextCredits[modelId];
    } else {
      nextCredits[modelId] = nextValue;
    }
  }

  const { error: updateError } = await db
    .from('user_wallets')
    .update({ credits: nextCredits, updated_at: new Date().toISOString() })
    .eq('id', wallet.id);

  if (updateError) {
    throw new Error(updateError.message || 'Failed to update wallet.');
  }

  if (transaction) {
    await db.from('transactions').insert({
      user_id: userId,
      type: transaction.type,
      amount: transaction.amount ?? null,
      credits: transaction.credits ?? deltas,
      description: transaction.description.slice(0, 200),
    });
  }

  return nextCredits;
}

export async function consumeModelCredit(userId: string, modelId: string): Promise<CreditsMap> {
  return applyCreditDelta(userId, { [modelId]: -1 }, {
    type: 'usage',
    description: `모델 사용: ${modelId}`,
    credits: { [modelId]: -1 },
  });
}

export async function refundModelCredit(userId: string, modelId: string, amount: number = 1): Promise<CreditsMap> {
  const normalizedAmount = toSafePositiveInt(amount, MAX_CREDIT_DELTA);
  if (normalizedAmount <= 0) {
    return ensureUserWallet(userId).then((wallet) => wallet.credits);
  }

  return applyCreditDelta(userId, { [modelId]: normalizedAmount }, {
    type: 'usage',
    description: `모델 환불: ${modelId}`,
    credits: { [modelId]: normalizedAmount },
  });
}

export async function grantStarterCreditsIfEligible(userId: string): Promise<{ credits: CreditsMap; settings: Record<string, any>; granted: boolean }> {
  const wallet = await ensureUserWallet(userId);
  const existingCredits = sanitizeStoredCredits(wallet.credits);
  const settings = await getUserSettingsData(userId);

  if (Object.keys(existingCredits).length > 0 || settings.hasFirstPurchase) {
    return { credits: existingCredits, settings, granted: false };
  }

  const nextSettings = { ...settings, hasFirstPurchase: true };
  await setWalletCredits(userId, STARTER_CREDITS);
  await saveUserSettingsData(userId, nextSettings);

  return { credits: { ...STARTER_CREDITS }, settings: nextSettings, granted: true };
}

function extractNumericMeta(payload: Record<string, unknown> | null | undefined, key: string): number {
  return toSafePositiveInt(payload?.[key], MAX_CREDIT_DELTA);
}

export function extractPurchaseCredits(payload: Record<string, unknown> | null | undefined): CreditsMap {
  return sanitizeStoredCredits(payload || {});
}

export function extractPendingPurchaseMeta(payload: Record<string, unknown> | null | undefined): { pmcToUse: number; pmcEarn: number } {
  return {
    pmcToUse: extractNumericMeta(payload, '__meta_pmcToUse'),
    pmcEarn: extractNumericMeta(payload, '__meta_pmcEarn'),
  };
}

function buildOrderName(selections: ModelSelection[]): string {
  const first = selections[0];
  if (!first) {
    return 'PickMyAI 크레딧';
  }

  const firstModel = initialModels.find((entry) => entry.id === first.modelId);
  const firstName = firstModel?.displayName || first.modelId;

  if (selections.length === 1) {
    return firstName;
  }

  return `${firstName} 외 ${selections.length - 1}건`;
}

export async function prepareTossPurchase(userId: string, rawSelections: unknown, rawPmcToUse: unknown) {
  const selections = sanitizeSelections(rawSelections);
  if (selections.length === 0) {
    throw new Error('INVALID_SELECTIONS');
  }

  const settings = await getUserSettingsData(userId);
  const hasFirstPurchase = settings.hasFirstPurchase === true;
  const userPlan = sanitizeUserPlan(settings.userPlan);
  const pmcBalance = sanitizePMCBalance(settings.pmcBalance);

  const price = calculatePrice(initialModels, selections, defaultPolicy, !hasFirstPurchase);
  const pmcCalculation = calculatePMCEarn(initialModels, selections, price.finalTotal, userPlan);
  const requestedPmcToUse = toSafePositiveInt(rawPmcToUse, pmcCalculation.maxUsable);
  const pmcToUse = Math.min(requestedPmcToUse, pmcCalculation.maxUsable, pmcBalance.amount);
  const amount = Math.max(100, Math.round(price.finalTotal - pmcToUse));
  const credits = creditsFromSelections(selections);
  const orderId = `order_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
  const orderName = buildOrderName(selections);
  const db = getDb();

  const transactionCredits: Record<string, number> = {
    ...credits,
    __meta_pmcToUse: pmcToUse,
    __meta_pmcEarn: pmcCalculation.earnAmount,
  };

  const { error } = await db.from('transactions').insert({
    user_id: userId,
    type: 'purchase',
    amount,
    credits: transactionCredits,
    description: `${PENDING_TOSS_PURCHASE_PREFIX}${orderId}`,
  });

  if (error) {
    throw new Error(error.message || 'Failed to create purchase intent.');
  }

  return {
    orderId,
    orderName,
    amount,
    credits,
    pmcToUse,
    pmcEarn: pmcCalculation.earnAmount,
  };
}

export async function getPendingTossPurchase(userId: string, orderId: string): Promise<TransactionRecord | null> {
  const db = getDb();
  const { data, error } = await db
    .from('transactions')
    .select('id, amount, credits, description')
    .eq('user_id', userId)
    .eq('description', `${PENDING_TOSS_PURCHASE_PREFIX}${orderId}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load purchase intent.');
  }

  return data || null;
}

export async function isTossPurchaseAlreadyConfirmed(userId: string, orderId: string): Promise<boolean> {
  const db = getDb();
  const { data, error } = await db
    .from('transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('description', `${CONFIRMED_TOSS_PURCHASE_PREFIX}${orderId}`)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to check purchase status.');
  }

  return !!data;
}

export async function markTossPurchaseConfirmed(transactionId: string, orderId: string, credits: CreditsMap, amount: number): Promise<void> {
  const db = getDb();
  const { error } = await db
    .from('transactions')
    .update({
      amount,
      credits,
      description: `${CONFIRMED_TOSS_PURCHASE_PREFIX}${orderId}`,
    })
    .eq('id', transactionId);

  if (error) {
    throw new Error(error.message || 'Failed to finalize purchase.');
  }
}
