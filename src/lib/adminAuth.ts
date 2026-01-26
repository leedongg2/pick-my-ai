import crypto from 'crypto';

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

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
