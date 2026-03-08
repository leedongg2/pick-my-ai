import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdminToken } from '@/lib/adminAuth';
import { getOrCreateWallet, normalizeCreditsMap, type WalletCredits } from '@/lib/serverWallet';
import { securityLogger } from '@/lib/securityLogger';
import { securityLog } from '@/lib/security';

const USER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MODEL_ID_PATTERN = /^[a-zA-Z0-9:_-]{1,64}$/;
const MAX_CREDIT_MODELS = 128;
const MAX_CREDITS_PER_MODEL = 100000;
const MAX_TOTAL_CREDITS = 1000000;

type AuthorizedAdminRequest = {
  ip?: string;
  token: string;
  tokenFingerprint: string;
  userAgent?: string;
};

function getClientIp(request: NextRequest): string | undefined {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  return realIp || undefined;
}

function getTokenFingerprint(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex').slice(0, 16);
}

function authorizeAdminRequest(
  request: NextRequest,
  resource: string
): { authorized: true; context: AuthorizedAdminRequest } | { authorized: false; response: NextResponse } {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || undefined;
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    securityLogger.logUnauthorizedAccess(undefined, ip, resource);
    securityLog('warn', 'Admin route access denied: missing bearer token', { ip, resource, userAgent });
    return {
      authorized: false,
      response: NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 }),
    };
  }

  const token = authHeader.substring(7).trim();
  if (!token || !verifyAdminToken(token)) {
    securityLogger.logUnauthorizedAccess(undefined, ip, resource);
    securityLog('warn', 'Admin route access denied: invalid token', {
      ip,
      resource,
      tokenFingerprint: token ? getTokenFingerprint(token) : undefined,
      userAgent,
    });
    return {
      authorized: false,
      response: NextResponse.json({ error: '유효하지 않거나 만료된 토큰입니다.' }, { status: 401 }),
    };
  }

  return {
    authorized: true,
    context: {
      ip,
      token,
      tokenFingerprint: getTokenFingerprint(token),
      userAgent,
    },
  };
}

function validateCreditsPayload(
  credits: unknown
): { ok: true; normalized: WalletCredits; totalCredits: number } | { ok: false; error: string; reason: string } {
  if (!credits || typeof credits !== 'object' || Array.isArray(credits)) {
    return { ok: false, error: '크레딧 형식이 올바르지 않습니다.', reason: 'credits must be a plain object' };
  }

  const entries = Object.entries(credits as Record<string, unknown>);
  if (entries.length > MAX_CREDIT_MODELS) {
    return { ok: false, error: '한 번에 수정할 수 있는 모델 수를 초과했습니다.', reason: 'too many credit models' };
  }

  const sanitized: Record<string, number> = {};
  let totalCredits = 0;

  for (const [rawModelId, rawValue] of entries) {
    const modelId = rawModelId.trim();
    if (!MODEL_ID_PATTERN.test(modelId)) {
      return { ok: false, error: '유효하지 않은 모델 ID가 포함되어 있습니다.', reason: `invalid model id: ${rawModelId}` };
    }

    if (typeof rawValue !== 'number' || !Number.isFinite(rawValue) || !Number.isInteger(rawValue)) {
      return { ok: false, error: '크레딧 값은 정수여야 합니다.', reason: `non-integer credit value for ${modelId}` };
    }

    if (rawValue < 0) {
      return { ok: false, error: '크레딧 값은 0 이상이어야 합니다.', reason: `negative credit value for ${modelId}` };
    }

    if (rawValue > MAX_CREDITS_PER_MODEL) {
      return { ok: false, error: '모델별 크레딧 한도를 초과했습니다.', reason: `credit value too large for ${modelId}` };
    }

    totalCredits += rawValue;
    if (totalCredits > MAX_TOTAL_CREDITS) {
      return { ok: false, error: '전체 크레딧 합계가 허용 범위를 초과했습니다.', reason: 'total credit limit exceeded' };
    }

    sanitized[modelId] = rawValue;
  }

  return {
    ok: true,
    normalized: normalizeCreditsMap(sanitized),
    totalCredits,
  };
}

function diffCredits(before: WalletCredits, after: WalletCredits): WalletCredits {
  const diff: WalletCredits = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of keys) {
    const delta = (after[key] || 0) - (before[key] || 0);
    if (delta !== 0) {
      diff[key] = delta;
    }
  }

  return diff;
}

