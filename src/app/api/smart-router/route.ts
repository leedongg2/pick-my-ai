import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/apiAuth';
import { getOpenAIStatus } from '@/lib/openaiStatusServer';
import { getOpenAIStatusBlockedMessage, OPENAI_STATUS_ERROR_CODE } from '@/utils/openaiStatus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session.authenticated || !session.userId) {
      return NextResponse.json({ error: 'ERR_AUTH', reason: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { question, models, speechLevel, language, premium } = await req.json();

    const openAIStatus = await getOpenAIStatus();
    if (!openAIStatus.available) {
      return NextResponse.json(
        { error: OPENAI_STATUS_ERROR_CODE, reason: getOpenAIStatusBlockedMessage(openAIStatus.reason) },
        { status: 503 }
      );
    }

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
      ? (speechLevel === 'informal' ? 'in a casual tone' : 'in a polite tone')
      : resolvedLanguage === 'ja'
      ? (speechLevel === 'informal' ? 'カジュアルな口調で' : '丁寧な口調で')
      : (speechLevel === 'informal' ? '반말로 짧게' : '존댓말로 짧게');
    const answerLanguageInstruction = resolvedLanguage === 'en'
      ? 'Respond only in English.'
      : resolvedLanguage === 'ja'
      ? '必ず日本語だけで回答してください。'
      : '반드시 한국어로만 답변해주세요.';

    let systemPrompt: string;
    let userPrompt: string;

    if (premium) {
      systemPrompt = `You are an expert AI model recommender. Analyze the user's question and rank the best matching models. ${answerLanguageInstruction}`;
      userPrompt = resolvedLanguage === 'en'
        ? `Available AI models:\n${modelList}\n\nUser question: "${question}"\n\nRecommend the best 5 models in order ${tone}. Include the exact model name and one short reason for each. Exclude non-matching models.`
        : resolvedLanguage === 'ja'
        ? `利用可能なAIモデル一覧:\n${modelList}\n\nユーザーの質問: 「${question}」\n\nこの質問に最適なモデルを1位から5位まで${tone}おすすめしてください。各モデルごとに正確なモデル名と短い理由を1行ずつ書いてください。合わないモデルは除外してください。`
        : `사용 가능한 AI 모델 목록:\n${modelList}\n\n사용자 질문: "${question}"\n\n위 질문에 가장 적합한 모델을 1위부터 5위까지 ${tone} 추천해주세요. 각 모델마다 실제 모델명과 짧은 이유를 1줄씩 포함하세요. 맞지 않는 모델은 제외하세요.`;
    } else {
      systemPrompt = `You are an expert AI model recommender. Recommend the single best model for the user's question in one concise line. ${answerLanguageInstruction}`;
      userPrompt = resolvedLanguage === 'en'
        ? `Available AI models:\n${modelList}\n\nUser question: "${question}"\n\nTell me in exactly one concise line ${tone} which model is the best. You must include the exact model name.`
        : resolvedLanguage === 'ja'
        ? `利用可能なAIモデル一覧:\n${modelList}\n\nユーザーの質問: 「${question}」\n\nどのモデルが最適かを${tone}1行でだけ答えてください。必ず正確なモデル名を含めてください。`
        : `사용 가능한 AI 모델 목록:\n${modelList}\n\n사용자 질문: "${question}"\n\n어떤 모델이 가장 좋은지 ${tone} 1줄로만 말해주세요. 반드시 실제 모델명을 포함하세요.`;
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
