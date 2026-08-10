// 坐标转换：[0,999] 相对坐标 → 原图像素坐标
function normalizedToPixel(bbox, origW, origH) {
  return [
    Math.round(bbox[0] * origW / 1000),
    Math.round(bbox[1] * origH / 1000),
    Math.round(bbox[2] * origW / 1000),
    Math.round(bbox[3] * origH / 1000),
  ];
}

import { verifyToken, resolveSecret } from './_auth.js';

export async function onRequestPost(context) {
  // 鉴权：校验 Authorization: Bearer <token>
  const authHeader = context.request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const authed = await verifyToken(resolveSecret(context.env), token);
  if (!authed) {
    return new Response(JSON.stringify({ error: '未授权：请先通过密码验证' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { image, target, model, origWidth, origHeight } = await context.request.json();

  if (!image || !target) {
    return new Response(JSON.stringify({ error: '缺少必要参数' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = context.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API Key 未配置' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const selectedModel = model || 'qwen3.7-flash';

  const prompt = `请检测图中所有"${target}"目标，必须检测全部，不要遗漏任何一个小目标。输出格式为JSON数组：[{"label":"名称","bbox_2d":[x1,y1,x2,y2]}]。坐标为0-999范围的相对坐标，x1,y1为左上角，x2,y2为右下角。如果未检测到任何目标，返回空数组[]。`;

  try {
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } },
              { type: 'text', text: prompt },
            ],
          },
        ],
        max_tokens: 2048,
        temperature: 0.1,
        enable_thinking: false,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return new Response(JSON.stringify({ error: data.error.message || '模型调用失败' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const content = data.choices?.[0]?.message?.content || '';

    // 多层解析策略
    let bboxes = [];
    try {
      bboxes = JSON.parse(content);
      if (!Array.isArray(bboxes)) bboxes = [bboxes];
    } catch {
      try {
        const match = content.match(/\[[\s\S]*\]/);
        if (match) {
          bboxes = JSON.parse(match[0]);
          if (!Array.isArray(bboxes)) bboxes = [bboxes];
        }
      } catch {
        const singleMatch = content.match(/\{[\s\S]*"bbox_2d"[\s\S]*\}/);
        if (singleMatch) {
          bboxes = [JSON.parse(singleMatch[0])];
        }
      }
    }

    // 坐标转换：[0,999] 相对坐标 -> 原图像素坐标
    if (origWidth && origHeight) {
      bboxes = bboxes.map(box => ({
        ...box,
        bbox_2d: normalizedToPixel(box.bbox_2d, origWidth, origHeight),
      }));
    }

    return new Response(JSON.stringify({
      bboxes,
      raw: content,
      model: selectedModel,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: '请求失败: ' + err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
