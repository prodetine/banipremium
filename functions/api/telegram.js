import { json } from '../_utils.js';

export async function onRequestPost({ request, env }) {
  if (!env.TELEGRAM_RELAY_KEY || !env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return json({ error: 'Delivery unavailable' }, 503);
  }
  const supplied = request.headers.get('Authorization') || '';
  const expected = `Bearer ${env.TELEGRAM_RELAY_KEY}`;
  let mismatch = supplied.length ^ expected.length;
  for (let i = 0; i < expected.length; i++) mismatch |= (supplied.charCodeAt(i) || 0) ^ expected.charCodeAt(i);
  if (mismatch) return json({ error: 'Forbidden' }, 403);
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'Invalid content type' }, 415);
  let data;
  try {
    const body = await request.text();
    if (body.length > 3000) return json({ error: 'Request too large' }, 413);
    data = JSON.parse(body);
  } catch { return json({ error: 'Invalid request' }, 400); }
  const name = String(data?.name || '').trim().replace(/\s+/g, ' ');
  const phone = String(data?.phone || '').replace(/[^\d+]/g, '');
  const digits = phone.replace(/\D/g, '');
  if (name.length < 2 || name.length > 80 || digits.length < 10 || digits.length > 15 || data?.consent !== true) {
    return json({ error: 'Invalid contact data' }, 400);
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: `Новая заявка с сайта «Бани-бочки Премиум»\nИмя: ${name}\nТелефон: ${phone}` }),
      signal: AbortSignal.timeout(7000)
    });
    const result = await response.json();
    if (!response.ok || !result.ok) return json({ error: 'Delivery failed' }, 502);
    return json({ ok: true });
  } catch { return json({ error: 'Delivery failed' }, 502); }
}
export function onRequest() { return json({ error: 'Method not allowed' }, 405); }
