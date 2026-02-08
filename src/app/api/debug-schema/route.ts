import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySession } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
  // 개발/디버그 용도 - 프로덕션에서도 인증 필요
  const session = await verifySession(request);
  if (!session.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  const db = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

  const results: Record<string, any> = {
    userId: session.userId,
    email: session.email,
  };

  // users 테이블 확인
  try {
    const { data, error } = await db.from('users').select('*').eq('id', session.userId!).single();
    results.users_by_id = { data, error: error?.message, code: error?.code };
  } catch (e: any) {
    results.users_by_id = { error: e.message };
  }

  // email로도 확인
  try {
    const { data, error } = await db.from('users').select('*').eq('email', session.email!).single();
    results.users_by_email = { data, error: error?.message, code: error?.code };
  } catch (e: any) {
    results.users_by_email = { error: e.message };
  }

  // user_wallets 확인
  try {
    const { data, error } = await db.from('user_wallets').select('*').eq('user_id', session.userId!).single();
    results.wallet = { data, error: error?.message, code: error?.code };
  } catch (e: any) {
    results.wallet = { error: e.message };
  }

  // user_settings 확인
  try {
    const { data, error } = await db.from('user_settings').select('*').eq('user_id', session.userId!).single();
    results.settings = { data, error: error?.message, code: error?.code };
  } catch (e: any) {
    results.settings = { error: e.message };
  }

  // 테스트: users에 insert 시도
  try {
    const { data, error } = await db.from('users').insert({
      id: session.userId!,
      email: session.email!,
      name: session.name || 'Test',
    }).select().single();
    results.test_user_insert = { data, error: error?.message, code: error?.code, details: error?.details, hint: error?.hint };
  } catch (e: any) {
    results.test_user_insert = { error: e.message };
  }

  return NextResponse.json(results);
}
