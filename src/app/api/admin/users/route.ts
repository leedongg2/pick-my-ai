import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdminToken } from '@/lib/adminAuth';
import { RateLimiter, getClientIp } from '@/lib/rateLimit';
import { sanitizeStoredCredits } from '@/lib/walletSecurity';

const adminUsersRateLimiter = new RateLimiter(60, 5 * 60 * 1000);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// 모든 유저와 크레딧 정보 조회
export async function GET(request: NextRequest) {
  try {
    // 관리자 권한 확인 (토큰 검증)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 });
    }

    const token = authHeader.substring(7); // 'Bearer ' 제거
    if (!verifyAdminToken(token)) {
      return NextResponse.json({ error: '유효하지 않거나 만료된 토큰입니다.' }, { status: 401 });
    }

    const clientIp = getClientIp(request);
    const rl = adminUsersRateLimiter.check(`admin-users:get:${clientIp}`);
    if (!rl.success) {
      return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429 });
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
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 });
    }

    const token = authHeader.substring(7); // 'Bearer ' 제거
    if (!verifyAdminToken(token)) {
      return NextResponse.json({ error: '유효하지 않거나 만료된 토큰입니다.' }, { status: 401 });
    }

    const clientIp = getClientIp(request);
    const rl = adminUsersRateLimiter.check(`admin-users:patch:${clientIp}`);
    if (!rl.success) {
      return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429 });
    }

    const { userId, credits } = await request.json();
    const normalizedUserId = typeof userId === 'string' ? userId.trim() : '';
    const sanitizedCredits = sanitizeStoredCredits(credits);

    if (!normalizedUserId || !UUID_PATTERN.test(normalizedUserId) || !credits || typeof credits !== 'object' || Array.isArray(credits)) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
    }

    // user_wallets 테이블 업데이트 (관리자 권한으로)
    const { data, error } = await supabaseAdmin
      .from('user_wallets')
      .update({
        credits: sanitizedCredits,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', normalizedUserId)
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error updating credits:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
