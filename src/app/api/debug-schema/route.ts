import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ error: '이 엔드포인트는 비활성화되었습니다.' }, { status: 403 });
}
