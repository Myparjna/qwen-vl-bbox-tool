// 共享鉴权工具：HMAC-SHA256 签名的登录 token
// 密码只存于环境变量 AUTH_PASSWORD，token 用 AUTH_SECRET 签名，均不出现在源码中

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(s + pad), c => c.charCodeAt(0));
}

async function hmacSha256(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return new Uint8Array(sig);
}

// 常量时间比较，避免时序攻击
export function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// 生成 token: base64url(payload).base64url(sig)，payload 含过期时间
export async function signToken(secret, ttlMs) {
  const exp = Math.floor(Date.now() / 1000) + Math.floor(ttlMs / 1000);
  const payload = toBase64Url(encoder.encode(JSON.stringify({ exp })));
  const sig = toBase64Url(await hmacSha256(secret, payload));
  return `${payload}.${sig}`;
}

export async function verifyToken(secret, token) {
  if (!token || typeof token !== 'string') return false;
  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const expected = toBase64Url(await hmacSha256(secret, payload));
    if (!timingSafeEqual(expected, sig)) return false;
    const data = JSON.parse(decoder.decode(fromBase64Url(payload)));
    return typeof data.exp === 'number' && data.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function resolveSecret(env) {
  return env.AUTH_SECRET || 'qwen-vl-bbox-default-secret';
}
