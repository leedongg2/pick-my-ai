/**
 * 입력 데이터 검증 및 Sanitization 유틸리티
 */

/**
 * HTML 특수 문자 이스케이프 (XSS 방지)
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
 * SQL Injection 방지를 위한 문자열 검증
 */
export function validateSqlInput(input: string): boolean {
  // 위험한 SQL 키워드 패턴
  const dangerousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
    /(--|;|\/\*|\*\/|xp_|sp_)/gi,
    /('|(\\'))/gi,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(input)) {
      return false;
    }
  }

  return true;
}

/**
 * 이메일 형식 검증
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) {
    return false;
  }

  // 이메일 길이 제한
  if (email.length > 254) {
    return false;
  }

  // 로컬 파트와 도메인 파트 검증
  const [local, domain] = email.split('@');
  if (local.length > 64 || !domain) {
    return false;
  }

  return true;
}

/**
 * URL 검증
 */
export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    // HTTP(S) 프로토콜만 허용
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    // localhost 및 private IP 차단 (프로덕션 환경)
    if (process.env.NODE_ENV === 'production') {
      const hostname = parsed.hostname;
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')
      ) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * 파일명 Sanitization
 */
export function sanitizeFilename(filename: string): string {
  // 위험한 문자 제거
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 255);
}

/**
 * 경로 순회 공격 방지
 */
export function validatePath(path: string): boolean {
  // ../ 패턴 차단
  if (path.includes('..') || path.includes('./')) {
    return false;
  }

  // 절대 경로 차단
  if (path.startsWith('/') || path.includes(':\\')) {
    return false;
  }

  return true;
}

/**
 * 숫자 검증 및 범위 체크
 */
export function validateNumber(
  value: any,
  min?: number,
  max?: number
): { valid: boolean; value?: number } {
  const num = Number(value);

  if (isNaN(num) || !isFinite(num)) {
    return { valid: false };
  }

  if (min !== undefined && num < min) {
    return { valid: false };
  }

  if (max !== undefined && num > max) {
    return { valid: false };
  }

  return { valid: true, value: num };
}

/**
 * JSON 안전 파싱
 */
export function safeJsonParse<T>(json: string): { success: boolean; data?: T; error?: string } {
  try {
    const data = JSON.parse(json);
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'JSON 파싱 실패' 
    };
  }
}

/**
 * 문자열 길이 제한
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * 객체 깊이 제한 (DoS 방지)
 */
export function validateObjectDepth(obj: any, maxDepth: number = 10): boolean {
  function checkDepth(value: any, depth: number): boolean {
    if (depth > maxDepth) {
      return false;
    }

    if (typeof value === 'object' && value !== null) {
      for (const key in value) {
        if (!checkDepth(value[key], depth + 1)) {
          return false;
        }
      }
    }

    return true;
  }

  return checkDepth(obj, 0);
}

/**
 * 배열 크기 제한
 */
export function validateArraySize(arr: any[], maxSize: number): boolean {
  return Array.isArray(arr) && arr.length <= maxSize;
}

/**
 * 문자열에서 제어 문자 제거
 */
export function removeControlCharacters(str: string): string {
  return str.replace(/[\x00-\x1F\x7F]/g, '');
}

/**
 * UUID 검증
 */
export function validateUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
