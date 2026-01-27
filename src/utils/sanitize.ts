// 사용자 입력 살균 및 검증

/**
 * XSS 방지를 위한 HTML 이스케이프
 */
export function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * 파일명 살균 (경로 탐색 방지)
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 255);
}

/**
 * URL 검증
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * 이메일 검증
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * SQL Injection 방지를 위한 문자열 살균
 */
export function sanitizeSqlString(str: string): string {
  return str.replace(/['";\\]/g, '');
}

/**
 * 메시지 길이 검증
 */
export function validateMessageLength(
  message: string,
  maxLength: number = 50000
): { valid: boolean; error?: string } {
  if (!message || message.trim().length === 0) {
    return { valid: false, error: '메시지를 입력하세요.' };
  }
  if (message.length > maxLength) {
    return { valid: false, error: `메시지가 너무 깁니다. (최대 ${maxLength}자)` };
  }
  return { valid: true };
}

/**
 * 악성 스크립트 패턴 감지
 */
export function detectMaliciousPatterns(text: string): boolean {
  const maliciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick, onerror 등
    /<iframe/i,
    /eval\(/i,
    /document\.cookie/i,
  ];
  return maliciousPatterns.some(pattern => pattern.test(text));
}

/**
 * 안전한 문자열 검증 (전체 검증)
 */
export function validateAndSanitizeInput(input: string): {
  sanitized: string;
  isSafe: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  let sanitized = input.trim();

  // 길이 검증
  const lengthValidation = validateMessageLength(sanitized);
  if (!lengthValidation.valid) {
    errors.push(lengthValidation.error!);
  }

  // 악성 패턴 감지
  if (detectMaliciousPatterns(sanitized)) {
    errors.push('허용되지 않는 패턴이 감지되었습니다.');
  }

  return {
    sanitized,
    isSafe: errors.length === 0,
    errors
  };
}
