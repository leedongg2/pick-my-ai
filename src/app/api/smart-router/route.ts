import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/apiAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const sessionResult = await verifySession(req);
    if (!sessionResult.authenticated || !sessionResult.userId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { question, models, speechLevel, language, premium } = await req.json();

    if (!question?.trim()) {
      return NextResponse.json({ error: '질문이 없습니다.' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API 키가 없습니다.' }, { status: 500 });
    }

    const modelList = (models || []).map((m: any) => `- ${m.id}: ${m.displayName} (${m.description || ''})`).join('\n');
    const resolvedLanguage = language === 'en' || language === 'ja' || language === 'ko' ? language : 'ko';
    const tone = resolvedLanguage === 'en'
      ? (speechLevel === 'informal' ? 'in a short casual tone' : 'in a short polite tone')
      : resolvedLanguage === 'ja'
        ? (speechLevel === 'informal' ? '短くカジュアルな口調で' : '短く丁寧な口調で')
        : (speechLevel === 'informal' ? '반말로 짧게' : '존댓말로 짧게');

    let systemPrompt: string;
    let userPrompt: string;

    if (premium) {
      systemPrompt = resolvedLanguage === 'en'
        ? 'You are an AI model recommendation expert. Analyze the user question and rank the best matching models.'
        : resolvedLanguage === 'ja'
          ? 'あなたはAIモデル推薦の専門家です。ユーザーの質問を分析し、最適なモデルを順位付きで推薦してください。'
          : '당신은 AI 모델 추천 전문가입니다. 사용자의 질문을 분석해서 가장 적합한 AI 모델을 순위별로 추천해주세요.';
      userPrompt = resolvedLanguage === 'en'
        ? `Available AI models:\n${modelList}\n\nUser question: "${question}"\n\nRecommend up to 5 best models ${tone}. Include the exact model name and one-line reason for each. Exclude models that do not fit.`
        : resolvedLanguage === 'ja'
          ? `利用可能なAIモデル一覧:\n${modelList}\n\nユーザーの質問: 「${question}」\n\nこの質問に最適なモデルを1位から最大5位まで${tone}推薦してください。各モデルに正確なモデル名と1行の理由を付けてください。適さないモデルは除外してください。`
          : `사용 가능한 AI 모델 목록:\n${modelList}\n\n사용자 질문: "${question}"\n\n위 질문에 가장 적합한 모델을 1위부터 최대 5위까지 ${tone} 추천해주세요. 각 모델마다 정확한 모델명과 한 줄 이유를 포함하세요. 맞지 않는 모델은 제외하세요.`;
    } else {
      systemPrompt = resolvedLanguage === 'en'
        ? 'You are an AI model recommendation expert. Recommend the single best model in one concise line.'
        : resolvedLanguage === 'ja'
          ? 'あなたはAIモデル推薦の専門家です。最適なモデルを1行で簡潔に推薦してください。'
          : '당신은 AI 모델 추천 전문가입니다. 사용자의 질문에 가장 적합한 AI 모델을 1줄로 추천해주세요.';
      userPrompt = resolvedLanguage === 'en'
        ? `Available AI models:\n${modelList}\n\nUser question: "${question}"\n\nTell me in one line ${tone} which model is best. You must include the exact model name.`
        : resolvedLanguage === 'ja'
          ? `利用可能なAIモデル一覧:\n${modelList}\n\nユーザーの質問: 「${question}」\n\nどのモデルが最適かを${tone}1行だけで答えてください。必ず実際のモデル名を含めてください。`
          : `사용 가능한 AI 모델 목록:\n${modelList}\n\n사용자 질문: "${question}"\n\n${tone} 어떤 모델이 가장 좋을지 1줄로만 말해주세요. 반드시 실제 모델명을 포함하세요.`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-nano',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: premium ? 400 : 80,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `OpenAI 오류: ${err}` }, { status: 500 });
    }

    const data = await response.json();
    const recommendation = data.choices?.[0]?.message?.content?.trim() || '추천을 가져올 수 없습니다.';

    return NextResponse.json({ recommendation });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '오류가 발생했습니다.' }, { status: 500 });
  }
}
