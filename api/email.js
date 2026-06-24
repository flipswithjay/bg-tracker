/**
 * POST /api/email
 * Cloudmailin webhook — receives forwarded emails and stores them.
 * Setup: point Cloudmailin target to https://your-app.vercel.app/api/email
 *
 * Storage: Vercel KV (enable in Vercel dashboard → Storage → KV)
 * After enabling, add env vars KV_REST_API_URL and KV_REST_API_TOKEN to this project.
 */

export const config = { api: { bodyParser: { sizeLimit: '5mb' } } };

async function kvSet(key, value) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return false;
  await fetch(`${url}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  });
  return true;
}

async function kvLPush(key, value) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return false;
  await fetch(`${url}/lpush/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  });
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;

    // Cloudmailin sends envelope + headers + plain/html body
    const email = {
      id: Date.now().toString(36),
      receivedAt: new Date().toISOString(),
      subject: body.headers?.subject || body.subject || '(no subject)',
      from: body.envelope?.from || body.headers?.from || '',
      to: body.envelope?.to || body.headers?.to || '',
      date: body.headers?.date || '',
      // Plain text body (best for parsing)
      raw: body.plain || body.body || '',
      html: body.html || '',
      filename: `${Date.now()}-forwarded.eml`,
    };

    const stored = await kvSet(`email:${email.id}`, email);
    if (stored) {
      await kvLPush('email_ids', email.id);
    }

    return res.status(200).json({ ok: true, id: email.id, stored });
  } catch (err) {
    console.error('Email webhook error:', err);
    return res.status(500).json({ error: err.message });
  }
}
