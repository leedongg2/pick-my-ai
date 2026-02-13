import { NextRequest, NextResponse } from 'next/server';
import { PHASE_EXPORT, PHASE_PRODUCTION_BUILD } from 'next/constants';
import { RateLimiter, getClientIp } from '@/lib/rateLimit';
import { apiKeyManager, parseRateLimitError } from '@/lib/apiKeyRotation';
import { fetchWithRetry } from '@/utils/fetchWithRetry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const isStaticExportPhase =
  process.env.NEXT_PHASE === PHASE_EXPORT ||
  process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD;

// Rate Limiter 인스턴스 생성 (분당 20회 제한)
const chatRateLimiter = new RateLimiter(20, 60 * 1000);

const isNetlify = process.env.NETLIFY === 'true' || process.env.NETLIFY_LOCAL === 'true';
const OPENAI_STREAMING_ALLOWED = process.env.OPENAI_STREAMING_DISABLED !== 'true';
// Netlify 무료 플랜: 함수 타임아웃 10초 → API 호출은 8초 이내 완료 필요
// Netlify Pro 플랜: 함수 타임아웃 26초 → API 호출은 24초 이내
const NETLIFY_FUNCTION_TIMEOUT = Number(process.env.NETLIFY_FUNCTION_TIMEOUT_MS) || 10000;
const DEFAULT_API_TIMEOUT_MS = Number(process.env.AI_API_TIMEOUT_MS) || (isNetlify ? Math.max(NETLIFY_FUNCTION_TIMEOUT - 2000, 5000) : 60000);
const STREAM_CONNECT_TIMEOUT_MS = Number(process.env.AI_STREAM_CONNECT_TIMEOUT_MS) || (isNetlify ? Math.max(NETLIFY_FUNCTION_TIMEOUT - 3000, 4000) : 30000);
// Netlify에서는 재시도 시간이 부족하므로 0회, 로컬에서는 2회
const DEFAULT_API_RETRIES = process.env.AI_API_MAX_RETRIES != null ? Number(process.env.AI_API_MAX_RETRIES) : (isNetlify ? 0 : 2);
const DEFAULT_RETRY_DELAY_MS = Number(process.env.AI_API_RETRY_DELAY_MS) || 800;

type UserAttachment = {
  type: 'image' | 'text';
  name: string;
  mimeType?: string;
  dataUrl?: string; // for images
  content?: string; // for text files
};


function extractBase64(dataUrl: string): { mime: string; base64: string } | null {
  try {
    const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
    if (!match) return null;
    return { mime: match[1], base64: match[2] };
  } catch {
    return null;
  }
}

// 이미지 생성 API 호출 (gpt-image-1, dall-e-3 등)
async function callImageGeneration(prompt: string, model: string): Promise<string> {
  return apiKeyManager.enqueueRequest('openai', async () => {
    const apiKey = apiKeyManager.getAvailableKey('openai');
    
    if (!apiKey) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다.');
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Image Gen] Generating image with ${model}, prompt:`, prompt);
    }

    let response: Response;
    try {
      response = await fetchWithRetry('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model === 'gpt-image-1' ? 'gpt-image-1' : 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: '1024x1024',
          quality: model === 'gpt-image-1' ? 'hd' : 'standard'
        })
      }, {
        timeout: DEFAULT_API_TIMEOUT_MS,
        maxRetries: DEFAULT_API_RETRIES,
        retryDelay: DEFAULT_RETRY_DELAY_MS
      });
    } catch (fetchError: any) {
      if (fetchError?.name === 'AbortError') {
        throw new Error('MODEL_RESPONSE_TIMEOUT');
      }
      throw new Error(`이미지 생성 API 호출 실패: ${fetchError?.message || '알 수 없는 오류'}`);
    }

    if (!response.ok) {
      const errorData = await response.json();
      if (process.env.NODE_ENV !== 'production') {
        console.error('[Image Gen] Error response:', errorData);
      }
      throw new Error(errorData.error?.message || '이미지 생성 API 오류');
    }

    const data = await response.json();
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Image Gen] Image generated successfully with ${model}`);
    }

    // 이미지 URL 반환
    return data.data[0].url;
  });
}

// OpenAI API 호출 (키 로테이션 및 큐 시스템 지원)
async function callOpenAI(model: string, messages: any[], userAttachments?: UserAttachment[], persona?: any, languageInstruction?: string, streaming?: boolean): Promise<string | Response> {
  // 이미지 생성 모델인 경우 이미지 생성 API 사용
  if (model === 'gptimage1' || model === 'dalle3') {
    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user');
    const prompt = typeof lastUserMessage?.content === 'string' 
      ? lastUserMessage.content 
      : lastUserMessage?.content?.[0]?.text || '아름다운 풍경';
    const apiModel = model === 'gptimage1' ? 'gpt-image-1' : 'dall-e-3';
    return await callImageGeneration(prompt, apiModel);
  }

  const apiKey = apiKeyManager.getAvailableKey('openai');
  console.log('[OpenAI] API key check:', { hasKey: !!apiKey, keyPrefix: apiKey?.substring(0, 7) });
  
  if (!apiKey) {
    console.error('[OpenAI] No API key available');
    throw new Error('OpenAI API 키가 설정되지 않았습니다.');
  }

  const shouldStream = !!(streaming && OPENAI_STREAMING_ALLOWED);
  console.log('[OpenAI] Request config:', { model, streaming: shouldStream, isNetlify });

  return await executeOpenAIRequest(
    model,
    messages,
    apiKey,
    userAttachments,
    persona,
    0,
    languageInstruction,
    shouldStream
  );
}

