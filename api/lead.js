export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, company } = req.body || {};
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

  const KEY = '7eb21a45913e5e600390d8c0ac70d168025fbd02';
  const SECRET = 'YLV4jsmC1azfGbgQkUIxX7e03DuviJlnwSc8B9EhXbwjlqvWnVLoOaQuKC3rfGx8M6FYHUDkRPZT9ehg';

  // Try multiple possible endpoints
  const endpoints = [
    { url: 'https://api.sendiio.com/v1/contacts/add', method: 'POST', body: { api_key: KEY, api_secret: SECRET, name, email, company: company || '', tags: ['lead-magnet'] } },
    { url: 'https://api.sendiio.com/v2/contacts', method: 'POST', body: { api_key: KEY, api_secret: SECRET, name, email, company: company || '' } },
  ];

  let lastError = null;
  for (const ep of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const resp = await fetch(ep.url, {
        method: ep.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ep.body),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const text = await resp.text();
      console.log(`Endpoint ${ep.url} responded: [${resp.status}] ${text.substring(0,200)}`);
      return res.status(200).json({ success: true, endpoint: ep.url, status: resp.status, response: text.substring(0,200) });
    } catch (e) {
      lastError = `${e.name}: ${e.message}`;
      console.log(`Endpoint ${ep.url} failed: ${lastError}`);
    }
  }

  // Also try DNS resolution
  return res.status(200).json({
    success: false,
    fallback: true,
    error: lastError,
    endpoints_tried: endpoints.map(e => e.url),
    note: 'Sendiio unreachable from Vercel as well'
  });
}
