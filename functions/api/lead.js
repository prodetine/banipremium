import { ensureSchema, json } from '../_utils.js';

export async function onRequestPost(context) {
  if (!context.env.DB) return json({ error: 'Сервис заявок временно недоступен' }, 503);
  try {
    const body = await context.request.json();
    const name = String(body.name || '').trim().replace(/\s+/g, ' ').slice(0, 80);
    const phone = String(body.phone || '').trim().slice(0, 30);
    const digits = phone.replace(/\D/g, '');
    const page = String(body.page || '/').slice(0, 200);

    if (body.website || Number(body.elapsed) < 700) return json({ ok: true });
    if (name.length < 2 || digits.length < 10 || digits.length > 15) return json({ error: 'Проверьте имя и номер телефона' }, 400);

    await ensureSchema(context.env.DB);
    await context.env.DB.prepare('INSERT INTO leads (name, phone, page) VALUES (?, ?, ?)').bind(name, phone, page).run();
    return json({ ok: true }, 201);
  } catch {
    return json({ error: 'Не удалось сохранить заявку' }, 400);
  }
}

export function onRequest() {
  return json({ error: 'Метод не поддерживается' }, 405, { Allow: 'POST' });
}
