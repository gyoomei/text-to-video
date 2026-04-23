const ALLOWED_HOSTS = [
  'api.replicate.com',
  'api.runwayml.com',
  'api.stability.ai',
  'api.fal.ai',
  'api.together.xyz',
  'api.fireworks.ai',
  'api.groq.com',
  'api.openai.com',
  'api.segmind.com',
  'api-inference.huggingface.co',
  'api.glif.app',
  'api.mistral.ai',
  'api.cohere.com',
  'api.deepseek.com',
  'api.novita.ai',
  'api.siliconflow.cn',
  'openrouter.ai',
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With, X-Base-Url');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const baseUrl = req.headers['x-base-url'] || req.query.baseUrl;
  if (!baseUrl) {
    return res.status(400).json({ error: 'X-Base-Url header or baseUrl query required' });
  }

  let parsed;
  try { parsed = new URL(baseUrl); } catch (e) {
    return res.status(400).json({ error: 'Invalid baseUrl' });
  }

  const isAllowed = ALLOWED_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h));
  if (!isAllowed) {
    return res.status(403).json({ error: 'Host not allowed: ' + parsed.hostname });
  }

  const path = req.query.path || '';
  const targetUrl = baseUrl.replace(/\/$/, '') + path;

  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'User-Agent': 'Text2Video-App/1.0',
      },
    };

    if ((req.method === 'POST' || req.method === 'PUT') && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await response.json();
      res.status(response.status).json(data);
    } else {
      const text = await response.text();
      res.status(response.status).setHeader('Content-Type', contentType).send(text);
    }
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy request failed', message: error.message });
  }
}
