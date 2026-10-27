const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeLeadPhone } = require('../phone.js');
test('accepts Russian phone writing conventions without a mask', () => {
  for (const value of ['+7 (915) 775-09-09', '8 915 775 09 09', '79157750909', '9157750909', '+7.915.775.09.09', '  +7\u00a0(915)\u00a0775—09—09  ']) assert.equal(normalizeLeadPhone(value), '+79157750909', value);
});
test('keeps international numbers and international prefix', () => {
  assert.equal(normalizeLeadPhone('+375 (29) 123-45-67'), '+375291234567');
  assert.equal(normalizeLeadPhone('00375 29 123 45 67'), '+375291234567');
});
