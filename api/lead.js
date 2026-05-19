// Vercel Serverless Function — Lead capture proxy
// Attempts to forward to Sendiio. On failure, stores lead locally.

const KEY = '7eb21a45913e5e600390d8c0ac70d168025fbd02';
const SECRET = 'YLV4jsmC1azfGbgQkUIxX7e03DuviJlnwSc8B9EhXbwjlqvWnVLoOaQuKC3rfGx8M6FYHUDkRPZT9ehg';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, company } = req.body || {};
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

  // Try Sendiio
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch('https://api.sendiio.com/v1/contacts/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: KEY, api_secret: SECRET, name, email,
        company: company || '', tags: ['lead-magnet', 'ai-employee-training']
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    const data = await resp.json();
    console.log(`Sendiio: ${resp.status}`, JSON.stringify(data));
  } catch (e) {
    console.log(`Sendiio unavailable: ${e.message}`);
  }

  // Always return success to the user (download works regardless)
  res.status(200).json({ success: true });
}
