// 향상된 Rate Limiting 유틸리티

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
  blockedUntil?: number;
}

export class EnhancedRateLimiter {
  private records: Map<string, RateLimitRecord> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      blockDurationMs: 60000, // 기본 1분 차단
      ...config
    };

    // 주기적으로 오래된 레코드 정리
    setInterval(() => this.cleanup(), 60000);
  }

  check(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  } {
    const now = Date.now();
    let record = this.records.get(identifier);

    // 차단 확인
    if (record?.blockedUntil && now < record.blockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
        retryAfter: Math.ceil((record.blockedUntil - now) / 1000)
      };
    }

    // 새 레코드 또는 윈도우 리셋
    if (!record || now >= record.resetTime) {
      record = {
        count: 1,
        resetTime: now + this.config.windowMs
      };
      this.records.set(identifier, record);
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: record.resetTime
      };
    }

    // 요청 증가
    record.count++;

    // 한도 초과 시 차단
    if (record.count > this.config.maxRequests) {
      record.blockedUntil = now + (this.config.blockDurationMs || 60000);
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
        retryAfter: Math.ceil((record.blockedUntil - now) / 1000)
      };
    }

    return {
      allowed: true,
      remaining: this.config.maxRequests - record.count,
      resetTime: record.resetTime
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (now >= record.resetTime && (!record.blockedUntil || now >= record.blockedUntil)) {
        this.records.delete(key);
      }
    }
  }

  reset(identifier: string) {
    this.records.delete(identifier);
  }
}
