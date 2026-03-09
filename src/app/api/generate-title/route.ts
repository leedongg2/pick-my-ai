import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/apiAuth';
import { RateLimiter, getClientIp } from '@/lib/rateLimit';

const GEMINI_API_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(Boolean);

let currentKeyIndex = 0;
const titleRateLimiter = new RateLimiter(10, 60 * 1000);

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);

    if (!session.authenticated || !session.userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const clientIp = getClientIp(req);
    const rateLimitResult = titleRateLimiter.check(`title:${session.userId}:${clientIp}`);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
    }

    const { message } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: '메시지가 필요합니다.' },
        { status: 400 }
      );
    }

    const normalizedMessage = message.trim();

    if (!normalizedMessage || normalizedMessage.length > 4000) {
      return NextResponse.json(
        { error: '메시지 길이가 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    if (GEMINI_API_KEYS.length === 0) {
      return NextResponse.json(
        { error: 'Gemini API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // API 키 로테이션
    const apiKey = GEMINI_API_KEYS[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % GEMINI_API_KEYS.length;

    const prompt = `다음 메시지를 보고 간단명료한 제목을 15글자 이내로 만들어주세요. 
규칙:
- 반드시 15글자 이내
- "~한다", "~하기" 같은 동사형 종결어미 사용 금지
- 명사형으로 끝내기 (예: "날씨 정보", "Python 기초")
- 이모지 사용 금지
- 따옴표 사용 금지
- 핵심 키워드만 간결하게

메시지: "${normalizedMessage}"

제목:`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 50,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      if (process.env.NODE_ENV !== 'production') {
        console.error('Gemini API 에러:', errorText);
      }
      throw new Error('제목 생성 실패');
    }

    const data = await response.json();
    const generatedTitle = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!generatedTitle) {
      throw new Error('제목을 생성할 수 없습니다.');
    }

    // 15글자 제한 강제
    const finalTitle = generatedTitle.slice(0, 15);

    return NextResponse.json({ title: finalTitle });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('제목 생성 에러:', error);
    }
    return NextResponse.json(
      { error: '제목 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
