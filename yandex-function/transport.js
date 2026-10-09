const https = require('node:https');
const deliver = (url, key, data) => new Promise((resolve, reject) => {
  const endpoint = new URL(url);
  if (endpoint.protocol !== 'https:') return reject(new Error('HTTPS required'));
  const body = JSON.stringify(data);
  const request = https.request(endpoint, {
    method: 'POST', family: 4,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    timeout: 11000
  }, (response) => {
    let result = '';
    response.setEncoding('utf8');
    response.on('data', (chunk) => { result += chunk; });
    response.on('error', reject);
    response.on('end', () => {
      try {
        if (response.statusCode !== 200 || JSON.parse(result).ok !== true) reject(new Error('Delivery failed'));
        else resolve();
      } catch { reject(new Error('Invalid delivery response')); }
    });
  });
  request.on('timeout', () => request.destroy(Object.assign(new Error('Delivery timeout'), { code: 'DELIVERY_TIMEOUT' })));
  request.on('error', reject);
  request.end(body);
});
module.exports = { deliver };
