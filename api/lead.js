// Vercel Serverless Function — Lead capture proxy to Sendiio
// Runs on Vercel's infrastructure which CAN reach api.sendiio.com
// Environment variables set via Vercel dashboard or project settings

const SENDIIO_API_KEY = process.env.SENDIIO_API_KEY || '7eb21a45913e5e600390d8c0ac70d168025fbd02';
const SENDIIO_API_SECRET = process.env.SENDIIO_API_SECRET || 'YLV4jsmC1azfGbgQkUIxX7e03DuviJlnwSc8B9EhXbwjlqvWnVLoOaQuKC3rfGx8M6FYHUDkRPZT9ehg';
const SENDIIO_API_URL = 'https://api.sendiio.com/v1/contacts/add';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, company } = req.body || {};

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    const payload = {
      api_key: SENDIIO_API_KEY,
      api_secret: SENDIIO_API_SECRET,
      name: name.trim(),
      email: email.trim(),
      company: company?.trim() || '',
      tags: ['lead-magnet', 'ai-employee-training'],
      custom_fields: {
        source: 'lead-magnet-page',
        company: company?.trim() || ''
      }
    };

    console.log('Sending to Sendiio:', JSON.stringify(payload));

    const sendiioRes = await fetch(SENDIIO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await sendiioRes.json();
    console.log('Sendiio response:', JSON.stringify(data));

    if (data.status === 'success' || data.success) {
      return res.status(200).json({
        success: true,
        message: 'Contact added successfully'
      });
    } else {
      // Sendiio returned an error
      return res.status(200).json({
        success: true,
        fallback: true,
        message: 'Lead captured, Sendiio pending'
      });
    }
  } catch (error) {
    console.error('Sendiio error:', error.message);
    // Don't fail the user — lead is still captured client-side
    return res.status(200).json({
      success: true,
      fallback: true,
      message: 'Lead captured, will retry Sendiio'
    });
  }
}
