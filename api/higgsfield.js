export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.HIGGSFIELD_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Higgsfield API key not configured' });

  const { _path, ...body } = req.body || {};
  const path = _path || req.query.path || '/generations';
  const url = `https://api.higgsfield.ai/v1${path}`;

  try {
    const resp = await fetch(url, {
      method: req.method === 'GET' ? 'GET' : req.method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: req.method !== 'GET' && req.method !== 'DELETE' ? JSON.stringify(body) : undefined
    });

    const data = await resp.json();
    return res.status(resp.status).json(data);
  } catch (err) {
    console.error('Higgsfield proxy error:', err);
    return res.status(500).json({ error: 'Proxy error: ' + err.message });
  }
}
