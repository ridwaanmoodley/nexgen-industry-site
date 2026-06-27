export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.HIGGSFIELD_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Higgsfield API key not configured' });

  const BASE = 'https://platform.higgsfield.ai';
  const { _action, _request_id, _application, ...args } = req.body || {};

  let url, method = 'POST', sendBody = true;

  if (_action === 'status' && _request_id) {
    url = `${BASE}/requests/${_request_id}/status`;
    method = 'GET';
    sendBody = false;
  } else if (_action === 'cancel' && _request_id) {
    url = `${BASE}/requests/${_request_id}/cancel`;
    sendBody = false;
  } else {
    const app = _application || 'higgsfield-ai/dop/standard';
    url = `${BASE}/applications/${app}`;
  }

  try {
    const resp = await fetch(url, {
      method,
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'nexgen-dashboard/1.0'
      },
      body: sendBody ? JSON.stringify(args) : undefined
    });

    const text = await resp.text();
    try {
      const data = JSON.parse(text);
      return res.status(resp.status).json(data);
    } catch {
      return res.status(resp.status).json({ error: 'Non-JSON from Higgsfield', raw: text.slice(0, 500) });
    }
  } catch (err) {
    console.error('Higgsfield proxy error:', err);
    return res.status(500).json({ error: 'Proxy error: ' + err.message });
  }
}
