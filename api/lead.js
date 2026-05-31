const GH_TOKEN = process.env.GH_TOKEN;
const GH_REPO = 'myocjade511/ai-employee-training';
const CSV_PATH = 'data/leads.csv';
const CSV_TOKEN = process.env.CSV_ACCESS_TOKEN;

async function readCSV() {
  try {
    const res = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${CSV_PATH}`, {
      headers: { 'Authorization': `Bearer ${GH_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!res.ok) return { sha: null, csv: 'Name,Email,Source,Timestamp\n' };
    const data = await res.json();
    const csv = Buffer.from(data.content, 'base64').toString('utf-8');
    return { sha: data.sha, csv };
  } catch(e) { return { sha: null, csv: 'Name,Email,Source,Timestamp\n' }; }
}

async function writeCSV(csv, sha) {
  const content = Buffer.from(csv).toString('base64');
  const body = { message: 'Add lead', content: content };
  if (sha) body.sha = sha;
  const res = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${CSV_PATH}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${GH_TOKEN}`, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' },
    body: JSON.stringify(body)
  });
  return res.ok;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') {
    const token = req.query.token || '';
    if (!CSV_TOKEN || token !== CSV_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
    const { sha, csv } = await readCSV();
    res.setHeader('Content-Type', 'text/csv');
    return res.status(200).send(csv);
  }
  if (req.method === 'POST') {
    const { name, email } = req.body || {};
    if (name && email && GH_TOKEN) {
      try {
        const { sha, csv } = await readCSV();
        const line = `"${name.replace(/"/g,'""')}","${email.replace(/"/g,'""')}","ai-employee-training",${new Date().toISOString()}\n`;
        await writeCSV(csv + line, sha);
      } catch(e) { console.error('GitHub save error:', e); }
    }
    return res.status(200).json({ ok: true, message: 'Lead captured' });
  }
  return res.status(405).end();
}
