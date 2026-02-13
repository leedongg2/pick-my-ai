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

  let lastError: Error | null = null;

  const getBackoffDelay = (attempt: number) => {
    const baseDelay = Math.min(maxRetryDelay, retryDelay * 2 ** attempt);
    const jitter = Math.random() * baseDelay * 0.2;
    return baseDelay + jitter;
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
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

      // AbortError나 네트워크 에러는 재시도
      if (attempt < maxRetries && (error.name === 'AbortError' || error.message?.includes('fetch'))) {
        await new Promise(resolve => setTimeout(resolve, getBackoffDelay(attempt)));
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error('네트워크 요청 실패');
}