// 모든 유저와 크레딧 정보 조회
export async function GET(request: NextRequest) {
  try {
    // 관리자 권한 확인 (토큰 검증)
    const auth = authorizeAdminRequest(request, 'admin/users:GET');
    if (!auth.authorized) {
      return auth.response;
    }

    // users와 user_wallets 조인하여 조회 (관리자 권한으로)
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        name,
        created_at,
        user_wallets (
          credits,
          updated_at
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      securityLog('error', 'Admin users GET failed', {
        error: error.message,
        ip: auth.context.ip,
        resource: 'admin/users:GET',
        tokenFingerprint: auth.context.tokenFingerprint,
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 특정 유저의 크레딧 수정
export async function PATCH(request: NextRequest) {
  try {
    // 관리자 권한 확인 (토큰 검증)
    const auth = authorizeAdminRequest(request, 'admin/users:PATCH');
    if (!auth.authorized) {
      return auth.response;
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      securityLogger.logInvalidInput(undefined, auth.context.ip, {
        contentType,
        endpoint: 'admin/users:PATCH',
        reason: 'non-json content type',
      });
      return NextResponse.json({ error: 'JSON 요청만 허용됩니다.' }, { status: 415 });
    }

    let payload: any;
    try {
      payload = await request.json();
    } catch {
      securityLogger.logInvalidInput(undefined, auth.context.ip, {
        endpoint: 'admin/users:PATCH',
        reason: 'invalid json body',
      });
      return NextResponse.json({ error: '요청 본문을 해석할 수 없습니다.' }, { status: 400 });
    }

    const userId = typeof payload?.userId === 'string' ? payload.userId.trim() : '';
    const credits = payload?.credits;

    if (!userId || !USER_ID_PATTERN.test(userId)) {
      securityLogger.logInvalidInput(undefined, auth.context.ip, {
        endpoint: 'admin/users:PATCH',
        reason: 'invalid userId',
        userId,
      });
      return NextResponse.json({ error: '유효한 사용자 ID가 필요합니다.' }, { status: 400 });
    }

    const validatedCredits = validateCreditsPayload(credits);
    if (!validatedCredits.ok) {
      securityLogger.logInvalidInput(undefined, auth.context.ip, {
        endpoint: 'admin/users:PATCH',
        reason: validatedCredits.reason,
        targetUserId: userId,
      });
      securityLog('warn', 'Admin credit update rejected by validation', {
        ip: auth.context.ip,
        reason: validatedCredits.reason,
        resource: 'admin/users:PATCH',
        targetUserId: userId,
        tokenFingerprint: auth.context.tokenFingerprint,
      });
      return NextResponse.json({ error: validatedCredits.error }, { status: 400 });
    }

    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      console.error('Supabase user lookup error:', userError);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    if (!userRecord) {
      securityLogger.logInvalidInput(undefined, auth.context.ip, {
        endpoint: 'admin/users:PATCH',
        reason: 'user not found',
        targetUserId: userId,
      });
      return NextResponse.json({ error: '대상 사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    const currentWallet = await getOrCreateWallet(userId);
    const currentCredits = currentWallet.credits || {};
    const nextCredits = validatedCredits.normalized;
    const creditDiff = diffCredits(currentCredits, nextCredits);
    const changedModelIds = Object.keys(creditDiff);

    if (changedModelIds.length === 0) {
      securityLog('info', 'Admin credit update skipped because no changes were detected', {
        ip: auth.context.ip,
        resource: 'admin/users:PATCH',
        targetUserId: userId,
        tokenFingerprint: auth.context.tokenFingerprint,
      });
      return NextResponse.json({ success: true, changed: false, data: currentWallet });
    }

    const totalAbsoluteDelta = Object.values(creditDiff).reduce((sum, value) => sum + Math.abs(value), 0);
    if (totalAbsoluteDelta > MAX_TOTAL_CREDITS) {
      securityLogger.logSuspiciousActivity({
        endpoint: 'admin/users:PATCH',
        reason: 'absolute delta exceeds threshold',
        targetUserId: userId,
        totalAbsoluteDelta,
      }, auth.context.ip);
      return NextResponse.json({ error: '변경량이 허용 범위를 초과했습니다.' }, { status: 400 });
    }

    if (!changedModelIds.length) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
    }

    // user_wallets 테이블 업데이트 (관리자 권한으로)
    const { data, error } = await supabaseAdmin
      .from('user_wallets')
      .update({
        credits: nextCredits,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      securityLog('error', 'Admin credit update failed', {
        error: error.message,
        ip: auth.context.ip,
        resource: 'admin/users:PATCH',
        targetUserEmail: userRecord.email,
        targetUserId: userId,
        tokenFingerprint: auth.context.tokenFingerprint,
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const auditDescription = [
      'admin_override',
      userId,
      new Date().toISOString(),
      auth.context.tokenFingerprint,
    ].join(':');

    const { error: auditInsertError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'purchase',
        amount: 0,
        credits: creditDiff,
        description: auditDescription,
      });

    if (auditInsertError) {
      await supabaseAdmin
        .from('user_wallets')
        .update({
          credits: currentCredits,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      securityLog('error', 'Admin credit update rolled back due to missing audit log', {
        error: auditInsertError.message,
        ip: auth.context.ip,
        resource: 'admin/users:PATCH',
        targetUserEmail: userRecord.email,
        targetUserId: userId,
        tokenFingerprint: auth.context.tokenFingerprint,
      });

      return NextResponse.json({ error: '감사 로그 저장에 실패해 변경을 취소했습니다.' }, { status: 500 });
    }

    securityLog('info', 'Admin credit override applied', {
      auditDescription,
      changedModelIds,
      creditDiff,
      ip: auth.context.ip,
      resource: 'admin/users:PATCH',
      targetUserEmail: userRecord.email,
      targetUserId: userId,
      tokenFingerprint: auth.context.tokenFingerprint,
      totalAbsoluteDelta,
      totalCreditsAfter: validatedCredits.totalCredits,
      userAgent: auth.context.userAgent,
    });

    if (totalAbsoluteDelta >= 1000 || changedModelIds.length >= 20) {
      securityLogger.logSuspiciousActivity({
        changedModelIds,
        creditDiff,
        endpoint: 'admin/users:PATCH',
        reason: 'large admin credit override',
        targetUserId: userId,
        tokenFingerprint: auth.context.tokenFingerprint,
        totalAbsoluteDelta,
      }, auth.context.ip);
    }

    return NextResponse.json({ success: true, changed: true, data, diff: creditDiff });
  } catch (error: any) {
    console.error('Error updating credits:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
