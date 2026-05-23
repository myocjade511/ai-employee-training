// Vercel Serverless Function — Lead capture proxy
// Saves leads as CSV, tries Sendiio (falls back gracefully)
// Download CSV at /api/leads.csv

const KEY = '7eb21a45913e5e600390d8c0ac70d168025fbd02';
const SECRET = 'YLV4jsmC1azfGbgQkUIxX7e03DuviJlnwSc8B9EhXbwjlqvWnVLoOaQuKC3rfGx8M6FYHUDkRPZT9ehg';
const CSV_PATH = '/tmp/leads.csv';

let fs;
try { fs = require('fs'); } catch(e) {}

function escapeCsv(val) {
  if (!val) return '';
  val = String(val).replace(/"/g, '""');
  return `"${val}"`;
}

async function trySendiio(name, email, company) {
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
    console.log(`Sendiio attempt: ${resp.status}`, JSON.stringify(data));
    return data.status === 'success' || data.success;
  } catch (e) {
    console.log(`Sendiio unavailable: ${e.message}`);
    return false;
  }
}

function saveCsv(name, email, company) {
  if (!fs) return false;
  try {
    const now = new Date().toISOString();
    const header = 'Name,Email,Company,Source,Timestamp\n';
    const row = `${escapeCsv(name)},${escapeCsv(email)},${escapeCsv(company)},lead-magnet,${now}\n`;

    if (!fs.existsSync(CSV_PATH)) {
      fs.writeFileSync(CSV_PATH, header + row);
    } else {
      fs.appendFileSync(CSV_PATH, row);
    }
    return true;
  } catch(e) {
    console.log(`CSV save error: ${e.message}`);
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET /api/lead — serve CSV download
  if (req.method === 'GET') {
    if (fs && fs.existsSync(CSV_PATH)) {
      const csv = fs.readFileSync(CSV_PATH, 'utf-8');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
      return res.status(200).send(csv);
    }
    return res.status(200).json({ leads: 0, note: 'No leads captured yet' });
  }

  // POST /api/lead — capture lead
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, company } = req.body || {};
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

  // Save to CSV
  saveCsv(name, email, company);

  // Try Sendiio (non-blocking for user)
  trySendiio(name, email, company).catch(() => {});

  // Always succeed — user gets download
  res.status(200).json({ 
    success: true, 
    message: 'Lead captured' 
  });
}
