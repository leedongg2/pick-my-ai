// 네트워크 요청 재시도 유틸리티

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  maxRetryDelay?: number;
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    timeout = 30000,
    maxRetryDelay = 10000
  } = retryOptions;

  console.log('[fetchWithRetry] Starting request:', {
    url,
    method: options.method || 'GET',
    hasBody: !!options.body,
    timeout,
    maxRetries
  });

  let lastError: Error | null = null;

  const getBackoffDelay = (attempt: number) => {
    const baseDelay = Math.min(maxRetryDelay, retryDelay * 2 ** attempt);
    const jitter = Math.random() * baseDelay * 0.2;
    return baseDelay + jitter;
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    console.log(`[fetchWithRetry] Attempt ${attempt + 1}/${maxRetries + 1}`);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      try {
        console.log('[fetchWithRetry] Calling native fetch...');
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        console.log('[fetchWithRetry] Native fetch returned:', {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText
        });

        // 성공 또는 재시도 불가능한 에러 (400-499)
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return response;
        }

        // 서버 에러 (500-599)는 재시도
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, getBackoffDelay(attempt)));
          continue;
        }

        return response;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error: any) {
      lastError = error;
      console.error('[fetchWithRetry] Fetch error on attempt', attempt + 1, ':', {
        name: error.name,
        message: error.message
      });

      // AbortError나 네트워크 에러는 재시도
      if (attempt < maxRetries && (error.name === 'AbortError' || error.message?.includes('fetch'))) {
        const delay = getBackoffDelay(attempt);
        console.log(`[fetchWithRetry] Retrying after ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      console.error('[fetchWithRetry] Max retries reached or non-retryable error');
      throw error;
    }
  }

  console.error('[fetchWithRetry] All attempts failed');

  const finalError = lastError || new Error('네트워크 요청 실패');
  console.error('[fetchWithRetry] Throwing final error:', finalError.message);
  throw finalError;
}
