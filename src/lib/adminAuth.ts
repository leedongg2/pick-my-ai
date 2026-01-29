import crypto from 'crypto';

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// 비밀번호 실패 추적 (IP 기반)
interface LoginAttempt {
  count: number;
  lockedUntil: number | null;
  lastAttempt: number;
}

const loginAttempts = new Map<string, LoginAttempt>();

// 설정
const MAX_ATTEMPTS = parseInt(process.env.ADMIN_MAX_ATTEMPTS || '5');
const LOCKOUT_DURATION = parseInt(process.env.ADMIN_LOCKOUT_DURATION || '1800000'); // 30분 (밀리초)

// IP별 로그인 시도 기록
export function recordLoginAttempt(ip: string, success: boolean): { allowed: boolean; remainingAttempts?: number; lockedUntil?: number } {
  const now = Date.now();
  let attempt = loginAttempts.get(ip);

  if (!attempt) {
    attempt = { count: 0, lockedUntil: null, lastAttempt: now };
    loginAttempts.set(ip, attempt);
  }

  // 잠금 확인
  if (attempt.lockedUntil && now < attempt.lockedUntil) {
    return {
      allowed: false,
      lockedUntil: attempt.lockedUntil
    };
  }

  // 잠금 시간이 지났으면 초기화
  if (attempt.lockedUntil && now >= attempt.lockedUntil) {
    attempt.count = 0;
    attempt.lockedUntil = null;
  }

  if (success) {
    // 성공 시 초기화
    attempt.count = 0;
    attempt.lockedUntil = null;
    attempt.lastAttempt = now;
    return { allowed: true };
  } else {
    // 실패 시 카운트 증가
    attempt.count++;
    attempt.lastAttempt = now;

    if (attempt.count >= MAX_ATTEMPTS) {
      // 최대 시도 횟수 초과 - 잠금
      attempt.lockedUntil = now + LOCKOUT_DURATION;
      return {
        allowed: false,
        lockedUntil: attempt.lockedUntil
      };
    }

    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS - attempt.count
    };
  }
}

// IP 잠금 상태 확인
export function isIPLocked(ip: string): { locked: boolean; lockedUntil?: number } {
  const attempt = loginAttempts.get(ip);
  const now = Date.now();

  if (!attempt || !attempt.lockedUntil) {
    return { locked: false };
  }

  if (now < attempt.lockedUntil) {
    return { locked: true, lockedUntil: attempt.lockedUntil };
  }

  // 잠금 시간이 지났으면 초기화
  attempt.count = 0;
  attempt.lockedUntil = null;
  return { locked: false };
}

// 관리자 비밀번호 검증
export function verifyAdminPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword) {
    console.error('⚠️ ADMIN_PASSWORD가 설정되지 않았습니다!');
    return false;
  }

  return password === adminPassword;
}

// 간단한 토큰 생성 (role + timestamp + signature)
export function generateAdminToken(): string {
  const payload = {
    role: 'admin',
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24시간
  };
  
  const payloadStr = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadStr).toString('base64');
  
  // HMAC 서명 생성
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payloadBase64)
    .digest('base64');
  
  return `${payloadBase64}.${signature}`;
}

// 토큰 검증
export function verifyAdminToken(token: string): boolean {
  try {
    const [payloadBase64, signature] = token.split('.');
    
    // 서명 검증
    const expectedSignature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(payloadBase64)
      .digest('base64');
    
    if (signature !== expectedSignature) {
      return false;
    }
    
    // 페이로드 파싱 및 만료 시간 확인
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
    
    if (payload.exp < Date.now()) {
      return false; // 토큰 만료
    }
    
    return payload.role === 'admin';
  } catch (error) {
    return false;
  }
}

// 정리 작업 (1시간마다 오래된 데이터 삭제)
setInterval(() => {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  
  Array.from(loginAttempts.entries()).forEach(([ip, attempt]) => {
    if (now - attempt.lastAttempt > ONE_HOUR && (!attempt.lockedUntil || now > attempt.lockedUntil)) {
      loginAttempts.delete(ip);
    }
  });
}, 60 * 60 * 1000);
