/**
 * 보안 이벤트 로깅 시스템
 */

export enum SecurityEventType {
  AUTH_SUCCESS = 'AUTH_SUCCESS',
  AUTH_FAILURE = 'AUTH_FAILURE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_INPUT = 'INVALID_INPUT',
  CSRF_VIOLATION = 'CSRF_VIOLATION',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  ACCOUNT_DELETION = 'ACCOUNT_DELETION',
}

export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: Date;
  userId?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class SecurityLogger {
  private events: SecurityEvent[] = [];
  private maxEvents: number = 1000;

  /**
   * 보안 이벤트 로깅
   */
  log(event: Omit<SecurityEvent, 'timestamp'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: new Date(),
    };

    this.events.push(fullEvent);

    // 메모리 제한
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // 콘솔 로깅 (개발 환경)
    if (process.env.NODE_ENV === 'development') {
      console.log('[Security Event]', {
        type: fullEvent.type,
        severity: fullEvent.severity,
        timestamp: fullEvent.timestamp.toISOString(),
        ...fullEvent.details,
      });
    }

    // Critical 이벤트는 즉시 알림 (프로덕션)
    if (fullEvent.severity === 'critical' && process.env.NODE_ENV === 'production') {
      this.alertCriticalEvent(fullEvent);
    }

    // 프로덕션에서는 외부 로깅 서비스로 전송
    // 예: Sentry, LogRocket, DataDog 등
    this.sendToExternalLogger(fullEvent);
  }

  /**
   * 인증 성공 로깅
   */
  logAuthSuccess(userId: string, ip?: string, userAgent?: string): void {
    this.log({
      type: SecurityEventType.AUTH_SUCCESS,
      userId,
      ip,
      userAgent,
      severity: 'low',
    });
  }

  /**
   * 인증 실패 로깅
   */
  logAuthFailure(email: string, ip?: string, reason?: string): void {
    this.log({
      type: SecurityEventType.AUTH_FAILURE,
      ip,
      details: { email, reason },
      severity: 'medium',
    });
  }

  /**
   * Rate Limit 초과 로깅
   */
  logRateLimitExceeded(ip: string, endpoint: string): void {
    this.log({
      type: SecurityEventType.RATE_LIMIT_EXCEEDED,
      ip,
      details: { endpoint },
      severity: 'medium',
    });
  }

  /**
   * 잘못된 입력 로깅
   */
  logInvalidInput(userId?: string, ip?: string, details?: Record<string, any>): void {
    this.log({
      type: SecurityEventType.INVALID_INPUT,
      userId,
      ip,
      details,
      severity: 'low',
    });
  }

  /**
   * CSRF 위반 로깅
   */
  logCsrfViolation(ip?: string, endpoint?: string): void {
    this.log({
      type: SecurityEventType.CSRF_VIOLATION,
      ip,
      details: { endpoint },
      severity: 'high',
    });
  }

  /**
   * 무단 접근 시도 로깅
   */
  logUnauthorizedAccess(userId?: string, ip?: string, resource?: string): void {
    this.log({
      type: SecurityEventType.UNAUTHORIZED_ACCESS,
      userId,
      ip,
      details: { resource },
      severity: 'high',
    });
  }

  /**
   * 의심스러운 활동 로깅
   */
  logSuspiciousActivity(details: Record<string, any>, ip?: string): void {
    this.log({
      type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      ip,
      details,
      severity: 'high',
    });
  }

  /**
   * 비밀번호 변경 로깅
   */
  logPasswordChange(userId: string, ip?: string): void {
    this.log({
      type: SecurityEventType.PASSWORD_CHANGE,
      userId,
      ip,
      severity: 'medium',
    });
  }

  /**
   * 계정 삭제 로깅
   */
  logAccountDeletion(userId: string, ip?: string): void {
    this.log({
      type: SecurityEventType.ACCOUNT_DELETION,
      userId,
      ip,
      severity: 'high',
    });
  }

  /**
   * 최근 이벤트 조회
   */
  getRecentEvents(limit: number = 100): SecurityEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * 특정 타입의 이벤트 조회
   */
  getEventsByType(type: SecurityEventType): SecurityEvent[] {
    return this.events.filter(event => event.type === type);
  }

  /**
   * 특정 사용자의 이벤트 조회
   */
  getEventsByUser(userId: string): SecurityEvent[] {
    return this.events.filter(event => event.userId === userId);
  }

  /**
   * Critical 이벤트 알림
   */
  private alertCriticalEvent(event: SecurityEvent): void {
    // 실제 구현: 이메일, Slack, PagerDuty 등으로 알림
    console.error('[CRITICAL SECURITY EVENT]', event);
    
    // TODO: 실제 알림 시스템 연동
    // - 이메일 발송
    // - Slack 웹훅
    // - SMS 알림
  }

  /**
   * 외부 로깅 서비스로 전송
   */
  private sendToExternalLogger(event: SecurityEvent): void {
    // 프로덕션 환경에서만 실행
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    // TODO: 외부 로깅 서비스 연동
    // 예: Sentry, LogRocket, DataDog, CloudWatch 등
    
    try {
      // Sentry 예시
      // Sentry.captureMessage(`Security Event: ${event.type}`, {
      //   level: event.severity,
      //   extra: event,
      // });
    } catch (error) {
      console.error('Failed to send security event to external logger:', error);
    }
  }

  /**
   * IP별 실패 횟수 추적
   */
  getFailureCountByIp(ip: string, timeWindowMs: number = 15 * 60 * 1000): number {
    const cutoffTime = Date.now() - timeWindowMs;
    
    return this.events.filter(
      event =>
        event.ip === ip &&
        event.type === SecurityEventType.AUTH_FAILURE &&
        event.timestamp.getTime() > cutoffTime
    ).length;
  }

  /**
   * 의심스러운 IP 탐지
   */
  isSuspiciousIp(ip: string): boolean {
    const recentFailures = this.getFailureCountByIp(ip, 15 * 60 * 1000);
    
    // 15분 내 5회 이상 실패 시 의심스러운 IP로 판단
    return recentFailures >= 5;
  }
}

// 싱글톤 인스턴스
export const securityLogger = new SecurityLogger();
