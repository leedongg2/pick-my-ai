import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifySession } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
  try {
    const sessionResult = await verifySession(request);
    
    if (!sessionResult.authenticated || !sessionResult.userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }
    
    const userId = sessionResult.userId;

    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Chat sessions fetch error:', error);
      return NextResponse.json({ error: '채팅 세션을 불러오는데 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ sessions: sessions || [] });
  } catch (error: any) {
    console.error('Chat sessions API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionResult = await verifySession(request);
    
    if (!sessionResult.authenticated || !sessionResult.userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }
    
    const userId = sessionResult.userId;

    const { sessionId, title, messages, isStarred } = await request.json();

    if (!sessionId || !title || !messages) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('chat_sessions')
      .upsert({
        user_id: userId,
        session_id: sessionId,
        title,
        messages,
        is_starred: isStarred || false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,session_id'
      })
      .select();

    if (error) {
      console.error('Chat session save error:', error);
      return NextResponse.json({ error: '채팅 세션 저장에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, session: data?.[0] });
  } catch (error: any) {
    console.error('Chat sessions API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionResult = await verifySession(request);
    
    if (!sessionResult.authenticated || !sessionResult.userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }
    
    const userId = sessionResult.userId;

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId가 필요합니다.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('user_id', userId)
      .eq('session_id', sessionId);

    if (error) {
      console.error('Chat session delete error:', error);
      return NextResponse.json({ error: '채팅 세션 삭제에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Chat sessions API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
