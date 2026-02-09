/**
 * API 키 로테이션 및 Rate Limit 관리 시스템
 * 고급 큐 시스템 및 429 에러 방지 기능 포함
 * 보안 강화: 키 검증, 마스킹, 암호화 지원
 */

import { validateApiKey, maskApiKey, securityLog } from './security';

interface ApiKeyStatus {
  key: string;
  isAvailable: boolean;
  rateLimitResetTime?: number; // Unix timestamp
  rateLimitType?: 'minute' | 'day';
  lastError?: string;
  lastUsedTime?: number; // 마지막 사용 시간
  requestCount?: number; // 분당 요청 수
  requestCountResetTime?: number; // 요청 카운트 리셋 시간
  activeRequests?: number; // 현재 진행 중인 요청 수
}

interface QueuedRequest {
  id: string;
  provider: string;
  priority: number;
  createdAt: number;
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

interface ApiKeyPool {
  openai: ApiKeyStatus[];
  anthropic: ApiKeyStatus[];
  gemini: ApiKeyStatus[];
  perplexity: ApiKeyStatus[];
}

class ApiKeyRotationManager {
  private keyPools: ApiKeyPool = {
    openai: [],
    anthropic: [],
    gemini: [],
    perplexity: [],
  };

  private requestQueue: QueuedRequest[] = [];
  private isProcessingQueue: boolean = false;
  
  // 설정 값
  private readonly MIN_REQUEST_INTERVAL = 150; // ms - 요청 간 최소 간격
  private readonly MAX_CONCURRENT_REQUESTS_PER_KEY = 3; // 키당 최대 동시 요청
  private readonly MAX_REQUESTS_PER_MINUTE = 50; // 분당 최대 요청 수
  private readonly QUEUE_PROCESS_INTERVAL = 50; // ms - 큐 처리 간격

  constructor() {
    this.initializeKeyPools();
    this.startQueueProcessor();
  }

  /**
   * 큐 프로세서 시작
   */
  private startQueueProcessor(): void {
    setInterval(() => {
      this.processQueue();
    }, this.QUEUE_PROCESS_INTERVAL);
  }

  /**
   * 환경 변수에서 API 키 풀 초기화
   */
  private initializeKeyPools(): void {
    // OpenAI 키 (OPENAI_API_KEY_1, OPENAI_API_KEY_2, OPENAI_API_KEY_3)
    for (let i = 1; i <= 3; i++) {
      const key = process.env[`OPENAI_API_KEY_${i}`] || (i === 1 ? process.env.OPENAI_API_KEY : '');
      if (key) {
        // API 키 유효성 검증
        if (!validateApiKey(key, 'openai')) {
          securityLog('warn', `OpenAI API 키 ${i} 형식이 올바르지 않습니다`, { keyMask: maskApiKey(key) });
          continue;
        }
        this.keyPools.openai.push({
          key,
          isAvailable: true,
        });
        securityLog('info', `OpenAI API 키 ${i} 로드 완료`, { keyMask: maskApiKey(key) });
      }
    }

    // Anthropic 키
    for (let i = 1; i <= 3; i++) {
      const key = process.env[`ANTHROPIC_API_KEY_${i}`] || (i === 1 ? process.env.ANTHROPIC_API_KEY : '');
      if (key) {
        if (!validateApiKey(key, 'anthropic')) {
          securityLog('warn', `Anthropic API 키 ${i} 형식이 올바르지 않습니다`, { keyMask: maskApiKey(key) });
          continue;
        }
        this.keyPools.anthropic.push({
          key,
          isAvailable: true,
        });
        securityLog('info', `Anthropic API 키 ${i} 로드 완료`, { keyMask: maskApiKey(key) });
      }
    }

    // Gemini 키
    for (let i = 1; i <= 3; i++) {
      const key = process.env[`GOOGLE_API_KEY_${i}`] || (i === 1 ? process.env.GOOGLE_API_KEY : '');
      if (key) {
        if (!validateApiKey(key, 'google')) {
          securityLog('warn', `Google API 키 ${i} 형식이 올바르지 않습니다`, { keyMask: maskApiKey(key) });
          continue;
        }
        this.keyPools.gemini.push({
          key,
          isAvailable: true,
        });
        securityLog('info', `Google API 키 ${i} 로드 완료`, { keyMask: maskApiKey(key) });
      }
    }

    // Perplexity 키
    for (let i = 1; i <= 3; i++) {
      const key = process.env[`PERPLEXITY_API_KEY_${i}`] || (i === 1 ? process.env.PERPLEXITY_API_KEY : '');
      if (key) {
        if (!validateApiKey(key, 'perplexity')) {
          securityLog('warn', `Perplexity API 키 ${i} 형식이 올바르지 않습니다`, { keyMask: maskApiKey(key) });
          continue;
        }
        this.keyPools.perplexity.push({
          key,
          isAvailable: true,
        });
        securityLog('info', `Perplexity API 키 ${i} 로드 완료`, { keyMask: maskApiKey(key) });
      }
    }
  }

