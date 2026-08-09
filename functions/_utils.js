const encoder = new TextEncoder();

export const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }
});

export const ensureSchema = async (db) => {
  await db.prepare(`CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    notes TEXT NOT NULL DEFAULT '',
    page TEXT NOT NULL DEFAULT '/',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS login_attempts (
    client_key TEXT PRIMARY KEY,
    failures INTEGER NOT NULL DEFAULT 0,
    blocked_until INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL DEFAULT 0
  )`).run();
};

const bytesToHex = (bytes) => Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
const hexToBytes = (hex) => Uint8Array.from(hex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []);

export const verifyPassword = async (password, specification) => {
  const [type, iterationsRaw, saltHex, expectedHex] = String(specification || '').split('$');
  if (type !== 'pbkdf2' || !iterationsRaw || !saltHex || !expectedHex) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(String(password)), 'PBKDF2', false, ['deriveBits']);
  const derived = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(saltHex), iterations: Number(iterationsRaw) }, key, 256));
  const actual = bytesToHex(derived);
  if (actual.length !== expectedHex.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) difference |= actual.charCodeAt(index) ^ expectedHex.charCodeAt(index);
  return difference === 0;
};

const base64UrlEncode = (value) => btoa(value).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
const base64UrlDecode = (value) => atob(value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4));

const hmac = async (value, secret) => {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)))));
};

export const createSessionCookie = async (username, secret) => {
  const payload = base64UrlEncode(JSON.stringify({ username, expires: Date.now() + 12 * 60 * 60 * 1000 }));
  const signature = await hmac(payload, secret);
  return `bbp_admin=${payload}.${signature}; Path=/; Max-Age=43200; HttpOnly; Secure; SameSite=Strict`;
};

const getCookie = (request, name) => {
  const value = request.headers.get('Cookie') || '';
  return value.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) || '';
};

export const requireAdmin = async (request, env) => {
  if (!env.SESSION_SECRET) return false;
  const token = getCookie(request, 'bbp_admin');
  const split = token.lastIndexOf('.');
  if (split < 1) return false;
  const payload = token.slice(0, split);
  const signature = token.slice(split + 1);
  const expected = await hmac(payload, env.SESSION_SECRET);
  if (signature !== expected) return false;
  try {
    const data = JSON.parse(base64UrlDecode(payload));
    return data.username === env.ADMIN_USERNAME && Number(data.expires) > Date.now();
  } catch { return false; }
};

export const getClientKey = async (request, secret) => {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${secret}:${ip}`));
  return bytesToHex(new Uint8Array(digest));
};
