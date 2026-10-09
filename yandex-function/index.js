const json = (statusCode, data, origin) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin'
  },
  body: JSON.stringify(data)
});

const getHeader = (headers, key) => {
  const name = Object.keys(headers || {}).find((item) => item.toLowerCase() === key);
  return name ? headers[name] : '';
};

module.exports.handler = async (event) => {
  const origin = getHeader(event.headers, 'origin');
  const allowed = (process.env.ALLOWED_ORIGINS || 'https://prodetine.github.io')
    .split(',').map((item) => item.trim());

  if (!origin || !allowed.includes(origin)) {
    return { statusCode: 403, body: 'Forbidden' };
  }
  if (event.httpMethod === 'OPTIONS') return json(204, {}, origin);
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' }, origin);
  if (!getHeader(event.headers, 'content-type').startsWith('application/json')) {
    return json(415, { error: 'Unsupported media type' }, origin);
  }

  let data;
  try {
    const body = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf8')
      : event.body || '';
    if (body.length > 3000) return json(413, { error: 'Request too large' }, origin);
    data = JSON.parse(body);
  } catch {
    return json(400, { error: 'Invalid request' }, origin);
  }

  const name = String(data.name || '').trim().replace(/\s+/g, ' ');
  const phone = String(data.phone || '').replace(/[^\d+]/g, '');
  const digits = phone.replace(/\D/g, '');
  if (data.website) return json(200, { ok: true }, origin);
  if (name.length < 2 || name.length > 80 || digits.length < 10 || digits.length > 15 ||
      data.consent !== true || Number(data.elapsed) < 500) {
    return json(400, { error: 'Проверьте имя, телефон и согласие.' }, origin);
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return json(503, { error: 'Сервис временно недоступен' }, origin);

  const text = `Новая заявка с сайта «Бани-бочки Премиум»\nИмя: ${name}\nТелефон: ${phone}`;
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(10000)
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error('Telegram delivery failed');
    return json(200, { ok: true }, origin);
  } catch {
    return json(502, { error: 'Не удалось отправить заявку' }, origin);
  }
};
