import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter, getClientIp } from '@/lib/rateLimit';
import { apiKeyManager, parseRateLimitError } from '@/lib/apiKeyRotation';

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

// OpenAI API 호출 (키 로테이션 및 큐 시스템 지원) - 스트리밍 Response 반환
async function callOpenAIStreaming(model: string, messages: any[], userAttachments?: UserAttachment[], persona?: any): Promise<Response> {
  // GPT-Image-1 모델인 경우 DALL-E API 사용 (스트리밍 불필요)
  if (model === 'gptimage1') {
    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user');
    const prompt = typeof lastUserMessage?.content === 'string' 
      ? lastUserMessage.content 
      : lastUserMessage?.content?.[0]?.text || '아름다운 풍경';
    
    const imageUrl = await callDALLE(prompt);
    
    // 스트리밍 형식으로 반환
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: imageUrl })}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  }

  const apiKey = apiKeyManager.getAvailableKey('openai');
  if (!apiKey) {
    throw new Error('OpenAI API 키가 설정되지 않았습니다.');
  }

  return await executeOpenAIStreamingRequest(model, messages, apiKey, userAttachments, persona);
}

// OpenAI 실제 요청 실행 - 스트리밍 Response 반환
async function executeOpenAIStreamingRequest(model: string, messages: any[], apiKey: string, userAttachments?: UserAttachment[], persona?: any, retryCount: number = 0): Promise<Response> {

  const modelMap: { [key: string]: string } = {
    // GPT 시리즈
    'gpt5': process.env.GPT5_MODEL || 'gpt-5',
    'gpt51': process.env.GPT51_MODEL || 'gpt-5.1',
    'gpt4o': process.env.GPT4O_MODEL || 'gpt-4o',
    'gpt41': process.env.GPT41_MODEL || 'gpt-4.1',
    // OpenAI o 시리즈
    'o3': process.env.O3_MODEL || 'o3',
    'o3mini': process.env.O3_MINI_MODEL || 'o3-mini',
    'o4mini': process.env.O4_MINI_MODEL || 'o4-mini',
    // 코딩 모델
    'codex': process.env.CODEX_MODEL || 'gpt-5-codex',
    'gpt5codex': process.env.GPT5_CODEX_MODEL || 'gpt-5-codex',
    'gpt51codex': process.env.GPT51_CODEX_MODEL || 'gpt-5.1-codex',
    // 이미지 모델
    'gptimage1': process.env.GPT_IMAGE_1_MODEL || 'dall-e-3',
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
  const isGPT5Series = model === 'gpt5' || model === 'gpt51';
  const isCodingModel = model === 'codex' || model === 'gpt5codex' || model === 'gpt51codex';
  
  const baseSystemPrompt = isGPT5Series
    ? '당신은 도움이 되는 AI 어시스턴트입니다. 사용자의 질문에 최대한 상세하고 포괄적으로 답변하세요.\n\n서식 규칙:\n- 중요하거나 강조하고 싶은 내용: **강조할 내용**\n- 섹션 제목이나 주요 주제: ## 제목 내용\n\n답변을 구조화할 때 ## 제목을 적극 활용하세요.'
    : isCodingModel
    ? '당신은 전문 프로그래밍 어시스턴트입니다. 코드 작성, 디버깅, 최적화, 설명에 특화되어 있습니다.\n\n서식 규칙:\n- 코드는 명확하고 효율적으로 작성하며 주석 포함\n- 중요한 부분: **강조**\n- 섹션 제목: ## 제목\n\n답변을 구조화할 때 ## 제목을 사용하세요.'
    : '';
  
  const personaPrompt = persona ? buildPersonaPrompt(persona) : '';
  const systemContent = personaPrompt ? `${baseSystemPrompt}\n\n${personaPrompt}` : baseSystemPrompt;
  
  const finalMessages = (isGPT5Series || isCodingModel) && systemContent
    ? [
        {
          role: 'system',
          content: systemContent
        },
        ...transformedMessages
      ]
    : transformedMessages;

  // GPT-5 시리즈는 temperature를 지원하지 않으므로 제외
  const requestBody: any = {
    model: selectedModel,
    messages: finalMessages,
    max_completion_tokens: isGPT5Series ? 2000 : 1500 // 속도 개선을 위해 토큰 수 감소
  };
  
  // GPT-5 시리즈가 아닌 경우에만 temperature 추가
  if (!isGPT5Series) {
    requestBody.temperature = 0.7;
  }
  
  // 스트리밍 활성화
  requestBody.stream = true;
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[OpenAI] Request body:`, {
      model: requestBody.model,
      messageCount: requestBody.messages.length,
      maxTokens: requestBody.max_completion_tokens,
      stream: requestBody.stream
    });
  }

  // Codex 모델은 /v1/responses 엔드포인트 사용
  const isCodexModel = selectedModel.includes('codex');
  const endpoint = isCodexModel 
    ? 'https://api.openai.com/v1/responses'
    : 'https://api.openai.com/v1/chat/completions';
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[OpenAI] Using endpoint: ${endpoint}`);
  }

  // Responses API는 다른 파라미터 구조 사용
  let apiRequestBody: any;
  if (isCodexModel) {
    // Responses API 형식
    apiRequestBody = {
      model: requestBody.model,
      input: requestBody.messages, // messages -> input
      max_tokens: requestBody.max_completion_tokens,
      stream: requestBody.stream
    };
    if (requestBody.temperature !== undefined) {
      apiRequestBody.temperature = requestBody.temperature;
    }
  } else {
    // Chat Completions API 형식
    apiRequestBody = requestBody;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[OpenAI] Request body structure:`, {
      endpoint,
      hasInput: 'input' in apiRequestBody,
      hasMessages: 'messages' in apiRequestBody
    });
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(apiRequestBody)
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[OpenAI] Response status: ${response.status}`);
  }
  
  if (!response.ok) {
    const errorData = await response.json();
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
        // 현재 키를 제한 목록에 추가
        apiKeyManager.handleRateLimitError('openai', apiKey, rateLimitInfo.resetTime, rateLimitInfo.rateLimitType);
        
        // 다른 키로 재시도
        const nextKey = apiKeyManager.getAvailableKey('openai');
        if (nextKey && nextKey !== apiKey) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`OpenAI Rate Limit 감지. 다른 키로 재시도 중... (${retryCount + 1}/3)`);
          }
          return executeOpenAIStreamingRequest(model, messages, nextKey, userAttachments, persona, retryCount + 1);
        }
        
        // 모든 키가 제한된 경우
        const availability = apiKeyManager.getNextAvailableTime('openai');
        throw new Error(availability.message || 'OpenAI API 요청 한도를 초과했습니다.');
      }
    }
    
    throw error;
  }

  // 스트리밍 응답을 Server-Sent Events 형식으로 변환하여 반환
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                
                if (content) {
                  // 청크를 SSE 형식으로 전달
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                }
              } catch (e) {
                // 파싱 에러 무시
              }
            }
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[OpenAI Streaming] Error:', error);
        }
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}

