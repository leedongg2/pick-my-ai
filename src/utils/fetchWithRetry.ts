// 네트워크 요청 재시도 유틸리티

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    timeout = 30000
  } = retryOptions;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // 성공 또는 재시도 불가능한 에러 (400-499)
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // 서버 에러 (500-599)는 재시도
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        continue;
      }

      return response;
    } catch (error: any) {
      lastError = error;

      // AbortError나 네트워크 에러는 재시도
      if (attempt < maxRetries && (error.name === 'AbortError' || error.message?.includes('fetch'))) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error('네트워크 요청 실패');
}
