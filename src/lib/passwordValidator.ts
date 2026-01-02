/**
 * 비밀번호 보안 정책 검증
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

export class PasswordValidator {
  private static readonly MIN_LENGTH = 8;
  private static readonly MAX_LENGTH = 128;

  /**
   * 비밀번호 강도 및 정책 검증
   */
  static validate(password: string): PasswordValidationResult {
    const errors: string[] = [];

    // 길이 검증
    if (password.length < this.MIN_LENGTH) {
      errors.push(`비밀번호는 최소 ${this.MIN_LENGTH}자 이상이어야 합니다.`);
    }

    if (password.length > this.MAX_LENGTH) {
      errors.push(`비밀번호는 최대 ${this.MAX_LENGTH}자 이하여야 합니다.`);
    }

    // 복잡도 검증
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    let complexityCount = 0;
    if (hasUpperCase) complexityCount++;
    if (hasLowerCase) complexityCount++;
    if (hasNumbers) complexityCount++;
    if (hasSpecialChar) complexityCount++;

    if (complexityCount < 3) {
      errors.push('비밀번호는 대문자, 소문자, 숫자, 특수문자 중 최소 3가지를 포함해야 합니다.');
    }

    // 연속된 문자 검증
    if (/(.)\1{2,}/.test(password)) {
      errors.push('동일한 문자가 3번 이상 연속될 수 없습니다.');
    }

    // 일반적인 패턴 검증
    const commonPatterns = [
      /^123456/,
      /password/i,
      /qwerty/i,
      /abc123/i,
      /admin/i,
      /letmein/i,
      /welcome/i,
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        errors.push('너무 흔한 비밀번호 패턴입니다. 다른 비밀번호를 사용해주세요.');
        break;
      }
    }

    // 강도 계산
    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    
    if (errors.length === 0) {
      if (password.length >= 12 && complexityCount === 4) {
        strength = 'strong';
      } else if (password.length >= 10 && complexityCount >= 3) {
        strength = 'medium';
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength,
    };
  }

  /**
   * 비밀번호 강도 점수 계산 (0-100)
   */
  static calculateStrength(password: string): number {
    let score = 0;

    // 길이 점수 (최대 40점)
    score += Math.min(password.length * 2, 40);

    // 복잡도 점수 (각 10점, 최대 40점)
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/\d/.test(password)) score += 10;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 10;

    // 다양성 점수 (최대 20점)
    const uniqueChars = new Set(password).size;
    score += Math.min(uniqueChars * 2, 20);

    // 패턴 감점
    if (/(.)\1{2,}/.test(password)) score -= 10;
    if (/^123456/.test(password) || /password/i.test(password)) score -= 20;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 이메일과 비밀번호 유사도 검증
   */
  static checkEmailSimilarity(password: string, email: string): boolean {
    const emailLocal = email.split('@')[0].toLowerCase();
    const passwordLower = password.toLowerCase();

    // 이메일 로컬 부분이 비밀번호에 포함되어 있는지 확인
    if (passwordLower.includes(emailLocal) || emailLocal.includes(passwordLower)) {
      return false; // 유사함
    }

    return true; // 유사하지 않음
  }
}

/**
 * 비밀번호 해싱 (클라이언트 측에서는 사용하지 않음, 서버 측에서만 사용)
 * 실제 프로덕션에서는 bcrypt 등의 라이브러리 사용 권장
 */
export async function hashPassword(password: string): Promise<string> {
  // 브라우저 환경에서는 Web Crypto API 사용
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Node.js 환경
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(password).digest('hex');
}