// OpenAI 실제 요청 실행 - 스트리밍 시 Response, 아니면 문자열 반환
async function executeOpenAIRequest(model: string, messages: any[], apiKey: string, userAttachments?: UserAttachment[], persona?: any, retryCount: number = 0, languageInstruction?: string, streaming?: boolean): Promise<string | Response> {

  const modelMap: { [key: string]: string } = {
    // GPT 시리즈
    'gpt5': 'gpt-5',
    'gpt51': 'gpt-5.1',
    'gpt52': 'gpt-5.2',
    'gpt4o': 'gpt-4o',
    'gpt41': 'gpt-4.1',
    // OpenAI o 시리즈
    'o3': 'o3',
    'o3mini': 'o3-mini',
    'o4mini': 'o4-mini',
    // 코딩 모델
    'gpt5codex': 'gpt-5-codex',
    'gpt51codex': 'gpt-5.1-codex',
    'gpt52codex': 'gpt-5.2-codex',
    // 이미지 모델
    'gptimage1': 'gpt-image-1',
    'dalle3': 'dall-e-3',
  };

  // If there are image attachments, convert the LAST user message content to a multimodal array
  const transformedMessages = (() => {
    if (!userAttachments?.length) return messages;
    const lastIdx = [...messages].reverse().findIndex((m: any) => m.role === 'user');
    if (lastIdx === -1) return messages;
    const idx = messages.length - 1 - lastIdx;
    const last = messages[idx];
    const parts: any[] = [];
    if (typeof last.content === 'string') {
      parts.push({ type: 'text', text: last.content });
    } else if (Array.isArray(last.content)) {
      parts.push(...last.content);
    }
    userAttachments.forEach(att => {
      if (att.type === 'image' && att.dataUrl) {
        parts.push({ type: 'image_url', image_url: { url: att.dataUrl } });
      } else if (att.type === 'text' && att.content) {
        parts.push({ type: 'text', text: `File (${att.name}):\n${att.content.slice(0, 4000)}` });
      }
    });
    const newMsgs = [...messages];
    newMsgs[idx] = { role: 'user', content: parts };
    return newMsgs;
  })();

  const selectedModel = modelMap[model];
  if (!selectedModel) {
    throw new Error('모델 매핑이 설정되지 않았습니다. .env.local의 모델 변수를 확인하세요.');
  }

  // 페르소나 기반 시스템 프롬프트 생성
  const buildPersonaPrompt = (persona: any) => {
    if (!persona) return '';
    
    let prompt = `당신은 "${persona.name}"입니다.\n\n`;
    
    if (persona.personality) {
      const p = persona.personality;
      prompt += `성격 특성:\n`;
      prompt += `- 말투: ${p.tone === 'formal' ? '격식있는' : p.tone === 'casual' ? '캐주얼한' : p.tone === 'friendly' ? '친근한' : p.tone === 'professional' ? '전문적인' : '유머러스한'}\n`;
      prompt += `- 언어 스타일: ${p.language === 'polite' ? '정중한' : p.language === 'casual' ? '편한' : '기술적인'}\n`;
      prompt += `- 감정 표현 수준: ${p.emotionLevel}/10\n`;
      prompt += `- 이모지 사용: ${p.emojiUsage ? '적극 사용' : '사용 안 함'}\n`;
      prompt += `- 답변 길이: ${p.responseLength === 'concise' ? '간결하게' : p.responseLength === 'balanced' ? '적당하게' : '상세하게'}\n\n`;
    }
    
    if (persona.expertise && persona.expertise.domains && persona.expertise.domains.length > 0) {
      prompt += `전문 분야: ${persona.expertise.domains.join(', ')}\n`;
      prompt += `전문성 수준: ${persona.expertise.level === 'beginner' ? '초급' : persona.expertise.level === 'intermediate' ? '중급' : '전문가'}\n\n`;
    }
    
    if (persona.speechPatterns) {
      if (persona.speechPatterns.greetings && persona.speechPatterns.greetings.length > 0) {
        prompt += `인사말 예시: ${persona.speechPatterns.greetings[0]}\n`;
      }
      if (persona.speechPatterns.catchPhrases && persona.speechPatterns.catchPhrases.length > 0) {
        prompt += `특징적인 표현: ${persona.speechPatterns.catchPhrases.join(', ')}\n`;
      }
    }
    
    prompt += `\n위 특성을 반영하여 답변해주세요.`;
    return prompt;
  };
  
  // GPT-5/5.1 및 코딩 모델용 시스템 메시지 추가
  const isGPT5Series = model === 'gpt5' || model === 'gpt51' || model === 'gpt52';
  const isCodingModel = model === 'codex' || model === 'gpt5codex' || model === 'gpt51codex';
  
  // 대화의 첫 메시지인지 확인 (시스템 메시지 제외하고 사용자 메시지가 1개인 경우)
  const isFirstMessage = transformedMessages.filter((m: any) => m.role === 'user').length === 1;
  
  // 코드 블록 규칙 (첫 메시지에만 포함)
  const codeBlockRule = isFirstMessage 
    ? '凡出碼，必以///夾之。'
    : '';
  
  // 요약 규칙 (첫 메시지에만 포함)
  const summaryRule = isFirstMessage
    ? '終附隱要，格式以~包：Q≤5字，A≤10字，Prev要或無。'
    : '';
  
  const baseSystemPrompt = isGPT5Series
    ? `汝為助理，盡詳全答其問，重者以標**，分節以##題，以韓語親切而答。**섹션 제목이나 주요 주제: ##제목 내용${codeBlockRule}${summaryRule}`
    : isCodingModel
    ? `汝為程式專助，擅撰碼、除錯、優化、釋義，重者以標**，分節以##題而答** 서식 규칙:${codeBlockRule}${summaryRule}`
    : `汝為助理，重者以標** **섹션 제목이나 주요 주제: ## 제목 내용${codeBlockRule}${summaryRule}`;
  
  const personaPrompt = persona ? buildPersonaPrompt(persona) : '';

  const systemContent = [baseSystemPrompt, personaPrompt, languageInstruction]
    .filter(Boolean)
    .join('\n\n');
  
  const finalMessages = systemContent
    ? [
        {
          role: 'system',
          content: systemContent
        },
        ...transformedMessages
      ]
    : transformedMessages;

  // Codex 모델은 /v1/responses 엔드포인트 사용
  const isCodex = selectedModel.includes('codex');
  const endpoint = isCodex 
    ? 'https://api.openai.com/v1/responses'
    : 'https://api.openai.com/v1/chat/completions';

  // 모델별 max_tokens 설정
  let maxTokens = 1200; // GPT-5/5.1/5.2/Codex 기본값
  if (model === 'gpt4o' || model === 'gpt41') {
    maxTokens = 800; // GPT-4.1 / GPT-4o
  }
  
  const requestBody: any = {
    model: selectedModel,
    messages: finalMessages,
    max_completion_tokens: maxTokens,
    stream: !!(streaming && !isCodex)
  };
  
  // GPT-5 시리즈가 아닌 경우에만 temperature 추가
  if (!isGPT5Series) {
    requestBody.temperature = 0.7;
  }

  // Responses API는 다른 파라미터 구조 사용
  let apiRequestBody: any;
  if (isCodex) {
    apiRequestBody = {
      model: requestBody.model,
      input: requestBody.messages,
      max_tokens: requestBody.max_completion_tokens,
    };
    if (requestBody.temperature !== undefined) {
      apiRequestBody.temperature = requestBody.temperature;
    }
  } else {
    apiRequestBody = requestBody;
  }

  // 스트리밍은 연결 타임아웃, 비스트리밍은 응답 타임아웃
  const connectTimeout = streaming ? STREAM_CONNECT_TIMEOUT_MS : DEFAULT_API_TIMEOUT_MS;

  console.log('[OpenAI] Making API request:', { 
    endpoint, 
    model: selectedModel, 
    stream: requestBody.stream,
    timeout: connectTimeout,
    retries: streaming ? 1 : DEFAULT_API_RETRIES
  });

  let response: Response;
  try {
    console.log('[OpenAI] Calling fetchWithRetry...');
    response = await fetchWithRetry(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(apiRequestBody)
    }, {
      timeout: connectTimeout,
      maxRetries: streaming ? 1 : DEFAULT_API_RETRIES,
      retryDelay: DEFAULT_RETRY_DELAY_MS
    });
    console.log('[OpenAI] API response received:', { status: response.status, ok: response.ok });
  } catch (fetchError: any) {
    console.error('[OpenAI] Fetch error:', { name: fetchError?.name, message: fetchError?.message });
    if (fetchError?.name === 'AbortError') {
      throw new Error('MODEL_RESPONSE_TIMEOUT');
    }
    throw new Error(`OpenAI API 호출 실패: ${fetchError?.message || '알 수 없는 오류'}`);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (process.env.NODE_ENV !== 'production') {
      console.error('[OpenAI] Error response:', errorData);
    }
    const error: any = new Error(errorData.error?.message || 'OpenAI API 오류');
    error.status = response.status;
    error.response = { status: response.status, headers: response.headers };
    
    // 429 에러 처리
    if (response.status === 429 && retryCount < 3) {
      const rateLimitInfo = parseRateLimitError(error);
      
      if (rateLimitInfo.isRateLimit) {
        apiKeyManager.handleRateLimitError('openai', apiKey, rateLimitInfo.resetTime, rateLimitInfo.rateLimitType);
        
        const nextKey = apiKeyManager.getAvailableKey('openai');
        if (nextKey && nextKey !== apiKey) {
          return executeOpenAIRequest(model, messages, nextKey, userAttachments, persona, retryCount + 1, languageInstruction, streaming);
        }
        
        const availability = apiKeyManager.getNextAvailableTime('openai');
        throw new Error(availability.message || 'OpenAI API 요청 한도를 초과했습니다.');
      }
    }
    
    throw error;
  }

  // 스트리밍 모드: OpenAI response body를 반환 (POST 핸들러에서 ReadableStream으로 감싸서 즉시 반환)
  if (streaming && !isCodex && response.body) {
    return response;
  }

  // 비스트리밍 JSON 응답 처리 (Codex, 이미지 등)
  const data = await response.json();
  
  // choices 배열 확인
  if (!data?.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
    console.error('[OpenAI] No choices in response');
    throw new Error('OpenAI API 응답에 choices가 없습니다. 관리자에게 문의하세요.');
  }

  const choice = data.choices[0];
  
  // refusal 체크 (GPT-4o 이상에서 거부 응답)
  if (choice.message?.refusal) {
    console.warn('[OpenAI] Request refused:', choice.message.refusal);
    throw new Error(`OpenAI가 요청을 거부했습니다: ${choice.message.refusal}`);
  }
  
  // Codex (Responses API) vs Chat Completions API
  const content = isCodex
    ? (data?.output?.[0]?.content?.[0]?.text || choice.message?.content)
    : choice.message?.content;

  if (!content || (typeof content === 'string' && !content.trim())) {
    console.error('[OpenAI] Empty content. Has choices:', !!data.choices, 'Has message:', !!choice.message);
    throw new Error('OpenAI API에서 빈 응답을 반환했습니다. 다른 질문을 시도해보세요.');
  }

  return content;
}

