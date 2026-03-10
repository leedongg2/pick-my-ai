import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/adminAuth';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

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

    const { action, table, data, filters } = await request.json();
    const adminClient = getAdminSupabase();

    switch (action) {
      case 'list': {
        // 테이블 데이터 조회
        let query = adminClient.from(table).select('*');
        
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
        }
        
        const { data: results, error } = await query;
        
        if (error) throw error;
        
        return NextResponse.json({ success: true, data: results });
      }

      case 'insert': {
        // 데이터 삽입
        const { data: result, error } = await adminClient
          .from(table)
          .insert(data)
          .select();
        
        if (error) throw error;
        
        return NextResponse.json({ success: true, data: result });
      }

      case 'update': {
        // 데이터 업데이트
        const { id, updates } = data;
        const { data: result, error } = await adminClient
          .from(table)
          .update(updates)
          .eq('id', id)
          .select();
        
        if (error) throw error;
        
        return NextResponse.json({ success: true, data: result });
      }

      case 'delete': {
        // 데이터 삭제
        const { id } = data;
        const { error } = await adminClient
          .from(table)
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        return NextResponse.json({ success: true });
      }

      case 'deleteUser': {
        // 사용자 완전 삭제 (auth + public tables)
        const { userId } = data;
        
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

      case 'listTables': {
        // 모든 테이블 목록 조회
        const { data: tables, error } = await adminClient
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public');
        
        if (error) throw error;
        
        return NextResponse.json({ success: true, data: tables });
      }

      case 'executeSQL': {
        // 직접 SQL 실행 (매우 위험 - 신중하게 사용)
        const { sql } = data;
        const { data: result, error } = await adminClient.rpc('exec_sql', { sql_query: sql });
        
        if (error) throw error;
        
        return NextResponse.json({ success: true, data: result });
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
