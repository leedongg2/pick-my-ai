import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: '유효하지 않은 인증 토큰입니다.' }, { status: 401 });
    }

    const { data: wallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError) {
      if (walletError.code === 'PGRST116') {
        const { data: newWallet, error: createError } = await supabase
          .from('user_wallets')
          .insert({ user_id: user.id, credits: {} })
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
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: '유효하지 않은 인증 토큰입니다.' }, { status: 401 });
    }

    const { credits, type, description } = await request.json();

    if (!credits || typeof credits !== 'object') {
      return NextResponse.json({ error: '크레딧 정보가 필요합니다.' }, { status: 400 });
    }

    const { data: currentWallet, error: fetchError } = await supabase
      .from('user_wallets')
      .select('credits')
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: '지갑 조회 실패' }, { status: 500 });
    }

    const currentCredits = currentWallet.credits || {};
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

    const { data: updatedWallet, error: updateError } = await supabase
      .from('user_wallets')
      .update({ credits: newCredits })
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: '지갑 업데이트 실패' }, { status: 500 });
    }

    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
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
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: '유효하지 않은 인증 토큰입니다.' }, { status: 401 });
    }

    const { credits } = await request.json();

    if (!credits || typeof credits !== 'object') {
      return NextResponse.json({ error: '크레딧 정보가 필요합니다.' }, { status: 400 });
    }

    const { data: updatedWallet, error: updateError } = await supabase
      .from('user_wallets')
      .update({ credits })
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: '지갑 업데이트 실패' }, { status: 500 });
    }

    return NextResponse.json({ wallet: updatedWallet });
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Wallet PATCH error:', error);
    }
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
