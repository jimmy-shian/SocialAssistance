/**
 * wix/auth.js
 * Wix 後端認證模組
 * 
 * [功能說明]
 * - Token 產生與驗證
 * - 密碼雜湊處理
 * - 速率限制檢查
 * 
 * [部署方式]
 * 將此檔案放置於 Wix 網站後端的「Backend Web Modules」中
 */

// ==================== 環境變數 ====================
// 這些值需要在 Wix 網站後台設定
const TOKEN_SECRET = 'your-secret-key-change-in-production';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123'; // 生產環境請使用更強的密碼
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 分鐘
const RATE_LIMIT_MAX = 20; // 每分鐘最多 20 次請求

// ==================== 速率限制儲存 ====================
const rateLimitStore = new Map();

// ==================== Token 產生與驗證 ====================

/**
 * 產生 HMAC Token
 * @param {string} username - 使用者名稱
 * @param {number} timestamp - 時間戳記
 * @returns {string} - JWT 格式的 token
 */
export function signToken(username, timestamp) {
  const payload = {
    user: username,
    iat: timestamp,
    exp: timestamp + (7 * 24 * 60 * 60 * 1000) // 7 天過期
  };
  
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signature = hmacSha256(`${header}.${payloadEncoded}`, TOKEN_SECRET);
  
  return `${header}.${payloadEncoded}.${signature}`;
}

/**
 * 驗證 Token
 * @param {string} token - JWT Token
 * @returns {object} - { ok: boolean, user?: string, message?: string }
 */
export function verifyToken(token) {
  try {
    if (!token || typeof token !== 'string') {
      return { ok: false, message: 'Token 格式錯誤' };
    }
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { ok: false, message: 'Token 格式錯誤' };
    }
    
    const [header, payload, signature] = parts;
    
    // 驗證簽章
    const expectedSignature = hmacSha256(`${header}.${payload}`, TOKEN_SECRET);
    if (signature !== expectedSignature) {
      return { ok: false, message: 'Token 簽章驗證失敗' };
    }
    
    // 解析 payload
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    
    // 檢查過期
    if (decoded.exp && Date.now() > decoded.exp) {
      return { ok: false, message: 'Token 已過期' };
    }
    
    return { ok: true, user: decoded.user };
  } catch (e) {
    return { ok: false, message: 'Token 驗證失敗' };
  }
}

// ==================== 密碼處理 ====================

/**
 * 密碼雜湊（使用簡單的 hash + salt）
 * 生產環境建議使用 bcrypt 或更安全的庫
 * @param {string} password - 原始密碼
 * @returns {string} - 雜湊後的密碼
 */
export function hashPassword(password) {
  const salt = TOKEN_SECRET || 'default-salt';
  // 簡單的 SHA-256 模擬（實際應用建議使用 CryptoJS）
  let hash = password + salt;
  for (let i = 0; i < 1000; i++) {
    hash = simpleHash(hash + salt);
  }
  return hash;
}

/**
 * 驗證密碼
 * @param {string} password - 原始密碼
 * @param {string} hashedPassword - 雜湊後的密碼
 * @returns {boolean}
 */
export function verifyPassword(password, hashedPassword) {
  return hashPassword(password) === hashedPassword;
}

// ==================== 速率限制 ====================

/**
 * 速率限制檢查
 * @param {string} key - 識別鍵（如 IP 或用戶名）
 * @param {number} limit - 最大請求次數
 * @param {number} windowMs - 時間窗口（毫秒）
 * @returns {object} - { allowed: boolean, remaining: number, resetTime: number }
 */
export function checkRateLimit(key, limit = RATE_LIMIT_MAX, windowMs = RATE_LIMIT_WINDOW) {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  if (!record || now - record.start > windowMs) {
    // 新窗口
    rateLimitStore.set(key, { count: 1, start: now });
    return { allowed: true, remaining: limit - 1, resetTime: now + windowMs };
  }
  
  if (record.count >= limit) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetTime: record.start + windowMs,
      message: '請求太頻繁，請稍後再試' 
    };
  }
  
  record.count++;
  return { allowed: true, remaining: limit - record.count, resetTime: record.start + windowMs };
}

// ==================== 輔助函數 ====================

function base64UrlEncode(str) {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function hmacSha256(data, secret) {
  // Wix 環境建議使用 wix-crypto 或 CryptoJS
  // 這裡使用簡化版本
  let hash = simpleHash(data + secret);
  for (let i = 0; i < 10; i++) {
    hash = simpleHash(hash + secret);
  }
  return hash;
}

export default {
  signToken,
  verifyToken,
  hashPassword,
  verifyPassword,
  checkRateLimit
};