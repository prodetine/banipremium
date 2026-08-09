import { json } from '../../_utils.js';

export function onRequestPost() {
  return json({ ok: true }, 200, { 'Set-Cookie': 'bbp_admin=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict' });
}

export function onRequest() {
  return json({ error: 'Метод не поддерживается' }, 405, { Allow: 'POST' });
}
