import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySession } from '@/lib/apiAuth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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

    const db = getSupabaseAdmin();

    const { data: wallet, error: walletError } = await db
      .from('user_wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (walletError) {
      if (walletError.code === 'PGRST116') {
        const { data: newWallet, error: createError } = await db
          .from('user_wallets')
          .insert({ user_id: userId, credits: {} })
          .select()
          .single();

        if (createError) {
          return NextResponse.json({ error: '지갑 생성 실패' }, { status: 500 });
        }

        return NextResponse.json({ wallet: newWallet });
      }
      return NextResponse.json({ error: '지갑 조회 실패' }, { status: 500 });
    }

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

    const db = getSupabaseAdmin();

    const { credits, type, description } = await request.json();

    if (!credits || typeof credits !== 'object') {
      return NextResponse.json({ error: '크레딧 정보가 필요합니다.' }, { status: 400 });
    }

    const { data: currentWallet, error: fetchError } = await db
      .from('user_wallets')
      .select('credits')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Wallet POST fetch error:', fetchError);
      }
      return NextResponse.json({ error: '지갑 조회 실패' }, { status: 500 });
    }

    const currentCredits = currentWallet?.credits || {};
    const newCredits = { ...currentCredits };

    Object.entries(credits).forEach(([modelId, amount]) => {
      const numAmount = Number(amount);
      if (!isNaN(numAmount)) {
        newCredits[modelId] = (newCredits[modelId] || 0) + numAmount;
        if (newCredits[modelId] <= 0) {
          delete newCredits[modelId];
        }
      }
    });

    // user_wallets.user_id에 unique 제약이 없을 수 있으므로 upsert(onConflict)를 피함
    const { data: updatedWallet, error: updateError } = fetchError?.code === 'PGRST116'
      ? await db
          .from('user_wallets')
          .insert({ user_id: userId, credits: newCredits })
          .select()
          .single()
      : await db
          .from('user_wallets')
          .update({ credits: newCredits, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .select()
          .single();

    if (updateError) {
      return NextResponse.json({ error: '지갑 업데이트 실패' }, { status: 500 });
    }

    const { error: txError } = await db
      .from('transactions')
      .insert({
        user_id: userId,
        type: type || 'purchase',
        credits: credits,
        description: description || '크레딧 변경',
      });

    if (txError && process.env.NODE_ENV !== 'production') {
      console.error('Transaction insert error:', txError);
    }

    return NextResponse.json({ wallet: updatedWallet });
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
    
    const userId = sessionResult.userId;

    const db = getSupabaseAdmin();

    const { credits } = await request.json();

    if (!credits || typeof credits !== 'object') {
      return NextResponse.json({ error: '크레딧 정보가 필요합니다.' }, { status: 400 });
    }

    // user_wallets.user_id에 unique 제약이 없을 수 있으므로 upsert(onConflict)를 피함
    const { data: updatedWallet, error: updateError } = await db
      .from('user_wallets')
      .update({ credits, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError?.code === 'PGRST116') {
      const insertResult = await db
        .from('user_wallets')
        .insert({ user_id: userId, credits })
        .select()
        .single();
      if (insertResult.error) {
        return NextResponse.json({ error: '지갑 업데이트 실패' }, { status: 500 });
      }
      return NextResponse.json({ wallet: insertResult.data });
    }

    if (updateError) {
      return NextResponse.json({ error: '지갑 업데이트 실패' }, { status: 500 });
    }

    return NextResponse.json({ wallet: updatedWallet });
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Wallet PATCH error:', error);
    }
    return NextResponse.json({ error: error?.message || '서버 오류' }, { status: 500 });
  }
}
