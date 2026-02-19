import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySession } from '@/lib/apiAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getDb() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET /api/batch/status?sessionId=xxx&messageId=xxx
export async function GET(request: NextRequest) {
  try {
    const session = await verifySession(request);
    if (!session.authenticated || !session.userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const messageId = searchParams.get('messageId');

    if (!sessionId || !messageId) {
      return NextResponse.json({ error: 'sessionId, messageId 필요' }, { status: 400 });
    }

    const db = getDb();
    const { data, error } = await db
      .from('batch_requests')
      .select('status, result, error_message, completed_at')
      .eq('user_id', session.userId)
      .eq('session_id', sessionId)
      .eq('message_id', messageId)
      .single();

    if (error || !data) {
      return NextResponse.json({ status: 'not_found' });
    }

    return NextResponse.json({
      status: data.status,
      result: data.result || null,
      errorMessage: data.error_message || null,
      completedAt: data.completed_at || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