  /**
   * 사용 가능한 API 키 가져오기
   */
  getAvailableKey(provider: 'openai' | 'anthropic' | 'gemini' | 'perplexity'): string | null {
    const pool = this.keyPools[provider];
    
    if (!pool || pool.length === 0) {
      return null;
    }

    const now = Date.now();

    // 1. 사용 가능한 키 찾기
    const availableKey = pool.find(k => k.isAvailable && (!k.rateLimitResetTime || k.rateLimitResetTime <= now));
    if (availableKey) {
      return availableKey.key;
    }

    // 2. 모든 키가 제한된 경우, 가장 빨리 풀리는 키 찾기
    const soonestKey = pool
      .filter(k => k.rateLimitResetTime)
      .sort((a, b) => (a.rateLimitResetTime || 0) - (b.rateLimitResetTime || 0))[0];

    if (soonestKey && soonestKey.rateLimitResetTime && soonestKey.rateLimitResetTime <= now) {
      // 제한이 풀렸으면 다시 사용 가능으로 설정
      soonestKey.isAvailable = true;
      soonestKey.rateLimitResetTime = undefined;
      return soonestKey.key;
    }

    // 3. 모든 키가 제한 중이면 가장 빨리 풀리는 키 반환 (에러 메시지용)
    return soonestKey ? soonestKey.key : pool[0].key;
  }

  /**
   * Rate Limit 에러 처리
   */
  handleRateLimitError(
    provider: 'openai' | 'anthropic' | 'gemini' | 'perplexity',
    apiKey: string,
    resetTime?: number,
    rateLimitType?: 'minute' | 'day'
  ): void {
    const pool = this.keyPools[provider];
    const keyStatus = pool.find(k => k.key === apiKey);

    if (keyStatus) {
      keyStatus.isAvailable = false;
      keyStatus.rateLimitResetTime = resetTime || this.calculateResetTime(rateLimitType);
      keyStatus.rateLimitType = rateLimitType;
      keyStatus.lastError = `Rate limit exceeded (${rateLimitType || 'unknown'})`;
    }
  }

  /**
   * Reset 시간 계산
   */
  private calculateResetTime(rateLimitType?: 'minute' | 'day'): number {
    const now = Date.now();
    
    if (rateLimitType === 'minute') {
      // 1분 후
      return now + 60 * 1000;
    } else if (rateLimitType === 'day') {
      // 내일 자정 (UTC 기준)
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);
      return tomorrow.getTime();
    }
    
    // 기본값: 1분 후
    return now + 60 * 1000;
  }

