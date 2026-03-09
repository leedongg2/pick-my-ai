import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/adminAuth';
import { createClient } from '@supabase/supabase-js';
import { RateLimiter, getClientIp } from '@/lib/rateLimit';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const adminDatabaseRateLimiter = new RateLimiter(20, 5 * 60 * 1000);

// Admin 전용 Supabase 클라이언트 (Service Role)
const getAdminSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase credentials not configured');
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 401 });
    }

    const clientIp = getClientIp(request);
    const rl = adminDatabaseRateLimiter.check(`admin-database:${clientIp}`);
    if (!rl.success) {
      return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
    }

    const { action, data } = body;
    const adminClient = getAdminSupabase();

    if (action !== 'deleteUser') {
      return NextResponse.json({ error: '허용되지 않은 관리자 작업입니다.' }, { status: 403 });
    }

    const userId = data?.userId;

    if (typeof userId !== 'string' || !UUID_PATTERN.test(userId)) {
      return NextResponse.json({ error: '유효하지 않은 사용자 ID입니다.' }, { status: 400 });
    }

    await adminClient.from('user_wallets').delete().eq('user_id', userId);
    await adminClient.from('chat_sessions').delete().eq('user_id', userId);
    await adminClient.from('users').delete().eq('id', userId);

    const { error: authError } = await adminClient.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Auth user deletion error:', authError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Database admin error:', error);
    return NextResponse.json({ 
      error: error.message || '데이터베이스 작업 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
}

// 테이블 스키마 조회
export async function GET() {
  return NextResponse.json({ error: '이 엔드포인트는 비활성화되었습니다.' }, { status: 403 });
}
