import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/apiAuth';
import { getOrCreateWallet, grantWelcomeCreditsIfEligible } from '@/lib/serverWallet';

export async function GET(request: NextRequest) {
  try {
    const sessionResult = await verifySession(request);
    
    if (!sessionResult.authenticated || !sessionResult.userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }
    
    const userId = sessionResult.userId;

    const wallet = await getOrCreateWallet(userId);
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

    const body = await request.json().catch(() => null);
    if (body?.action !== 'grant_welcome_credits') {
      return NextResponse.json({ error: '허용되지 않은 지갑 변경 요청입니다.' }, { status: 403 });
    }

    const result = await grantWelcomeCreditsIfEligible(userId);
    return NextResponse.json({ wallet: result.wallet, granted: result.granted });
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Wallet POST error:', error);
    }
    return NextResponse.json({ error: error?.message || '서버 오류' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    return NextResponse.json({ error: '직접 지갑 덮어쓰기는 허용되지 않습니다.' }, { status: 403 });
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Wallet PATCH error:', error);
    }
    return NextResponse.json({ error: error?.message || '서버 오류' }, { status: 500 });
  }
}
