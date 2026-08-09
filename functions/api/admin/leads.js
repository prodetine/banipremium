import { ensureSchema, json, requireAdmin } from '../../_utils.js';

const allowedStatuses = new Set(['new', 'progress', 'done']);

export async function onRequest(context) {
  const { DB } = context.env;
  if (!DB) return json({ error: 'База данных не настроена' }, 503);
  if (!await requireAdmin(context.request, context.env)) return json({ error: 'Требуется вход' }, 401);
  await ensureSchema(DB);

  if (context.request.method === 'GET') {
    const { results } = await DB.prepare('SELECT id, name, phone, status, notes, page, created_at, updated_at FROM leads ORDER BY created_at DESC LIMIT 1000').all();
    return json({ leads: results || [] });
  }

  let body;
  try { body = await context.request.json(); } catch { return json({ error: 'Неверные данные' }, 400); }
  const id = Number(body.id);
  if (!Number.isInteger(id) || id < 1) return json({ error: 'Неверный номер заявки' }, 400);

  if (context.request.method === 'PATCH') {
    const status = String(body.status || '');
    const notes = String(body.notes || '').trim().slice(0, 2000);
    if (!allowedStatuses.has(status)) return json({ error: 'Неверный статус' }, 400);
    await DB.prepare(`UPDATE leads SET status = ?, notes = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`).bind(status, notes, id).run();
    return json({ ok: true });
  }

  if (context.request.method === 'DELETE') {
    await DB.prepare('DELETE FROM leads WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }

  return json({ error: 'Метод не поддерживается' }, 405, { Allow: 'GET, PATCH, DELETE' });
}
