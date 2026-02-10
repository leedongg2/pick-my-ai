import { NextRequest, NextResponse } from 'next/server';
import { PHASE_EXPORT, PHASE_PRODUCTION_BUILD } from 'next/constants';
import { RateLimiter, getClientIp } from '@/lib/rateLimit';
import { apiKeyManager, parseRateLimitError } from '@/lib/apiKeyRotation';

// Netlify/Vercel 서버리스 함수 타임아웃 설정 (60초)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const isStaticExportPhase =
  process.env.NEXT_PHASE === PHASE_EXPORT ||
  process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD;

// Rate Limiter 인스턴스 생성 (분당 20회 제한)
const chatRateLimiter = new RateLimiter(20, 60 * 1000);

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

// DALL-E 이미지 생성 API 호출
async function callDALLE(prompt: string): Promise<string> {
  return apiKeyManager.enqueueRequest('openai', async () => {
    const apiKey = apiKeyManager.getAvailableKey('openai');
    
    if (!apiKey) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다.');
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DALL-E] Generating image with prompt:', prompt);
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (process.env.NODE_ENV !== 'production') {
        console.error('[DALL-E] Error response:', errorData);
      }
      throw new Error(errorData.error?.message || 'DALL-E API 오류');
    }

    const data = await response.json();
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DALL-E] Image generated successfully');
    }

    // 이미지 URL 반환
    return data.data[0].url;
  });
}

// OpenAI API 호출 (키 로테이션 및 큐 시스템 지원) - 비스트리밍 JSON 문자열 반환
async function callOpenAI(model: string, messages: any[], userAttachments?: UserAttachment[], persona?: any, languageInstruction?: string): Promise<string> {
  // 이미지 생성 모델인 경우 DALL-E API 사용
  if (model === 'gptimage1' || model === 'dalle3') {
    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user');
    const prompt = typeof lastUserMessage?.content === 'string' 
      ? lastUserMessage.content 
      : lastUserMessage?.content?.[0]?.text || '아름다운 풍경';
    return await callDALLE(prompt);
  }

  const apiKey = apiKeyManager.getAvailableKey('openai');
  if (!apiKey) {
    throw new Error('OpenAI API 키가 설정되지 않았습니다.');
  }

  return await executeOpenAIRequest(model, messages, apiKey, userAttachments, persona, 0, languageInstruction);
}

