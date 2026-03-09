import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIStatus } from '@/lib/openaiStatusServer';
import { getOpenAIStatusBlockedMessage, OPENAI_STATUS_ERROR_CODE } from '@/utils/openaiStatus';
import { verifySession } from '@/lib/apiAuth';
import { RateLimiter, getClientIp } from '@/lib/rateLimit';
import { getUserSettingsData, saveUserSettingsData } from '@/lib/walletSecurity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const smartRouterRateLimiter = new RateLimiter(20, 5 * 60 * 1000);

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session.authenticated || !session.userId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const clientIp = getClientIp(req);
    const rl = smartRouterRateLimiter.check(`${session.userId}:${clientIp}:smart-router`);
    if (!rl.success) {
      return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429 });
    }

    const { question, models, speechLevel, language, premium } = await req.json();

    const normalizedQuestion = typeof question === 'string' ? question.trim() : '';
    const normalizedModels = Array.isArray(models)
      ? models
          .filter((model) => model && typeof model.id === 'string' && typeof model.displayName === 'string')
          .slice(0, 20)
          .map((model) => ({
            id: model.id.slice(0, 64),
            displayName: model.displayName.slice(0, 120),
            description: typeof model.description === 'string' ? model.description.slice(0, 240) : '',
          }))
      : [];

    if (!normalizedQuestion || normalizedQuestion.length > 4000) {
      return NextResponse.json({ error: '질문이 올바르지 않습니다.' }, { status: 400 });
    }

    if (normalizedModels.length === 0) {
      return NextResponse.json({ error: '모델 목록이 비어 있습니다.' }, { status: 400 });
    }

    const wantsPremium = premium === true;
    const currentSettings: Record<string, any> = await getUserSettingsData(session.userId).catch(() => ({}));
    const hasPremiumEntitlement = currentSettings.smartRouterPurchased === true;
    const hasUsedFreePremium = currentSettings.smartRouterFreeUsed === true;

    if (wantsPremium && !hasPremiumEntitlement && hasUsedFreePremium) {
      return NextResponse.json({ error: 'ERR_SMART_ROUTER_PREMIUM_REQUIRED' }, { status: 403 });
    }

    if (wantsPremium && !hasPremiumEntitlement && !hasUsedFreePremium) {
      await saveUserSettingsData(session.userId, {
        ...currentSettings,
        smartRouterFreeUsed: true,
      }).catch(() => undefined);
    }

    const openAIStatus = await getOpenAIStatus();
    if (!openAIStatus.available) {
      return NextResponse.json(
        { error: OPENAI_STATUS_ERROR_CODE, reason: getOpenAIStatusBlockedMessage(openAIStatus.reason) },
        { status: 503 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API 키가 없습니다.' }, { status: 500 });
    }

    const modelList = normalizedModels.map((m: any) => `- ${m.id}: ${m.displayName} (${m.description || ''})`).join('\n');
    const resolvedLanguage = language === 'en' || language === 'ja' ? language : 'ko';
    const tone = resolvedLanguage === 'en'
      ? (speechLevel === 'informal' ? 'in a short casual tone' : 'in a short polite tone')
      : resolvedLanguage === 'ja'
      ? (speechLevel === 'informal' ? '短くカジュアルに' : '短く丁寧に')
      : (speechLevel === 'informal' ? '반말로 짧게' : '존댓말로 짧게');

    let systemPrompt: string;
    let userPrompt: string;

    if (premium) {
      systemPrompt = resolvedLanguage === 'en'
        ? 'You are an AI model recommendation expert. Analyze the user question and recommend the most suitable AI models as a ranked list.'
        : resolvedLanguage === 'ja'
        ? 'あなたはAIモデル推薦の専門家です。ユーザーの質問を分析し、最適なAIモデルを順位付きでおすすめしてください。'
        : '당신은 AI 모델 추천 전문가입니다. 사용자의 질문을 분석해서 가장 적합한 AI 모델을 순위별로 추천해주세요.';
      userPrompt = resolvedLanguage === 'en'
        ? `Available AI models:\n${modelList}\n\nUser question: "${normalizedQuestion}"\n\nRecommend the best models from rank 1 to 5 ${tone}. Include the model name and one-line reason for each. Exclude unavailable or irrelevant models.`
        : resolvedLanguage === 'ja'
        ? `利用可能なAIモデル一覧:\n${modelList}\n\nユーザーの質問: 「${normalizedQuestion}」\n\nこの質問に最適なモデルを1位から5位まで${tone}おすすめしてください。各モデルごとにモデル名と1行の理由を含め、該当しないモデルは除外してください。`
        : `사용 가능한 AI 모델 목록:\n${modelList}\n\n사용자 질문: "${normalizedQuestion}"\n\n위 질문에 가장 적합한 모델을 1위부터 5위까지 ${tone} 추천해주세요. 각 모델마다 모델명과 한 줄 이유를 포함하세요. 없는 모델은 제외하세요.`;
    } else {
      systemPrompt = resolvedLanguage === 'en'
        ? 'You are an AI model recommendation expert. Recommend the best AI model for the user question in one line.'
        : resolvedLanguage === 'ja'
        ? 'あなたはAIモデル推薦の専門家です。ユーザーの質問に最適なAIモデルを1行でおすすめしてください。'
        : '당신은 AI 모델 추천 전문가입니다. 사용자의 질문에 가장 적합한 AI 모델을 1줄로 추천해주세요.';
      userPrompt = resolvedLanguage === 'en'
        ? `Available AI models:\n${modelList}\n\nUser question: "${normalizedQuestion}"\n\nTell me in exactly one short line ${tone} which model is best. You must include a real model name.`
        : resolvedLanguage === 'ja'
        ? `利用可能なAIモデル一覧:\n${modelList}\n\nユーザーの質問: 「${normalizedQuestion}」\n\nどのモデルが最適かを${tone}1行だけで答えてください。必ず実在するモデル名を含めてください。`
        : `사용 가능한 AI 모델 목록:\n${modelList}\n\n사용자 질문: "${normalizedQuestion}"\n\n${tone} 어떤 모델이 가장 좋을지 1줄로만 말해주세요. 반드시 실제 모델명을 포함하세요.`;
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

    return NextResponse.json({
      recommendation,
      smartRouterPurchased: hasPremiumEntitlement,
      smartRouterFreeUsed: wantsPremium ? true : hasUsedFreePremium,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '오류가 발생했습니다.' }, { status: 500 });
  }
}
