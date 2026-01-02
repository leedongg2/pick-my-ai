import { NextRequest } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// 메모리 기반 Rate Limiter (프로덕션에서는 Redis 사용 권장)
export class RateLimiter {
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(identifier: string): { success: boolean; limit: number; remaining: number; reset: number } {
    const now = Date.now();
    const record = store[identifier];

    // 기록이 없거나 윈도우가 만료된 경우
    if (!record || now > record.resetTime) {
      store[identifier] = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        reset: store[identifier].resetTime,
      };
    }

    // 제한 초과
    if (record.count >= this.maxRequests) {
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset: record.resetTime,
      };
    }

    // 카운트 증가
    record.count++;
    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - record.count,
      reset: record.resetTime,
    };
  }

  // 주기적으로 만료된 항목 정리
  static cleanup() {
    const now = Date.now();
    Object.keys(store).forEach(key => {
      if (store[key].resetTime < now) {
        delete store[key];
      }
    });
  }
}

// IP 주소 추출
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}

// 30분마다 정리 실행
if (typeof window === 'undefined') {
  setInterval(() => RateLimiter.cleanup(), 30 * 60 * 1000);
}