// Google AI Studio (Gemini) 호출 (키 로테이션 지원)
async function callGemini(model: string, messages: any[], userAttachments?: UserAttachment[], retryCount: number = 0): Promise<string> {
  const apiKey = apiKeyManager.getAvailableKey('gemini');
  if (!apiKey) {
    throw new Error('Gemini API 키가 설정되지 않았습니다. GOOGLE_API_KEY 또는 GEMINI_API_KEY를 설정하세요.');
  }

  const geminiModelMap: { [key: string]: string } = {
    'gemini3': process.env.GEMINI_3_MODEL || 'gemini-3.0-flash',
    'gemini3pro': process.env.GEMINI_3_PRO_MODEL || 'gemini-3.0-pro',
    // 레거시 매핑
    'gemini-flash': process.env.GEMINI_FLASH_MODEL || 'gemini-1.5-flash',
    'gemini-pro': process.env.GEMINI_PRO_MODEL || 'gemini-1.5-pro',
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
      // OpenAI식 멀티모달 parts를 텍스트만 우선 반영
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

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(selectedModel)}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
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
          if (process.env.NODE_ENV !== 'production') {
            console.log(`Gemini Rate Limit 감지. 다른 키로 재시도 중... (${retryCount + 1}/3)`);
          }
          return callGemini(model, messages, userAttachments, retryCount + 1);
        }
        
        const availability = apiKeyManager.getNextAvailableTime('gemini');
        throw new Error(availability.message || 'Gemini API 요청 한도를 초과했습니다.');
      }
    }
    
    throw error;
  }

  // candidates[0].content.parts[*].text 결합
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p: any) => p?.text).filter(Boolean).join('\n');
  return text || '[Gemini] 빈 응답';
}


