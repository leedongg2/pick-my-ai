import { NextRequest, NextResponse } from 'next/server';
import { generateAdminToken } from '@/lib/adminAuth';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-this-password';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: '비밀번호를 입력해주세요.' }, { status: 400 });
    }

    // 환경변수의 관리자 비밀번호와 비교
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
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