// Google AI Studio (Gemini) 호출 (비스트리밍 JSON - Netlify 호환)
async function callGemini(model: string, messages: any[], userAttachments?: UserAttachment[], retryCount: number = 0, temperature?: number): Promise<string> {
  const apiKey = apiKeyManager.getAvailableKey('gemini');
  if (!apiKey) {
    throw new Error('Gemini API 키가 설정되지 않았습니다. GOOGLE_API_KEY 또는 GEMINI_API_KEY를 설정하세요.');
  }

  const geminiModelMap: { [key: string]: string } = {
    // Gemini 2.0 실험 모델 (최신)
    'gemini3': 'gemini-2.0-flash-exp',
    'gemini3pro': 'gemini-2.0-flash-thinking-exp-1219',
    // 레거시 매핑
    'gemini-flash': 'gemini-1.5-flash',
    'gemini-pro': 'gemini-1.5-pro',
  };

  const selectedModel = geminiModelMap[model] || 'gemini-2.0-flash-exp';

  // Gemini contents 변환
  const contents: Array<{ role: string; parts: any[] }> = [];
  const append = (role: 'user' | 'model', part: any) => {
    if (contents.length === 0 || contents[contents.length - 1].role !== role) {
      contents.push({ role, parts: [part] });
    } else {
      contents[contents.length - 1].parts.push(part);
    }
  };

  // 기존 대화 변환 (assistant -> model)
  for (const m of messages) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    if (Array.isArray(m.content)) {
      for (const p of m.content) {
        if (p?.type === 'text' && p?.text) {
          append(role, { text: p.text });
        } else if (p?.type === 'image_url' && p?.image_url?.url) {
          const parsed = extractBase64(p.image_url.url);
          if (parsed) {
            append(role, { inline_data: { mime_type: parsed.mime, data: parsed.base64 } });
          }
        }
      }
    } else if (typeof m.content === 'string') {
      append(role, { text: m.content });
    }
  }

  // 마지막 user 메시지에 첨부 추가
  if (userAttachments?.length) {
    for (let i = contents.length - 1; i >= 0; i--) {
      if (contents[i].role === 'user') {
        for (const att of userAttachments) {
          if (att.type === 'image' && att.dataUrl) {
            const parsed = extractBase64(att.dataUrl);
            if (parsed) contents[i].parts.push({ inline_data: { mime_type: parsed.mime, data: parsed.base64 } });
          } else if (att.type === 'text' && att.content) {
            contents[i].parts.push({ text: `File (${att.name}):\n${att.content.slice(0, 4000)}` });
          }
        }
        break;
      }
    }
  }

  // generateContent 엔드포인트 사용 (비스트리밍 - Netlify 타임아웃 방지)
  let response: Response;
  try {
    response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(selectedModel)}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { 
          temperature: temperature ?? 0.7,
          maxOutputTokens: 2048,
          topP: 0.95,
          topK: 40
        },
      }),
    }, {
      timeout: DEFAULT_API_TIMEOUT_MS,
      maxRetries: DEFAULT_API_RETRIES,
      retryDelay: DEFAULT_RETRY_DELAY_MS
    });
  } catch (fetchError: any) {
    if (fetchError?.name === 'AbortError') {
      throw new Error('MODEL_RESPONSE_TIMEOUT');
    }
    throw new Error(`Gemini API 호출 실패: ${fetchError?.message || '알 수 없는 오류'}`);
  }

  if (!response.ok) {
    let data: any = {};
    try { data = await response.json(); } catch { /* ignore */ }
    const msg = data?.error?.message || 'Gemini API 오류';
    const error: any = new Error(msg);
    error.status = response.status;
    error.response = { status: response.status, headers: response.headers };
    
    // 429 에러 처리
    if (response.status === 429 && retryCount < 3) {
      const rateLimitInfo = parseRateLimitError(error);
      
      if (rateLimitInfo.isRateLimit) {
        apiKeyManager.handleRateLimitError('gemini', apiKey, rateLimitInfo.resetTime, rateLimitInfo.rateLimitType);
        
        const nextKey = apiKeyManager.getAvailableKey('gemini');
        if (nextKey && nextKey !== apiKey) {
          return callGemini(model, messages, userAttachments, retryCount + 1, temperature);
        }
        
        const availability = apiKeyManager.getNextAvailableTime('gemini');
        throw new Error(availability.message || 'Gemini API 요청 한도를 초과했습니다.');
      }
    }
    
    throw error;
  }

  // 비스트리밍 JSON 응답 처리
  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const content = parts.map((p: any) => p?.text).filter(Boolean).join('');

  if (!content || !content.trim()) {
    throw new Error('Gemini API에서 빈 응답을 반환했습니다.');
  }

  return content;
}


