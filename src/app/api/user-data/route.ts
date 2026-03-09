import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySession } from '@/lib/apiAuth';
import { RateLimiter, getClientIp } from '@/lib/rateLimit';
import { getUserSettingsData, grantStarterCreditsIfEligible, sanitizePMCBalance, sanitizeUserPlan } from '@/lib/walletSecurity';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const userDataRateLimiter = new RateLimiter(40, 5 * 60 * 1000);

function getSupabaseAdmin() {
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.');
  }
  if (!supabaseAnonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다.');
  }
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다. (Netlify 환경변수에 추가 필요)');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * GET /api/user-data
 * 로그인 시 사용자의 모든 영속 데이터를 한 번에 로드
 */
export async function GET(request: NextRequest) {
  try {
    const session = await verifySession(request);
    if (!session.authenticated || !session.userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const clientIp = getClientIp(request);
    const rl = userDataRateLimiter.check(`${session.userId}:${clientIp}:user-data:get`);
    if (!rl.success) {
      return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429 });
    }

    const userId = session.userId;
    let credits = {};
    let settings: Record<string, any> | null = null;

    try {
      const starterResult = await grantStarterCreditsIfEligible(userId);
      credits = starterResult.credits;
      settings = starterResult.settings;
    } catch {
      // 지갑 테이블 접근 실패 시 무시
    }

    if (!settings) {
      try {
        settings = await getUserSettingsData(userId);
      } catch {
        // user_settings 테이블이 없으면 무시
      }
    }

    return NextResponse.json({
      credits,
      settings,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('user-data GET error:', error);
    }
    return NextResponse.json({ error: (error as any)?.message || '서버 오류' }, { status: 500 });
  }
}

/**
 * POST /api/user-data
 * 사용자 설정 데이터를 Supabase에 저장 (upsert)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await verifySession(request);
    if (!session.authenticated || !session.userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const clientIp = getClientIp(request);
    const rl = userDataRateLimiter.check(`${session.userId}:${clientIp}:user-data:post`);
    if (!rl.success) {
      return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429 });
    }

    const userId = session.userId;
    const body = await request.json().catch(() => null);
    const db = getSupabaseAdmin();

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
    }

    // settings 데이터 저장 (upsert)
    if (body.settings !== undefined) {
      try {
        const incomingSettings = (typeof body.settings === 'object' && body.settings !== null && !Array.isArray(body.settings))
          ? body.settings as Record<string, any>
          : {};
        if (JSON.stringify(incomingSettings).length > 500000) {
          return NextResponse.json({ error: '설정 데이터가 너무 큽니다.' }, { status: 413 });
        }
        const currentSettings: Record<string, any> = await getUserSettingsData(userId).catch(() => ({}));
        const nextSettings = {
          ...currentSettings,
          ...incomingSettings,
          hasFirstPurchase: currentSettings.hasFirstPurchase,
          pmcBalance: sanitizePMCBalance(currentSettings.pmcBalance),
          userPlan: sanitizeUserPlan(currentSettings.userPlan),
          smartRouterPurchased: currentSettings.smartRouterPurchased === true,
          smartRouterFreeUsed: currentSettings.smartRouterFreeUsed === true,
          insurancePurchased: currentSettings.insurancePurchased === true,
          insurancePurchaseDate: typeof currentSettings.insurancePurchaseDate === 'string'
            ? currentSettings.insurancePurchaseDate
            : null,
        };

        const { error } = await db
          .from('user_settings')
          .upsert(
            { user_id: userId, data: nextSettings, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
          );

        if (error) {
          // 테이블이 없으면 생성 시도
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            // 테이블 없음 - 무시 (Supabase 대시보드에서 생성 필요)
            if (process.env.NODE_ENV !== 'production') {
              console.warn('user_settings 테이블이 없습니다. Supabase 대시보드에서 생성하세요.');
            }
          } else {
            if (process.env.NODE_ENV !== 'production') {
              console.error('user_settings upsert error:', error);
            }
          }
        }
      } catch {
        // 테이블 접근 실패 시 무시
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('user-data POST error:', error);
    }
    return NextResponse.json({ error: (error as any)?.message || '서버 오류' }, { status: 500 });
  }
}
