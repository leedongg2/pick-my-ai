import { NextRequest, NextResponse } from 'next/server';
import { generateAdminToken, verifyAdminPassword, recordLoginAttempt, isIPLocked } from '@/lib/adminAuth';
import { getClientIp } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const clientIp = getClientIp(request);

    if (!password) {
      return NextResponse.json({ error: '비밀번호를 입력해주세요.' }, { status: 400 });
    }

    // IP 잠금 상태 확인
    const lockStatus = isIPLocked(clientIp);
    if (lockStatus.locked) {
      const remainingTime = Math.ceil((lockStatus.lockedUntil! - Date.now()) / 1000 / 60);
      return NextResponse.json({ 
        error: `너무 많은 로그인 시도로 인해 계정이 잠겼습니다. ${remainingTime}분 후에 다시 시도해주세요.`,
        locked: true,
        lockedUntil: lockStatus.lockedUntil
      }, { status: 429 });
    }

    // 비밀번호 검증
    const isValid = verifyAdminPassword(password);

    // 로그인 시도 기록
    const attemptResult = recordLoginAttempt(clientIp, isValid);

    if (!isValid) {
      if (!attemptResult.allowed) {
        const remainingTime = Math.ceil((attemptResult.lockedUntil! - Date.now()) / 1000 / 60);
        return NextResponse.json({ 
          error: `비밀번호가 올바르지 않습니다. 너무 많은 시도로 인해 계정이 잠겼습니다. ${remainingTime}분 후에 다시 시도해주세요.`,
          locked: true,
          lockedUntil: attemptResult.lockedUntil
        }, { status: 429 });
      }

      return NextResponse.json({ 
        error: `비밀번호가 올바르지 않습니다. (남은 시도: ${attemptResult.remainingAttempts}회)`,
        remainingAttempts: attemptResult.remainingAttempts
      }, { status: 401 });
    }

    // 토큰 생성 (24시간 유효)
    const token = generateAdminToken();

    return NextResponse.json({ 
      success: true, 
      token,
      expiresIn: 24 * 60 * 60 * 1000 // 24시간 (밀리초)
    });
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: '로그인 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
