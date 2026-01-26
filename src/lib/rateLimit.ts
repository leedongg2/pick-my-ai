import { NextRequest } from 'next/server';
import { securityLog } from './security';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
    violations: number; // 위반 횟수
    lastViolation?: number; // 마지막 위반 시간
    blocked?: boolean; // 차단 여부
    blockUntil?: number; // 차단 해제 시간
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

    // 차단된 사용자 확인
    if (record?.blocked && record.blockUntil && now < record.blockUntil) {
      securityLog('warn', 'Rate limit 차단된 요청', { 
        identifier, 
        blockUntil: new Date(record.blockUntil).toISOString() 
      });
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset: record.blockUntil,
      };
    }

    // 차단 해제
    if (record?.blocked && record.blockUntil && now >= record.blockUntil) {
      record.blocked = false;
      record.blockUntil = undefined;
      record.violations = 0;
      securityLog('info', 'Rate limit 차단 해제', { identifier });
    }

    // 기록이 없거나 윈도우가 만료된 경우
    if (!record || now > record.resetTime) {
      store[identifier] = {
        count: 1,
        resetTime: now + this.windowMs,
        violations: record?.violations || 0,
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
      record.violations = (record.violations || 0) + 1;
      record.lastViolation = now;
      
      // 3회 이상 위반 시 1시간 차단
      if (record.violations >= 3) {
        record.blocked = true;
        record.blockUntil = now + (60 * 60 * 1000); // 1시간
        securityLog('error', 'Rate limit 반복 위반으로 차단', { 
          identifier, 
          violations: record.violations,
          blockUntil: new Date(record.blockUntil).toISOString()
        });
      } else {
        securityLog('warn', 'Rate limit 초과', { 
          identifier, 
          violations: record.violations,
          count: record.count,
          limit: this.maxRequests
        });
      }
      
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset: record.resetTime,
      };
    }

    // 카운트 증가
    record.count++;
    
    // 90% 도달 시 경고
    if (record.count >= this.maxRequests * 0.9) {
      securityLog('warn', 'Rate limit 임계값 근접', { 
        identifier, 
        count: record.count, 
        limit: this.maxRequests 
      });
    }
    
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
    let cleanedCount = 0;
    Object.keys(store).forEach(key => {
      const record = store[key];
      // 차단되지 않았고 윈도우가 만료된 경우만 삭제
      if (!record.blocked && record.resetTime < now) {
        delete store[key];
        cleanedCount++;
      }
    });
    if (cleanedCount > 0) {
      securityLog('info', 'Rate limit 스토어 정리 완료', { cleanedCount });
    }
  }
  
  // 통계 조회
  static getStats(): { total: number; blocked: number; active: number } {
    const now = Date.now();
    let total = 0;
    let blocked = 0;
    let active = 0;
    
    Object.values(store).forEach(record => {
      total++;
      if (record.blocked) blocked++;
      if (record.resetTime > now) active++;
    });
    
    return { total, blocked, active };
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
  setInterval(() => {
    RateLimiter.cleanup();
    const stats = RateLimiter.getStats();
    if (stats.total > 0) {
      securityLog('info', 'Rate limit 통계', stats);
    }
  }, 30 * 60 * 1000);
}
