const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { handler } = require('./index');

const origin = 'https://prodetine.github.io';
const event = (data, overrides = {}) => ({
  httpMethod: 'POST',
  headers: { origin, 'content-type': 'application/json' },
  body: JSON.stringify({ name: 'Тест', phone: '+79000000000', consent: true, elapsed: 2000, ...data }),
  ...overrides
});

beforeEach(() => {
  process.env.ALLOWED_ORIGINS = origin;
  process.env.TELEGRAM_BOT_TOKEN = 'test-token';
  process.env.TELEGRAM_CHAT_ID = '-1001';
});

test('rejects other origins and invalid contact data', async () => {
  assert.equal((await handler(event({}, { headers: { origin: 'https://untrusted.example', 'content-type': 'application/json' } }))).statusCode, 403);
  assert.equal((await handler(event({ phone: '123' }))).statusCode, 400);
  assert.equal((await handler(event({ consent: false }))).statusCode, 400);
});

test('preflight allows the site without sending a message', async () => {
  const response = await handler(event({}, { httpMethod: 'OPTIONS' }));
  assert.equal(response.statusCode, 204);
  assert.equal(response.headers['Access-Control-Allow-Origin'], origin);
});

test('reports success only after Telegram confirms delivery', async () => {
  const original = global.fetch;
  let sent;
  global.fetch = async (_url, options) => {
    sent = JSON.parse(options.body);
    return { ok: true, json: async () => ({ ok: true }) };
  };
  try {
    const response = await handler(event({ name: 'Иван' }));
    assert.equal(response.statusCode, 200);
    assert.equal(sent.chat_id, '-1001');
    assert.match(sent.text, /Иван/);
  } finally {
    global.fetch = original;
  }
});

test('reports a failed Telegram delivery as an error', async () => {
  const original = global.fetch;
  global.fetch = async () => ({ ok: false, json: async () => ({ ok: false }) });
  try {
    assert.equal((await handler(event({}))).statusCode, 502);
  } finally {
    global.fetch = original;
  }
});
