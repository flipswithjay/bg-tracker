/**
 * GET /api/emails
 * Returns the last 50 forwarded emails stored in Vercel KV.
 * Browser app polls this endpoint from the Email Sync tab → Sync button.
 */

async function kvGet(key) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.result;
}

async function kvLRange(key, start, end) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return [];
  const res = await fetch(`${url}/lrange/${encodeURIComponent(key)}/${start}/${end}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.result || [];
}

export default async function handler(req, res) {
  // CORS for browser fetches from Vercel domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.KV_REST_API_URL) {
    return res.status(503).json({
      error: 'Vercel KV not configured. Enable KV in Vercel dashboard → Storage, then connect it to this project.',
      setup: true,
    });
  }

  try {
    const ids = await kvLRange('email_ids', 0, 49);
    const emails = await Promise.all(ids.map(id => kvGet(`email:${id}`)));
    return res.status(200).json(emails.filter(Boolean));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
