import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySession } from '@/lib/apiAuth';
import { RateLimiter, getClientIp } from '@/lib/rateLimit';
import { applyCreditDelta, ensureUserWallet, sanitizeUsageDeltas } from '@/lib/walletSecurity';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const walletRateLimiter = new RateLimiter(30, 5 * 60 * 1000);

function getSupabaseAdmin() {
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.');
  }
  if (!supabaseAnonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다.');
  }
  // 지갑/트랜잭션 API는 서버에서 DB를 직접 갱신하므로 service role이 필요합니다.
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다. (Netlify 환경변수에 추가 필요)');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: NextRequest) {
  try {
    const sessionResult = await verifySession(request);
    
    if (!sessionResult.authenticated || !sessionResult.userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }
    
    const userId = sessionResult.userId;
    const clientIp = getClientIp(request);
    const rl = walletRateLimiter.check(`${userId}:${clientIp}:wallet:get`);
    if (!rl.success) {
      return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429 });
    }

    const wallet = await ensureUserWallet(userId);

    return NextResponse.json({ wallet });
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Wallet GET error:', error);
    }
    return NextResponse.json({ error: error?.message || '서버 오류' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionResult = await verifySession(request);
    
    if (!sessionResult.authenticated || !sessionResult.userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }
    
    const userId = sessionResult.userId;
    const clientIp = getClientIp(request);
    const rl = walletRateLimiter.check(`${userId}:${clientIp}:wallet:post`);
    if (!rl.success) {
      return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429 });
    }

    const { credits, type, description } = await request.json();
    const usageDeltas = sanitizeUsageDeltas(credits);
    const normalizedDescription = typeof description === 'string' && description.trim()
      ? description.trim().slice(0, 200)
      : '크레딧 사용';

    if (Object.keys(usageDeltas).length === 0) {
      return NextResponse.json({ error: '크레딧 정보가 필요합니다.' }, { status: 400 });
    }

    if (type && type !== 'usage') {
      return NextResponse.json({ error: '허용되지 않은 지갑 변경입니다.' }, { status: 403 });
    }

    try {
      const nextCredits = await applyCreditDelta(userId, usageDeltas, {
        type: 'usage',
        description: normalizedDescription,
        credits: usageDeltas,
      });
      return NextResponse.json({ wallet: { userId, credits: nextCredits } });
    } catch (walletError: any) {
      if (walletError?.message === 'INSUFFICIENT_CREDITS') {
        return NextResponse.json({ error: '크레딧이 부족합니다.' }, { status: 409 });
      }
      throw walletError;
    }
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Wallet POST error:', error);
    }
    return NextResponse.json({ error: error?.message || '서버 오류' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionResult = await verifySession(request);
    
    if (!sessionResult.authenticated || !sessionResult.userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const clientIp = getClientIp(request);
    const rl = walletRateLimiter.check(`${sessionResult.userId}:${clientIp}:wallet:patch`);
    if (!rl.success) {
      return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429 });
    }

    return NextResponse.json({ error: '직접 지갑 재작성은 허용되지 않습니다.' }, { status: 403 });
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Wallet PATCH error:', error);
    }
    return NextResponse.json({ error: error?.message || '서버 오류' }, { status: 500 });
  }
}
