// 登录端点：校验密码，签发 HMAC token
// 密码从环境变量 AUTH_PASSWORD 读取，源码中不含任何明文密码

import { signToken, resolveSecret, timingSafeEqual } from './_auth.js';

const TOKEN_TTL = 24 * 60 * 60 * 1000; // 24 小时

export async function onRequestPost(context) {
  const { password } = await context.request.json().catch(() => ({}));
  const expected = context.env.AUTH_PASSWORD;

  if (!expected) {
    return new Response(JSON.stringify({ error: 'AUTH_PASSWORD 未配置' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (typeof password !== 'string' || !timingSafeEqual(password, expected)) {
    return new Response(JSON.stringify({ error: '密码错误' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = await signToken(resolveSecret(context.env), TOKEN_TTL);
  return new Response(JSON.stringify({ token }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
