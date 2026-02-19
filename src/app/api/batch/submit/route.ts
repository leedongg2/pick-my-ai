import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySession } from '@/lib/apiAuth';
import { RateLimiter, getClientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getDb() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

const batchRateLimiter = new RateLimiter(10, 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rl = batchRateLimiter.check(clientIp);
    if (!rl.success) {
      return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
    }

    const session = await verifySession(request);
    if (!session.authenticated || !session.userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { modelId, messages, sessionId, messageId, language, speechLevel } = await request.json();

    if (!modelId || !messages || !sessionId || !messageId) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const db = getDb();

    // batch_requests 테이블에 저장
    const { error } = await db.from('batch_requests').insert({
      user_id: session.userId,
      model_id: modelId,
      session_id: sessionId,
      message_id: messageId,
      messages: messages,
      language: language || 'ko',
      speech_level: speechLevel || 'formal',
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[Batch Submit] DB error:', error);
      return NextResponse.json({ error: 'DB 저장 실패' }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: 'pending' });
  } catch (err: any) {
    console.error('[Batch Submit] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
