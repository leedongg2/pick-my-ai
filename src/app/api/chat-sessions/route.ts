import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifySession } from '@/lib/apiAuth';
import { RateLimiter, getClientIp } from '@/lib/rateLimit';

const chatSessionsRateLimiter = new RateLimiter(60, 5 * 60 * 1000);
const SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;
const MAX_TITLE_LENGTH = 200;
const MAX_MESSAGES = 500;
const MAX_MESSAGES_JSON_LENGTH = 2_000_000;

export async function GET(request: NextRequest) {
  try {
    const sessionResult = await verifySession(request);
    
    if (!sessionResult.authenticated || !sessionResult.userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }
    
    const userId = sessionResult.userId;
    const clientIp = getClientIp(request);
    const rl = chatSessionsRateLimiter.check(`${userId}:${clientIp}:chat-sessions:get`);

    if (!rl.success) {
      return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429 });
    }

    const { data: sessions, error } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Chat sessions fetch error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json({ error: '채팅 세션을 불러오는데 실패했습니다.', code: error.code, hint: error.hint }, { status: 500 });
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
    const clientIp = getClientIp(request);
    const rl = chatSessionsRateLimiter.check(`${userId}:${clientIp}:chat-sessions:post`);

    if (!rl.success) {
      return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429 });
    }

    const { sessionId, title, messages, isStarred } = await request.json();

    const normalizedSessionId = typeof sessionId === 'string' ? sessionId.trim() : '';
    const normalizedTitle = typeof title === 'string' ? title.trim() : '';
    const normalizedMessages = Array.isArray(messages) ? messages.slice(0, MAX_MESSAGES) : null;
    const serializedMessages = normalizedMessages ? JSON.stringify(normalizedMessages) : '';

    if (
      !normalizedSessionId ||
      !SESSION_ID_PATTERN.test(normalizedSessionId) ||
      !normalizedTitle ||
      normalizedTitle.length > MAX_TITLE_LENGTH ||
      !normalizedMessages ||
      serializedMessages.length > MAX_MESSAGES_JSON_LENGTH
    ) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('chat_sessions')
      .upsert({
        user_id: userId,
        session_id: normalizedSessionId,
        title: normalizedTitle,
        messages: normalizedMessages,
        is_starred: Boolean(isStarred),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,session_id'
      })
      .select();

    if (error) {
      console.error('Chat session save error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json({ error: '채팅 세션 저장에 실패했습니다.', code: error.code, hint: error.hint }, { status: 500 });
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
    const clientIp = getClientIp(request);
    const rl = chatSessionsRateLimiter.check(`${userId}:${clientIp}:chat-sessions:delete`);

    if (!rl.success) {
      return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429 });
    }

    const { sessionId } = await request.json();
    const normalizedSessionId = typeof sessionId === 'string' ? sessionId.trim() : '';

    if (!normalizedSessionId || !SESSION_ID_PATTERN.test(normalizedSessionId)) {
      return NextResponse.json({ error: 'sessionId가 필요합니다.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('chat_sessions')
      .delete()
      .eq('user_id', userId)
      .eq('session_id', normalizedSessionId);

    if (error) {
      console.error('Chat session delete error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json({ error: '채팅 세션 삭제에 실패했습니다.', code: error.code, hint: error.hint }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Chat sessions API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
