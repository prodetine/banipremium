function normalizeLeadPhone(value) {
  const raw = String(value || '').trim();
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && /^[78]/.test(digits)) return '+7' + digits.slice(1);
  if (digits.startsWith('00')) return '+' + digits.slice(2);
  if (digits.length === 10 && !raw.startsWith('+')) return '+7' + digits;
  return (raw.startsWith('+') ? '+' : '') + digits;
}
if (typeof module !== 'undefined' && module.exports) module.exports = { normalizeLeadPhone };
