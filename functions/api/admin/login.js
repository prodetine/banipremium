import { createSessionCookie, ensureSchema, getClientKey, json, verifyPassword } from '../../_utils.js';

export async function onRequestPost(context) {
  const { DB, ADMIN_USERNAME, ADMIN_PASSWORD_HASH, SESSION_SECRET } = context.env;
  if (!DB || !ADMIN_USERNAME || !ADMIN_PASSWORD_HASH || !SESSION_SECRET) return json({ error: 'Доступ ещё не настроен' }, 503);
  await ensureSchema(DB);

  const clientKey = await getClientKey(context.request, SESSION_SECRET);
  const now = Date.now();
  const attempt = await DB.prepare('SELECT failures, blocked_until, updated_at FROM login_attempts WHERE client_key = ?').bind(clientKey).first();
  if (attempt && Number(attempt.blocked_until) > now) return json({ error: 'Слишком много попыток' }, 429);

  let body;
  try { body = await context.request.json(); } catch { return json({ error: 'Неверные данные' }, 400); }
  const usernameOk = String(body.username || '') === ADMIN_USERNAME;
  const passwordOk = await verifyPassword(String(body.password || ''), ADMIN_PASSWORD_HASH, SESSION_SECRET);

  if (!usernameOk || !passwordOk) {
    const recent = attempt && now - Number(attempt.updated_at) < 15 * 60 * 1000;
    const failures = recent ? Number(attempt.failures) + 1 : 1;
    const blockedUntil = failures >= 5 ? now + 15 * 60 * 1000 : 0;
    await DB.prepare(`INSERT INTO login_attempts (client_key, failures, blocked_until, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(client_key) DO UPDATE SET failures = excluded.failures, blocked_until = excluded.blocked_until, updated_at = excluded.updated_at`)
      .bind(clientKey, failures, blockedUntil, now).run();
    return json({ error: 'Неверный логин или пароль' }, failures >= 5 ? 429 : 401);
  }

  await DB.prepare('DELETE FROM login_attempts WHERE client_key = ?').bind(clientKey).run();
  const cookie = await createSessionCookie(ADMIN_USERNAME, SESSION_SECRET);
  return json({ ok: true }, 200, { 'Set-Cookie': cookie });
}

export function onRequest() {
  return json({ error: 'Метод не поддерживается' }, 405, { Allow: 'POST' });
}