// Anthropic API 호출 (비스트리밍 JSON - Netlify 호환)
async function callAnthropic(model: string, messages: any[], userAttachments?: UserAttachment[], retryCount: number = 0, temperature?: number): Promise<string> {
  const apiKey = apiKeyManager.getAvailableKey('anthropic');
  
  if (!apiKey) {
    throw new Error('Anthropic API 키가 설정되지 않았습니다.');
  }

  const modelMap: { [key: string]: string } = {
    'haiku35': 'claude-3-5-haiku-20241022',
    'haiku45': 'claude-3-5-haiku-20241022',
    'sonnet45': 'claude-3-5-sonnet-20241022',
    'opus4': 'claude-opus-4-20250514',
    'opus41': 'claude-opus-4.1-20241022',
    'opus45': 'claude-opus-4.1-20241022', // 임시 매핑
    'opus46': 'claude-opus-4.6-20250514',
    // 레거시 매핑
    'claude-haiku': 'claude-3-haiku-20240307',
    'claude-sonnet': 'claude-3-5-sonnet-20241022',
    'claude-opus': 'claude-3-opus-20240229',
  };

  // Anthropic 형식으로 변환 (system 메시지 분리)
  const systemMessage = messages.find((m: any) => m.role === 'system');
  const conversationMessages = messages.filter((m: any) => m.role !== 'system');

  // Transform to Anthropic content blocks; add image/text attachments to the LAST user message
  const transformed = conversationMessages.map((m: any) => ({
    role: m.role,
    content: Array.isArray(m.content)
      ? m.content
      : [{ type: 'text', text: typeof m.content === 'string' ? m.content : '' }]
  }));

  if (userAttachments?.length) {
    for (let i = transformed.length - 1; i >= 0; i--) {
      if (transformed[i].role === 'user') {
        userAttachments.forEach(att => {
          if (att.type === 'image' && att.dataUrl) {
            const parsed = extractBase64(att.dataUrl);
            if (parsed) {
              transformed[i].content.push({
                type: 'image',
                source: { type: 'base64', media_type: parsed.mime, data: parsed.base64 }
              } as any);
            }
          } else if (att.type === 'text' && att.content) {
            transformed[i].content.push({ type: 'text', text: `File (${att.name}):\n${att.content.slice(0, 4000)}` });
          }
        });
        break;
      }
    }
  }

  // 모델별 max_tokens 설정
  let maxTokens = 1500; // Sonnet 기본값
  if (model.includes('haiku')) {
    maxTokens = 1000; // Haiku
  } else if (model.includes('opus')) {
    maxTokens = 2000; // Opus
  }
  
  let response: Response;
  try {
    response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelMap[model] || 'claude-3-5-sonnet-20241022',
        max_tokens: maxTokens,
        temperature: temperature ?? 1.0,
        top_p: 0.9,
        stream: false,
        system: systemMessage?.content || '당신은 도움이 되는 AI 어시스턴트입니다.',
        messages: transformed
      })
    }, {
      timeout: DEFAULT_API_TIMEOUT_MS,
      maxRetries: DEFAULT_API_RETRIES,
      retryDelay: DEFAULT_RETRY_DELAY_MS
    });
  } catch (fetchError: any) {
    if (fetchError?.name === 'AbortError') {
      throw new Error('MODEL_RESPONSE_TIMEOUT');
    }
    throw new Error(`Anthropic API 호출 실패: ${fetchError?.message || '알 수 없는 오류'}`);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: any = new Error(errorData.error?.message || 'Anthropic API 오류');
    error.status = response.status;
    error.response = { status: response.status, headers: response.headers };
    
    // 429 에러 처리
    if (response.status === 429 && retryCount < 3) {
      const rateLimitInfo = parseRateLimitError(error);
      
      if (rateLimitInfo.isRateLimit) {
        apiKeyManager.handleRateLimitError('anthropic', apiKey, rateLimitInfo.resetTime, rateLimitInfo.rateLimitType);
        
        const nextKey = apiKeyManager.getAvailableKey('anthropic');
        if (nextKey && nextKey !== apiKey) {
          return callAnthropic(model, messages, userAttachments, retryCount + 1, temperature);
        }
        
        const availability = apiKeyManager.getNextAvailableTime('anthropic');
        throw new Error(availability.message || 'Anthropic API 요청 한도를 초과했습니다.');
      }
    }
    
    throw error;
  }

  // 비스트리밍 JSON 응답 처리
  const data = await response.json();
  const content = data?.content?.map((c: any) => c.type === 'text' ? c.text : '').filter(Boolean).join('') || '';

  if (!content || !content.trim()) {
    throw new Error('Anthropic API에서 빈 응답을 반환했습니다.');
  }

  return content;
}

