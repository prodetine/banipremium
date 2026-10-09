const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const https = require('node:https');
const { handler } = require('./index');
const origin = 'https://prodetine.github.io';
const event = (data, overrides = {}) => ({ httpMethod: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Тест', phone: '+79000000000', consent: true, elapsed: 2000, ...data }), ...overrides });
beforeEach(() => { process.env.ALLOWED_ORIGINS = origin; process.env.TELEGRAM_RELAY_URL = 'https://relay.example/api/telegram'; process.env.TELEGRAM_RELAY_KEY = 'test-key'; });
afterEach(() => mock.restoreAll());
test('rejects invalid origins, consent, phone and elapsed time', async () => {
  assert.equal((await handler(event({}, { headers: { origin: 'https://untrusted.example' } }))).statusCode, 403);
  for (const data of [{ phone: '123' }, { consent: false }, { elapsed: undefined }]) assert.equal((await handler(event(data))).statusCode, 400);
});
test('preflight allows only the configured site', async () => { assert.equal((await handler(event({}, { httpMethod: 'OPTIONS' }))).statusCode, 204); });
const mockRelay = (ok, capture) => mock.method(https, 'request', (url, options, callback) => {
  assert.equal(url.href, 'https://relay.example/api/telegram');
  assert.equal(options.headers.Authorization, 'Bearer test-key');
  const request = new EventEmitter();
  request.end = (body) => { capture?.(JSON.parse(body)); queueMicrotask(() => { const response = new EventEmitter(); response.statusCode = ok ? 200 : 502; response.setEncoding = () => {}; callback(response); response.emit('data', JSON.stringify({ ok })); response.emit('end'); }); };
  return request;
});
test('success requires authenticated relay confirmation', async () => { let sent; mockRelay(true, body => { sent = body; }); assert.equal((await handler(event({ name: 'Иван' }))).statusCode, 200); assert.deepEqual(sent, { name: 'Иван', phone: '+79000000000', consent: true }); });
test('delivery failure reaches the form as an error', async () => { mockRelay(false); assert.equal((await handler(event({}))).statusCode, 502); });
test('honeypot does not send a message', async () => { mock.method(https, 'request', () => { throw new Error('Must not send'); }); assert.equal((await handler(event({ website: 'spam' }))).statusCode, 200); });
test('timeout does not resend potentially accepted messages', async () => { let attempts = 0; mock.method(https, 'request', () => { attempts++; const request = new EventEmitter(); request.end = () => queueMicrotask(() => request.emit('timeout')); request.destroy = error => request.emit('error', error); return request; }); assert.equal((await handler(event({}))).statusCode, 502); assert.equal(attempts, 1); });