// Anthropic API 호출 (키 로테이션 지원)
async function callAnthropic(model: string, messages: any[], userAttachments?: UserAttachment[], retryCount: number = 0): Promise<string> {
  const apiKey = apiKeyManager.getAvailableKey('anthropic');
  
  if (!apiKey) {
    throw new Error('Anthropic API 키가 설정되지 않았습니다.');
  }

  const modelMap: { [key: string]: string } = {
    'haiku35': process.env.HAIKU_35_MODEL || 'claude-3-5-haiku-20241022',
    'sonnet45': process.env.SONNET_45_MODEL || 'claude-3-5-sonnet-20241022',
    'opus4': process.env.OPUS_4_MODEL || 'claude-opus-4-20250514',
    'opus41': process.env.OPUS_41_MODEL || 'claude-opus-4.1-20250514',
    'opus45': process.env.OPUS_45_MODEL || 'claude-opus-4.5-20250514',
    // 레거시 매핑
    'claude-haiku': process.env.CLAUDE_HAIKU_MODEL || 'claude-3-haiku-20240307',
    'claude-sonnet': process.env.CLAUDE_SONNET_MODEL || 'claude-3-5-sonnet-20241022',
    'claude-opus': process.env.CLAUDE_OPUS_MODEL || 'claude-3-opus-20240229'
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
      max_tokens: 2000,
      system: systemMessage?.content || '당신은 도움이 되는 AI 어시스턴트입니다.',
      messages: transformed
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
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
          if (process.env.NODE_ENV !== 'production') {
            console.log(`Anthropic Rate Limit 감지. 다른 키로 재시도 중... (${retryCount + 1}/3)`);
          }
          return callAnthropic(model, messages, userAttachments, retryCount + 1);
        }
        
        const availability = apiKeyManager.getNextAvailableTime('anthropic');
        throw new Error(availability.message || 'Anthropic API 요청 한도를 초과했습니다.');
      }
    }
    
    throw error;
  }

  const data = await response.json();
  return data.content[0].text;
}

