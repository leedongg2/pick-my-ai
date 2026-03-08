import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/adminAuth';
import { createClient } from '@supabase/supabase-js';

const SAFE_SCHEMA_TABLES = new Set(['users', 'user_wallets', 'chat_sessions', 'transactions', 'user_settings']);
const SAFE_ACTIONS = new Set(['deleteUser']);

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

    const { action, data } = await request.json();
    const adminClient = getAdminSupabase();

    if (typeof action !== 'string' || !SAFE_ACTIONS.has(action)) {
      return NextResponse.json({ error: '허용되지 않은 관리자 작업입니다.' }, { status: 403 });
    }

    switch (action) {
      case 'deleteUser': {
        // 사용자 완전 삭제 (auth + public tables)
        const { userId } = data;
        if (typeof userId !== 'string' || !userId.trim()) {
          return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 });
        }
        
        // 1. user_wallets 삭제
        await adminClient.from('user_wallets').delete().eq('user_id', userId);
        
        // 2. chat_sessions 삭제
        await adminClient.from('chat_sessions').delete().eq('user_id', userId);
        
        // 3. users 테이블 삭제
        await adminClient.from('users').delete().eq('id', userId);
        
        // 4. auth.users 삭제
        const { error: authError } = await adminClient.auth.admin.deleteUser(userId);
        
        if (authError) {
          console.error('Auth user deletion error:', authError);
          // 이미 public 테이블은 삭제되었으므로 계속 진행
        }
        
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: '알 수 없는 작업입니다.' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Database admin error:', error);
    return NextResponse.json({ 
      error: error.message || '데이터베이스 작업 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
}

// 테이블 스키마 조회
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');

    if (!table) {
      return NextResponse.json({ error: 'table 파라미터가 필요합니다.' }, { status: 400 });
    }

    if (!SAFE_SCHEMA_TABLES.has(table)) {
      return NextResponse.json({ error: '허용되지 않은 테이블입니다.' }, { status: 403 });
    }

    const adminClient = getAdminSupabase();
    
    // 테이블 스키마 조회
    const { data, error } = await adminClient
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', table)
      .eq('table_schema', 'public');
    
    if (error) throw error;
    
    return NextResponse.json({ success: true, schema: data });
  } catch (error: any) {
    console.error('Schema query error:', error);
    return NextResponse.json({ 
      error: error.message || '스키마 조회 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
}