// OpenAI 실제 요청 실행 - JSON 문자열 반환
async function executeOpenAIRequest(model: string, messages: any[], apiKey: string, userAttachments?: UserAttachment[], persona?: any, retryCount: number = 0, languageInstruction?: string): Promise<string> {

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
    ? '\n\n코드를 출력할 때는 반드시 ///로 코드를 둘러싸세요.\n예시:\n///\nfunction example() {\n  return "code here";\n}\n///'
    : '';
  
  // 요약 규칙 (첫 메시지에만 포함)
  const summaryRule = isFirstMessage
    ? '\n\n**중요**: 답변 마지막에 요약을 작성하세요 (사용자에게 보이지 않음):\n~~\nQ: [질문 5단어 이내]\nA: [답변 핵심 10단어 이내]\nPrev: [이전 답변 요약 또는 None]\n~~'
    : '';
  
  const baseSystemPrompt = isGPT5Series
    ? `당신은 도움이 되는 AI 어시스턴트입니다. 사용자의 질문에 최대한 상세하고 포괄적으로 답변하세요.\n\n서식 규칙:\n- 중요하거나 강조하고 싶은 내용: **강조할 내용**\n- 섹션 제목이나 주요 주제: ## 제목 내용${codeBlockRule}${summaryRule}\n\n답변을 구조화할 때 ## 제목을 적극 활용하세요.`
    : isCodingModel
    ? `당신은 전문 프로그래밍 어시스턴트입니다. 코드 작성, 디버깅, 최적화, 설명에 특화되어 있습니다.\n\n서식 규칙:${codeBlockRule}${summaryRule}\n- 중요한 부분: **강조**\n- 섹션 제목: ## 제목\n\n답변을 구조화할 때 ## 제목을 사용하세요.`
    : `당신은 도움이 되는 AI 어시스턴트입니다.\n\n서식 규칙:\n- 중요하거나 강조하고 싶은 내용: **강조할 내용**\n- 섹션 제목이나 주요 주제: ## 제목 내용${codeBlockRule}${summaryRule}`;
  
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

  // GPT-5 시리즈는 temperature를 지원하지 않으므로 제외
  const requestBody: any = {
    model: selectedModel,
    messages: finalMessages,
    max_completion_tokens: 2048,
    stream: false // 비스트리밍으로 변경 (간결한 응답)
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

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[OpenAI] Request:`, { endpoint, model: selectedModel, stream: requestBody.stream });
  }

  // 20초 타임아웃 설정 (Netlify 26초 제한보다 여유있게)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(apiRequestBody),
      signal: controller.signal
    });
  } catch (fetchError: any) {
    clearTimeout(timeoutId);
    if (fetchError.name === 'AbortError') {
      throw new Error('OpenAI API 요청이 20초를 초과했습니다. 더 짧은 질문을 시도해보세요.');
    }
    throw new Error(`OpenAI API 호출 실패: ${fetchError.message}`);
  } finally {
    clearTimeout(timeoutId);
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
          return executeOpenAIRequest(model, messages, nextKey, userAttachments, persona, retryCount + 1, languageInstruction);
        }
        
        const availability = apiKeyManager.getNextAvailableTime('openai');
        throw new Error(availability.message || 'OpenAI API 요청 한도를 초과했습니다.');
      }
    }
    
    throw error;
  }

  // 비스트리밍 JSON 응답 처리
  const data = await response.json();
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('[OpenAI] Full response data:', JSON.stringify(data, null, 2));
  }
  
  // choices 배열 확인
  if (!data?.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
    console.error('[OpenAI] No choices in response. Full data:', JSON.stringify(data));
    throw new Error('OpenAI API 응답에 choices가 없습니다. 관리자에게 문의하세요.');
  }

  const choice = data.choices[0];
  
  // refusal 체크 (GPT-4o 이상에서 거부 응답)
  if (choice.message?.refusal) {
    console.warn('[OpenAI] Request was refused:', choice.message.refusal);
    throw new Error(`OpenAI가 요청을 거부했습니다: ${choice.message.refusal}`);
  }
  
  // Codex (Responses API) vs Chat Completions API
  const content = isCodex
    ? (data?.output?.[0]?.content?.[0]?.text || choice.message?.content)
    : choice.message?.content;

  if (process.env.NODE_ENV !== 'production') {
    console.log('[OpenAI] Extracted content:', content);
    console.log('[OpenAI] Content type:', typeof content);
    console.log('[OpenAI] Content length:', content?.length);
    console.log('[OpenAI] Choice structure:', JSON.stringify(choice, null, 2));
  }

  if (!content || (typeof content === 'string' && !content.trim())) {
    console.error('[OpenAI] Empty content detected.');
    console.error('[OpenAI] Choice:', JSON.stringify(choice));
    console.error('[OpenAI] Full data:', JSON.stringify(data));
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
    'gemini3': 'gemini-1.5-flash',
    'gemini3pro': 'gemini-1.5-pro',
    // 레거시 매핑
    'gemini-flash': 'gemini-1.5-flash',
    'gemini-pro': 'gemini-1.5-pro',
  };

  const selectedModel = geminiModelMap[model] || 'gemini-1.5-flash';

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
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(selectedModel)}:generateContent?key=${apiKey}`, {
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
  });

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

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: modelMap[model] || 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      temperature: temperature ?? 1.0,
      top_p: 0.9,
      stream: false, // 비스트리밍으로 변경 (간결한 응답)
      system: systemMessage?.content || '당신은 도움이 되는 AI 어시스턴트입니다.',
      messages: transformed
    })
  });

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

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelMap[model] || 'sonar',
      stream: false, // 비스트리밍으로 변경 (간결한 응답)
      messages: finalMessages,
      max_tokens: 2048,
      temperature: temperature ?? 0.7,
      top_p: 0.9,
    })
  });

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

    // 개발 환경에서만 로깅
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Chat API] Model: ${modelId}, Messages: ${messages.length}`);
    }

    // 모델 시리즈별로 API 호출 - 모든 모델 JSON 응답 반환
    let responseContent: string;

    if (modelId.startsWith('gpt') || modelId === 'codex' || modelId.endsWith('codex') || modelId === 'gptimage1' || modelId === 'dalle3') {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Chat API] Calling OpenAI API${modelId === 'gptimage1' || modelId === 'dalle3' ? ' (Image Generation)' : ''}`);
      }
      responseContent = await callOpenAI(modelId, messages, userAttachments, persona, languageInstructionWithMemory);
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
    if (process.env.NODE_ENV !== 'production') {
      console.error('Chat API Error:', error);
      console.error('Error stack:', error.stack);
    }
    
    // API 키가 없는 경우 데모 응답
    if (error.message.includes('API 키가 설정되지 않았습니다')) {
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

    // 에러 타입별 처리
    let errorMessage = '응답 생성 중 오류가 발생했습니다.';
    let statusCode = 500;

    if (error.message?.includes('API 키')) {
      errorMessage = error.message;
      statusCode = 401;
    } else if (error.message?.includes('한도')) {
      errorMessage = error.message;
      statusCode = 429;
    } else if (error.message?.includes('네트워크')) {
      errorMessage = '네트워크 오류가 발생했습니다. 연결을 확인하세요.';
      statusCode = 503;
    } else if (error.message) {
      errorMessage = error.message;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.error(`[Chat API] Error:`, {
        message: errorMessage,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