  /**
   * 다음 사용 가능 시간 가져오기
   */
  getNextAvailableTime(provider: 'openai' | 'anthropic' | 'gemini' | 'perplexity'): {
    available: boolean;
    resetTime?: number;
    waitSeconds?: number;
    message?: string;
  } {
    const pool = this.keyPools[provider];
    const now = Date.now();

    // 사용 가능한 키가 있는지 확인
    const hasAvailable = pool.some(k => k.isAvailable && (!k.rateLimitResetTime || k.rateLimitResetTime <= now));
    
    if (hasAvailable) {
      return { available: true };
    }

    // 가장 빨리 풀리는 키 찾기
    const soonestKey = pool
      .filter(k => k.rateLimitResetTime)
      .sort((a, b) => (a.rateLimitResetTime || 0) - (b.rateLimitResetTime || 0))[0];

    if (!soonestKey || !soonestKey.rateLimitResetTime) {
      return { 
        available: false, 
        message: 'API 키를 사용할 수 없습니다.' 
      };
    }

    const waitSeconds = Math.ceil((soonestKey.rateLimitResetTime - now) / 1000);
    const rateLimitType = soonestKey.rateLimitType;

    let message = '';
    if (rateLimitType === 'minute') {
      message = `분당 요청 한도를 초과했습니다. 1분 후에 다시 시도해주세요.`;
    } else if (rateLimitType === 'day') {
      message = `일일 요청 한도를 초과했습니다. 내일 다시 시도해주세요.`;
    } else {
      message = `요청 한도를 초과했습니다. ${Math.ceil(waitSeconds / 60)}분 후에 다시 시도해주세요.`;
    }

    return {
      available: false,
      resetTime: soonestKey.rateLimitResetTime,
      waitSeconds,
      message,
    };
  }

  /**
   * 키 상태 초기화 (테스트용)
   */
  resetKeyStatus(provider: 'openai' | 'anthropic' | 'gemini' | 'perplexity', apiKey: string): void {
    const pool = this.keyPools[provider];
    const keyStatus = pool.find(k => k.key === apiKey);

    if (keyStatus) {
      keyStatus.isAvailable = true;
      keyStatus.rateLimitResetTime = undefined;
      keyStatus.rateLimitType = undefined;
      keyStatus.lastError = undefined;
    }
  }

  /**
   * 모든 키 상태 조회 (디버깅용)
   */
  getKeyPoolStatus(provider: 'openai' | 'anthropic' | 'gemini' | 'perplexity'): ApiKeyStatus[] {
    return this.keyPools[provider].map(k => ({
      key: k.key.substring(0, 10) + '...',
      isAvailable: k.isAvailable,
      rateLimitResetTime: k.rateLimitResetTime,
      rateLimitType: k.rateLimitType,
      lastError: k.lastError,
    }));
  }

