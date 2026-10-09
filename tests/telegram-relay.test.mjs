import { test, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/telegram.js';
const env = { TELEGRAM_RELAY_KEY: 'test-key', TELEGRAM_BOT_TOKEN: 'test-token', TELEGRAM_CHAT_ID: '-1001' };
const request = (data = {}, key = 'test-key') => new Request('https://relay.example/api/telegram', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Тест', phone: '+79000000000', consent: true, ...data }) });
afterEach(() => mock.restoreAll());
test('unauthorized requests and missing consent never reach Telegram', async () => { mock.method(globalThis, 'fetch', () => { throw new Error('Must not send'); }); assert.equal((await onRequestPost({request: request({}, 'wrong'),env})).status, 403); assert.equal((await onRequestPost({request: request({consent:false}),env})).status, 400); });
test('success follows Telegram confirmation', async () => { mock.method(globalThis, 'fetch', async (url, options) => { assert.match(url, /sendMessage$/); assert.equal(JSON.parse(options.body).chat_id, '-1001'); return Response.json({ok:true}); }); assert.equal((await onRequestPost({request:request(),env})).status, 200); });
test('Telegram rejection is surfaced as failure', async () => { mock.method(globalThis, 'fetch', async () => Response.json({ok:false},{status:400})); assert.equal((await onRequestPost({request:request(),env})).status, 502); });