// Perplexity API 호출 (비스트리밍 JSON - Netlify 완벽 호환)
async function callPerplexity(model: string, messages: any[], userAttachments?: UserAttachment[], retryCount: number = 0, temperature?: number): Promise<string> {
  const apiKey = apiKeyManager.getAvailableKey('perplexity');
  
  if (!apiKey) {
    throw new Error('Perplexity API 키가 설정되지 않았습니다.');
  }

  const modelMap: { [key: string]: string } = {
    'sonar': 'sonar',
    'sonarPro': 'sonar-pro',
    'deepResearch': 'sonar-reasoning',
    'perplexity-sonar': 'sonar',
    'perplexity-sonar-pro': 'sonar-pro',
    'perplexity-deep-research': 'sonar-reasoning'
  };

  // 첨부파일 메모 추가
  let finalMessages = messages;
  if (userAttachments?.length) {
    finalMessages = [...messages];
    const lastUserIdx = finalMessages.map((m: any) => m.role).lastIndexOf('user');
    if (lastUserIdx !== -1) {
      const last = finalMessages[lastUserIdx];
      finalMessages[lastUserIdx] = {
        ...last,
        content: `${last.content || ''}\n\n[첨부 ${userAttachments.length}개는 이 모델에서 직접 처리되지 않아 제외되었습니다.]`
      };
    }
  }

  let response: Response;
  try {
    response = await fetchWithRetry('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelMap[model] || 'sonar',
        stream: false,
        messages: finalMessages,
        max_tokens: 800, // Perplexity 모든 모델
        temperature: temperature ?? 0.7,
        top_p: 0.9,
      })
    }, {
      timeout: DEFAULT_API_TIMEOUT_MS,
      maxRetries: DEFAULT_API_RETRIES,
      retryDelay: DEFAULT_RETRY_DELAY_MS
    });
  } catch (fetchError: any) {
    if (fetchError?.name === 'AbortError') {
      throw new Error('MODEL_RESPONSE_TIMEOUT');
    }
    throw new Error(`Perplexity API 호출 실패: ${fetchError?.message || '알 수 없는 오류'}`);
  }

  if (!response.ok) {
    let errorData: any = {};
    try { errorData = await response.json(); } catch {}
    const error: any = new Error(errorData.error?.message || `Perplexity API 오류 (${response.status})`);
    error.status = response.status;
    error.response = { status: response.status, headers: response.headers };

    if (response.status === 429 && retryCount < 3) {
      const rateLimitInfo = parseRateLimitError(error);
      if (rateLimitInfo.isRateLimit) {
        apiKeyManager.handleRateLimitError('perplexity', apiKey, rateLimitInfo.resetTime, rateLimitInfo.rateLimitType);
        const nextKey = apiKeyManager.getAvailableKey('perplexity');
        if (nextKey && nextKey !== apiKey) {
          return callPerplexity(model, messages, userAttachments, retryCount + 1, temperature);
        }
        const availability = apiKeyManager.getNextAvailableTime('perplexity');
        throw new Error(availability.message || 'Perplexity API 요청 한도를 초과했습니다.');
      }
    }

    throw error;
  }

  // 비스트리밍 JSON 응답 처리
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content || !content.trim()) {
    throw new Error('Perplexity API에서 빈 응답을 반환했습니다.');
  }

  return content;
}

