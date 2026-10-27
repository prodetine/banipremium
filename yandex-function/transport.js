const https = require('node:https');
const dns = require('node:dns').promises;
const send = (endpoint, key, data, address) => new Promise((resolve, reject) => {
  const body = JSON.stringify(data);
  let connected = false;
  let resolvedAddress;
  let finished = false;
  let connectionTimer;
  let deadlineTimer;
  const finish = (error) => {
    if (finished) return;
    finished = true; clearTimeout(connectionTimer); clearTimeout(deadlineTimer);
    if (error) { error.resolvedAddress = resolvedAddress; reject(error); } else resolve();
  };
  const request = https.request(endpoint, {
    method: 'POST', family: 4, servername: endpoint.hostname,
    ...(address ? { lookup: (_host, options, callback) => options.all ? callback(null, [{ address, family: 4 }]) : callback(null, address, 4) } : {}),
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    timeout: 11000
  }, (response) => {
    let result = '';
    response.setEncoding('utf8');
    response.on('data', (chunk) => { result += chunk; });
    response.on('error', finish);
    response.on('end', () => {
      try {
        if (response.statusCode !== 200 || JSON.parse(result).ok !== true) finish(new Error('Delivery failed'));
        else finish();
      } catch { finish(new Error('Invalid delivery response')); }
    });
  });
  request.on('socket', socket => {
    socket.on('lookup', (_error, ip) => { resolvedAddress = ip; });
    socket.on('secureConnect', () => { connected = true; clearTimeout(connectionTimer); });
  });
  connectionTimer = setTimeout(() => request.destroy(Object.assign(new Error('Connect timeout'), { code:'CONNECT_TIMEOUT', retryable:!connected })), 3500);
  deadlineTimer = setTimeout(() => request.destroy(Object.assign(new Error('Delivery timeout'), {code:'DELIVERY_TIMEOUT'})), 11000);
  request.on('timeout', () => request.destroy(Object.assign(new Error('Delivery timeout'), { code: 'DELIVERY_TIMEOUT' })));
  request.on('error', finish);
  request.end(body);
});
const deliver = async (url, key, data) => {
  const endpoint = new URL(url);
  if (endpoint.protocol !== 'https:') throw new Error('HTTPS required');
  try { return await send(endpoint, key, data); }
  catch (error) {
    // Retry only before a TLS connection could deliver a message, never after acceptance.
    if (!error.retryable) throw error;
    const addresses = await dns.lookup(endpoint.hostname, { all:true, family:4 });
    const alternate = addresses.find(item => item.address !== error.resolvedAddress);
    if (!alternate) throw error;
    return send(endpoint, key, data, alternate.address);
  }
};
module.exports = { deliver };
