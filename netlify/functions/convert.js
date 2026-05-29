import { json } from './_shared.js';

// GET /api/convert?from=INR&to=USD&amount=100
// Uses ExchangeRate.host (free, no key) by default, or exchangerate-api.com
// if EXCHANGE_RATE_API_KEY is set. Caches in-memory for 1 hour per process.
const cache = new Map(); // key: `${from}->${to}` => { rate, fetchedAt }
const TTL_MS = 60 * 60 * 1000;

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  const params = event.queryStringParameters || {};
  const from = (params.from || 'INR').toUpperCase();
  const to = (params.to || 'INR').toUpperCase();
  const amount = Number(params.amount || 0);

  if (!Number.isFinite(amount)) return json(400, { error: 'invalid amount' });
  if (from === to) return json(200, { from, to, amount, result: amount, rate: 1 });

  try {
    const cacheKey = `${from}->${to}`;
    const hit = cache.get(cacheKey);
    let rate;
    if (hit && Date.now() - hit.fetchedAt < TTL_MS) {
      rate = hit.rate;
    } else {
      rate = await fetchRate(from, to);
      cache.set(cacheKey, { rate, fetchedAt: Date.now() });
    }

    const result = Math.round(amount * rate * 100) / 100;
    return json(200, { from, to, amount, result, rate });
  } catch (err) {
    return json(500, { error: err.message });
  }
};

async function fetchRate(from, to) {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (apiKey) {
    // exchangerate-api.com v6
    const res = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/pair/${from}/${to}`);
    if (!res.ok) throw new Error(`exchangerate-api: ${res.status}`);
    const j = await res.json();
    if (j.result !== 'success' || typeof j.conversion_rate !== 'number') {
      throw new Error('exchangerate-api: unexpected response');
    }
    return j.conversion_rate;
  }
  // Public, no-auth fallback
  const res = await fetch(`https://api.exchangerate.host/latest?base=${from}&symbols=${to}`);
  if (!res.ok) throw new Error(`exchangerate.host: ${res.status}`);
  const j = await res.json();
  const r = j?.rates?.[to];
  if (typeof r !== 'number') throw new Error('exchangerate.host: no rate');
  return r;
}