export async function POST(request: NextRequest) {
  if (isStaticExportPhase) {
    return NextResponse.json(
      { error: '정적 내보내기 환경에서는 Chat API를 사용할 수 없습니다.' },
      {
        status: 501,
        headers: {
          'Cache-Control': 'no-store',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  }

  try {
    // Rate Limiting 체크
    const clientIp = getClientIp(request);
    const rateLimitResult = chatRateLimiter.check(clientIp);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
            'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString()
          }
        }
      );
    }

    const { modelId, messages, userAttachments, persona, language, temperature, storedFacts, conversationSummary } = await request.json();

    const resolvedLanguage = (language === 'en' || language === 'ja' || language === 'ko') ? language : 'ko';
    const languageInstruction = resolvedLanguage === 'en'
      ? 'Always respond in English.'
      : resolvedLanguage === 'ja'
      ? '必ず日本語で回答してください。'
      : '반드시 한국어로 답변해주세요.';

    const normalizeStoredFact = (fact: unknown) => {
      if (typeof fact !== 'string') return '';
      const cleaned = fact.trim().replace(/\s+/g, ' ');
      return cleaned.slice(0, 200);
    };

    const storedFactsList: string[] = Array.isArray(storedFacts)
      ? Array.from(new Set(storedFacts.map(normalizeStoredFact).filter(Boolean))).slice(0, 50)
      : [];

    const storedFactsContext = storedFactsList.length
      ? ['[저장된 사용자 사실(참고용, 출력 금지)]', ...storedFactsList].join('\n')
      : '';

    const memoryInstruction = [
      '아래 규칙을 반드시 준수하세요.',
      '1) 답변 본문을 먼저 출력한 뒤, 반드시 답변의 맨 마지막에만 숨김 메모리 블록을 추가하세요.',
      '2) 숨김 메모리 블록 형식은 정확히 다음과 같습니다(따옴표/코드블록/마크다운 금지):',
      '@@MEM@@',
      '<새롭게 학습한, 일반화 가능한 사용자 사실을 한 줄에 하나씩>',
      '@@END@@',
      '3) 새 사실이 없으면 빈 블록을 출력하세요:',
      '@@MEM@@',
      '@@END@@',
      '4) 메모리에는 인사/농담/감정표현/말투/이모지 선호/요청 반복/추측/민감정보/개인식별 가능한 세부정보를 쓰지 마세요.',
      '5) 메모리는 매우 간결하게, 각 줄 120자 이내로 작성하고, 메모리 줄의 언어는 현재 답변 언어와 동일하게 하세요.',
    ].join('\n');

    const languageInstructionWithMemory = [languageInstruction, storedFactsContext, memoryInstruction]
      .filter(Boolean)
      .join('\n\n');

    // 기본 프롬프트 추가
    const basePrompt = 'Energetic. Friendly.\nReact big. Use emojis.\nGive practical lists.';

    const applyLanguageInstruction = (inputMessages: any[]) => {
      const idx = inputMessages.findIndex((m: any) => m?.role === 'system');
      
      // 요약이 있으면 전체 메시지 대신 요약만 사용
      let contextMessages = inputMessages;
      if (conversationSummary && inputMessages.length > 1) {
        // 마지막 사용자 메시지만 유지하고 나머지는 요약으로 대체
        const lastUserMessage = inputMessages[inputMessages.length - 1];
        contextMessages = [
          {
            role: 'system',
            content: `Previous conversation summary:\n${conversationSummary}`
          },
          lastUserMessage
        ];
      }
      
      const systemContent = [basePrompt, languageInstructionWithMemory].filter(Boolean).join('\n\n');
      
      if (idx === -1) {
        return [{ role: 'system', content: systemContent }, ...contextMessages];
      }
      
      const existing = contextMessages[idx];
      const existingContent = typeof existing?.content === 'string' ? existing.content : '';
      const merged = [existingContent, systemContent].filter(Boolean).join('\n\n');
      
      return [
        ...contextMessages.slice(0, idx),
        { ...existing, content: merged },
        ...contextMessages.slice(idx + 1),
      ];
    };

    // 입력 검증
    if (!modelId || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: '잘못된 요청입니다.' },
        { status: 400 }
      );
    }

    // 메시지 길이 제한 (DoS 방지)
    if (messages.length > 100) {
      return NextResponse.json(
        { error: '메시지 개수가 너무 많습니다.' },
        { status: 400 }
      );
    }

    // 각 메시지 내용 길이 제한
    for (const msg of messages) {
      if (typeof msg.content === 'string' && msg.content.length > 50000) {
        return NextResponse.json(
          { error: '메시지 내용이 너무 깁니다.' },
          { status: 400 }
        );
      }
    }

    // 첨부파일 크기 제한
    if (userAttachments && Array.isArray(userAttachments)) {
      if (userAttachments.length > 10) {
        return NextResponse.json(
          { error: '첨부파일 개수가 너무 많습니다.' },
          { status: 400 }
        );
      }
      
      for (const attachment of userAttachments) {
        if (attachment.dataUrl && attachment.dataUrl.length > 10 * 1024 * 1024) {
          return NextResponse.json(
            { error: '첨부파일 크기가 너무 큽니다. (최대 10MB)' },
            { status: 400 }
          );
        }
      }
    }

    // 모든 환경에서 요청 추적
    console.log('[Chat API] Request received:', { 
      modelId, 
      messageCount: messages.length,
      hasAttachments: !!userAttachments?.length,
      isNetlify,
      nodeEnv: process.env.NODE_ENV
    });

    // OpenAI 모델 판별
    const isOpenAIModel = modelId.startsWith('gpt') || modelId === 'codex' || modelId.endsWith('codex')
      || modelId === 'gptimage1' || modelId === 'dalle3'
      || modelId === 'o3' || modelId === 'o3mini' || modelId === 'o4mini';
    
    // GPT 스트리밍 가능 모델 (이미지/Codex 제외)
    const isStreamableGPT = isOpenAIModel
      && !modelId.endsWith('codex') && modelId !== 'codex'
      && modelId !== 'gptimage1' && modelId !== 'dalle3';

    // GPT 스트리밍 모델: ReadableStream으로 감싸서 즉시 반환 (Netlify 안전 패턴)
    if (isStreamableGPT && OPENAI_STREAMING_ALLOWED) {
      console.log('[Chat API] Using streaming path for model:', modelId);
      const stream = new ReadableStream({
        async start(ctrl) {
          console.log('[Chat API Stream] Stream started, calling OpenAI...');
          try {
            console.log('[Chat API Stream] About to call callOpenAI with streaming=true');
            const openaiRes = await callOpenAI(modelId, messages, userAttachments, persona, languageInstructionWithMemory, true) as Response;
            console.log('[Chat API Stream] callOpenAI returned, status:', openaiRes.status);
            
            if (!openaiRes.body) {
              throw new Error('OpenAI response has no body');
            }
            
            const reader = openaiRes.body.getReader();
            console.log('[Chat API Stream] Reading stream...');
            try {
              let chunkCount = 0;
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  console.log('[Chat API Stream] Stream complete, chunks received:', chunkCount);
                  break;
                }
                chunkCount++;
                ctrl.enqueue(value);
              }
            } finally {
              reader.releaseLock();
            }
            ctrl.close();
          } catch (err: any) {
            // 스트림 내부 에러를 SSE 형식으로 전달
            console.error('[Chat API Stream] Error in stream:', {
              name: err.name,
              message: err.message,
              stack: err.stack?.split('\n').slice(0, 3).join('\n')
            });
            const errMsg = err.message || '응답 생성 중 오류가 발생했습니다.';
            const errEvent = `data: ${JSON.stringify({ error: errMsg })}\n\ndata: [DONE]\n\n`;
            ctrl.enqueue(new TextEncoder().encode(errEvent));
            ctrl.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 나머지 모델은 JSON 응답
    let responseContent: string;

    if (isOpenAIModel) {
      console.log(`[Chat API] Calling OpenAI API for model: ${modelId}${modelId === 'gptimage1' || modelId === 'dalle3' ? ' (Image Generation)' : ''}`);
      responseContent = await callOpenAI(modelId, messages, userAttachments, persona, languageInstructionWithMemory) as string;
      console.log('[Chat API] OpenAI response received, length:', responseContent?.length || 0);
    } else if (modelId.startsWith('gemini')) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Chat API] Calling Gemini API');
      }
      responseContent = await callGemini(modelId, applyLanguageInstruction(messages), userAttachments, 0, temperature);
    } else if (modelId.startsWith('claude') || modelId === 'haiku35' || modelId === 'haiku45' || modelId === 'sonnet45' || modelId === 'opus4' || modelId === 'opus41' || modelId === 'opus45' || modelId === 'opus46') {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Chat API] Calling Anthropic API');
      }
      responseContent = await callAnthropic(modelId, applyLanguageInstruction(messages), userAttachments, 0, temperature);
    } else if (modelId.startsWith('perplexity') || modelId === 'sonar' || modelId === 'sonarPro' || modelId === 'deepResearch') {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Chat API] Calling Perplexity API');
      }
      responseContent = await callPerplexity(modelId, applyLanguageInstruction(messages), userAttachments, 0, temperature);
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Chat API] Unknown model, using demo response');
      }
      responseContent = `[${modelId}] ${resolvedLanguage === 'ja' ? 'こんにちは！質問にお答えします。' : resolvedLanguage === 'en' ? 'Hello! I will answer your question.' : '안녕하세요! 질문에 답변드리겠습니다.'} (API 키가 설정되지 않아 데모 모드로 실행 중입니다. .env.local 파일에 API 키를 추가하세요.)`;
    }

    return NextResponse.json({ content: responseContent });

  } catch (error: any) {
    // 모든 환경에서 에러 로깅 (디버깅용)
    console.error('[Chat API] Error caught:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'), // 스택 일부만
      timestamp: new Date().toISOString()
    });
    
    // API 키가 없는 경우 데모 응답
    if (error.message?.includes('API 키가 설정되지 않았습니다')) {
      return NextResponse.json({ 
        content: `💡 데모 모드: 실제 AI 응답을 받으려면 .env.local 파일에 API 키를 추가하세요.\n\n` +
                 `설정 방법:\n` +
                 `1. 프로젝트 루트에 .env.local 파일 생성\n` +
                 `2. 다음 환경변수 추가:\n` +
                 `   - OPENAI_API_KEY=your_key (GPT 모델용)\n` +
                 `   - ANTHROPIC_API_KEY=your_key (Claude 모델용)\n` +
                 `   - PERPLEXITY_API_KEY=your_key (Perplexity 모델용)\n\n` +
                 `자세한 내용은 env.example 파일을 참고하세요.`
      });
    }

    // 모델 응답 타임아웃 처리
    if (error.message === 'MODEL_RESPONSE_TIMEOUT' || error.name === 'AbortError') {
      console.error('[Chat API] Timeout error - Netlify function timeout likely exceeded');
      return NextResponse.json(
        { error: `AI 모델 응답 시간이 초과되었습니다 (제한: ${Math.round(DEFAULT_API_TIMEOUT_MS / 1000)}초). 더 짧은 질문으로 다시 시도해주세요.` },
        { status: 504 }
      );
    }

    // 에러 타입별 처리
    let errorMessage = '응답 생성 중 오류가 발생했습니다.';
    let statusCode = 500;

    if (error.message?.includes('API 키')) {
      errorMessage = error.message;
      statusCode = 401;
    } else if (error.message?.includes('한도')) {
      errorMessage = error.message;
      statusCode = 429;
    } else if (error.message?.includes('네트워크') || error.message?.includes('fetch')) {
      errorMessage = '네트워크 오류가 발생했습니다. 연결을 확인하세요.';
      statusCode = 503;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