  /**
   * 요청을 큐에 추가하고 실행
   */
  async enqueueRequest<T>(
    provider: 'openai' | 'anthropic' | 'gemini' | 'perplexity',
    execute: () => Promise<T>,
    priority: number = 0
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = `${provider}-${Date.now()}-${Math.random()}`;
      
      this.requestQueue.push({
        id: requestId,
        provider,
        priority,
        createdAt: Date.now(),
        execute,
        resolve,
        reject,
      });

      // 우선순위에 따라 정렬 (높은 우선순위 먼저)
      this.requestQueue.sort((a, b) => b.priority - a.priority);

      console.log(`[Queue] 요청 추가: ${requestId}, 대기 중: ${this.requestQueue.length}`);
    });
  }

  /**
   * 큐 처리
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      const request = this.requestQueue[0];
      const provider = request.provider as 'openai' | 'anthropic' | 'gemini' | 'perplexity';
      
      // 사용 가능한 키 확인
      const keyStatus = this.findBestAvailableKey(provider);
      
      if (!keyStatus) {
        // 사용 가능한 키가 없으면 대기
        this.isProcessingQueue = false;
        return;
      }

      // 요청 간 최소 간격 확인
      const now = Date.now();
      const timeSinceLastUse = keyStatus.lastUsedTime ? now - keyStatus.lastUsedTime : Infinity;
      
      if (timeSinceLastUse < this.MIN_REQUEST_INTERVAL) {
        // 아직 간격이 부족하면 대기
        this.isProcessingQueue = false;
        return;
      }

      // 요청 실행
      this.requestQueue.shift(); // 큐에서 제거
      
      keyStatus.lastUsedTime = now;
      keyStatus.activeRequests = (keyStatus.activeRequests || 0) + 1;
      
      // 요청 카운트 업데이트
      this.updateRequestCount(keyStatus);

      console.log(`[Queue] 요청 실행: ${request.id}, 남은 큐: ${this.requestQueue.length}`);

      try {
        const result = await request.execute();
        request.resolve(result);
      } catch (error) {
        console.error(`[Queue] 요청 실패: ${request.id}`, error);
        request.reject(error);
      } finally {
        keyStatus.activeRequests = Math.max(0, (keyStatus.activeRequests || 1) - 1);
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * 최적의 사용 가능 키 찾기
   */
  private findBestAvailableKey(provider: 'openai' | 'anthropic' | 'gemini' | 'perplexity'): ApiKeyStatus | null {
    const pool = this.keyPools[provider];
    const now = Date.now();

    // 1. 사용 가능하고 활성 요청이 적은 키 찾기
    const availableKeys = pool.filter(k => {
      // 기본 가용성 확인
      if (!k.isAvailable || (k.rateLimitResetTime && k.rateLimitResetTime > now)) {
        return false;
      }

      // 동시 요청 수 확인
      if ((k.activeRequests || 0) >= this.MAX_CONCURRENT_REQUESTS_PER_KEY) {
        return false;
      }

      // 분당 요청 수 확인
      if (k.requestCount && k.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
        if (k.requestCountResetTime && k.requestCountResetTime > now) {
          return false;
        }
      }

      // 최소 간격 확인
      if (k.lastUsedTime && (now - k.lastUsedTime) < this.MIN_REQUEST_INTERVAL) {
        return false;
      }

      return true;
    });

    if (availableKeys.length === 0) {
      return null;
    }

    // 2. 가장 최근에 사용되지 않은 키 선택 (로드 밸런싱)
    availableKeys.sort((a, b) => {
      const aLastUsed = a.lastUsedTime || 0;
      const bLastUsed = b.lastUsedTime || 0;
      return aLastUsed - bLastUsed;
    });

    return availableKeys[0];
  }

  /**
   * 요청 카운트 업데이트
   */
  private updateRequestCount(keyStatus: ApiKeyStatus): void {
    const now = Date.now();
    
    // 카운트 리셋 시간이 지났으면 초기화
    if (keyStatus.requestCountResetTime && keyStatus.requestCountResetTime <= now) {
      keyStatus.requestCount = 0;
      keyStatus.requestCountResetTime = undefined;
    }

    // 카운트 증가
    keyStatus.requestCount = (keyStatus.requestCount || 0) + 1;
    
    // 리셋 시간 설정 (1분 후)
    if (!keyStatus.requestCountResetTime) {
      keyStatus.requestCountResetTime = now + 60 * 1000;
    }
  }

  /**
   * 큐 상태 조회
   */
  getQueueStatus(): {
    queueLength: number;
    isProcessing: boolean;
    oldestRequestAge?: number;
  } {
    const oldestRequest = this.requestQueue[0];
    return {
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessingQueue,
      oldestRequestAge: oldestRequest ? Date.now() - oldestRequest.createdAt : undefined,
    };
  }
}

// 싱글톤 인스턴스
export const apiKeyManager = new ApiKeyRotationManager();

/**
 * Rate Limit 에러 파싱
 */
export function parseRateLimitError(error: any): {
  isRateLimit: boolean;
  resetTime?: number;
  rateLimitType?: 'minute' | 'day';
} {
  const errorMessage = error?.message || error?.toString() || '';
  const errorStatus = error?.status || error?.response?.status;

  // 429 에러 확인
  if (errorStatus !== 429 && !errorMessage.includes('rate limit') && !errorMessage.includes('429')) {
    return { isRateLimit: false };
  }

  // Reset 시간 추출 (헤더에서)
  let resetTime: number | undefined;
  const resetHeader = error?.response?.headers?.['x-ratelimit-reset'];
  if (resetHeader) {
    resetTime = parseInt(resetHeader) * 1000; // Unix timestamp to milliseconds
  }

  // Rate Limit 타입 추정
  let rateLimitType: 'minute' | 'day' | undefined;
  
  if (errorMessage.includes('minute') || errorMessage.includes('분당')) {
    rateLimitType = 'minute';
    resetTime = resetTime || Date.now() + 60 * 1000;
  } else if (errorMessage.includes('day') || errorMessage.includes('daily') || errorMessage.includes('일일') || errorMessage.includes('내일')) {
    rateLimitType = 'day';
    if (!resetTime) {
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);
      resetTime = tomorrow.getTime();
    }
  } else {
    // 기본값: 분당 제한으로 간주
    rateLimitType = 'minute';
    resetTime = resetTime || Date.now() + 60 * 1000;
  }

  return {
    isRateLimit: true,
    resetTime,
    rateLimitType,
  };
}