// Perplexity API 호출 (키 로테이션 지원)
async function callPerplexity(model: string, messages: any[], userAttachments?: UserAttachment[], retryCount: number = 0): Promise<string> {
  const apiKey = apiKeyManager.getAvailableKey('perplexity');
  
  if (!apiKey) {
    throw new Error('Perplexity API 키가 설정되지 않았습니다.');
  }

  const modelMap: { [key: string]: string } = {
    'sonar': process.env.SONAR_MODEL || 'sonar',
    'sonarPro': process.env.SONAR_PRO_MODEL || 'sonar-pro',
    'deepResearch': process.env.DEEP_RESEARCH_MODEL || 'sonar-reasoning',
    // 레거시 매핑
    'perplexity-sonar': process.env.PERPLEXITY_SONAR_MODEL || 'sonar',
    'perplexity-sonar-pro': process.env.PERPLEXITY_SONAR_PRO_MODEL || 'sonar-pro',
    'perplexity-deep-research': process.env.PERPLEXITY_DEEP_RESEARCH_MODEL || 'sonar-reasoning'
  };

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelMap[model] || 'sonar',
      // Perplexity는 현재 이미지 업로드 미지원. 첨부가 있으면 안내 문구를 본문에 덧붙임
      messages: (() => {
        if (!userAttachments?.length) return messages;
        const msgs = [...messages];
        const lastIdx = [...msgs].reverse().findIndex((m: any) => m.role === 'user');
        if (lastIdx === -1) return messages;
        const idx = msgs.length - 1 - lastIdx;
        const last = msgs[idx];
        const note = `\n\n[첨부 ${userAttachments.length}개는 이 모델에서 직접 처리되지 않아 제외되었습니다.]`;
        msgs[idx] = { ...last, content: `${last.content || ''}${note}` };
        return msgs;
      })()
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    const error: any = new Error(errorData.error?.message || 'Perplexity API 오류');
    error.status = response.status;
    error.response = { status: response.status, headers: response.headers };
    
    // 429 에러 처리
    if (response.status === 429 && retryCount < 3) {
      const rateLimitInfo = parseRateLimitError(error);
      
      if (rateLimitInfo.isRateLimit) {
        apiKeyManager.handleRateLimitError('perplexity', apiKey, rateLimitInfo.resetTime, rateLimitInfo.rateLimitType);
        
        const nextKey = apiKeyManager.getAvailableKey('perplexity');
        if (nextKey && nextKey !== apiKey) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`Perplexity Rate Limit 감지. 다른 키로 재시도 중... (${retryCount + 1}/3)`);
          }
          return callPerplexity(model, messages, userAttachments, retryCount + 1);
        }
        
        const availability = apiKeyManager.getNextAvailableTime('perplexity');
        throw new Error(availability.message || 'Perplexity API 요청 한도를 초과했습니다.');
      }
    }
    
    throw error;
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function POST(request: NextRequest) {
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

    const { modelId, messages, userAttachments, persona } = await request.json();

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

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Chat API] Processing request for model: ${modelId}`);
      console.log(`[Chat API] Messages count: ${messages.length}`);
    }

    // 모델 시리즈별로 API 호출 - OpenAI는 스트리밍 응답 반환
    if (modelId.startsWith('gpt') || modelId === 'codex' || modelId.endsWith('codex') || modelId === 'gptimage1') {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Chat API] Calling OpenAI API (Streaming)${modelId === 'gptimage1' ? ' (DALL-E)' : ''}`);
      }
      const streamResponse = await callOpenAIStreaming(modelId, messages, userAttachments, persona);
      return streamResponse;
    }
    
    // 나머지 모델들은 기존 방식 유지
    let response: string;
    
    if (modelId.startsWith('gemini')) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Chat API] Calling Gemini API');
      }
      response = await callGemini(modelId, messages, userAttachments);
    } else if (modelId.startsWith('claude')) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Chat API] Calling Anthropic API');
      }
      response = await callAnthropic(modelId, messages, userAttachments);
    } else if (modelId.startsWith('perplexity')) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Chat API] Calling Perplexity API');
      }
      response = await callPerplexity(modelId, messages, userAttachments);
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Chat API] Unknown model, using demo response');
      }
      // API 키가 없으면 데모 응답
      response = `[${modelId}] 안녕하세요! 질문에 답변드리겠습니다. (API 키가 설정되지 않아 데모 모드로 실행 중입니다. .env.local 파일에 API 키를 추가하세요.)`;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Chat API] Response length: ${response?.length || 0} characters`);
    }

    return NextResponse.json(
      { content: response },
      {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString()
        }
      }
    );

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

    // 빈 응답 에러인 경우 더 자세한 정보 제공
    const errorMessage = error.message || '응답 생성 중 오류가 발생했습니다.';
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[Chat API] Returning error to client: ${errorMessage}`);
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

