const { deliver } = require('./transport');

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
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return json(400, { error: 'Invalid request' }, origin);
    }
  } catch {
    return json(400, { error: 'Invalid request' }, origin);
  }

  const name = String(data.name || '').trim().replace(/\s+/g, ' ');
  const phone = String(data.phone || '').replace(/[^\d+]/g, '');
  const digits = phone.replace(/\D/g, '');
  if (data.website) return json(200, { ok: true }, origin);
  if (name.length < 2 || name.length > 80 || digits.length < 10 || digits.length > 15 ||
      data.consent !== true || (!Number.isFinite(Number(data.elapsed)) || Number(data.elapsed) < 500)) {
    return json(400, { error: 'Проверьте имя, телефон и согласие.' }, origin);
  }

  const relayUrl = process.env.TELEGRAM_RELAY_URL;
  const relayKey = process.env.TELEGRAM_RELAY_KEY;
  if (!relayUrl || !relayKey) return json(503, { error: 'Сервис временно недоступен' }, origin);

  try {
    await deliver(relayUrl, relayKey, { name, phone, consent: true });
    return json(200, { ok: true }, origin);
  } catch (error) {
    // Never log request bodies or credentials.
    console.error('Telegram delivery error', error.name, error.code || error.cause?.code || '');
    return json(502, { error: 'Не удалось отправить заявку' }, origin);
  }
};
