const ALLOWED_HOSTS = [
  // Video AI
  'api.replicate.com',
  'api.fal.ai',
  'api.runwayml.com',
  'api.pika.art',
  'api.klingai.com',
  'api.luma.ai',
  'api.haiper.ai',
  'api.viggle.ai',
  'api.minimax.chat',
  'api.bytedance.net',
  'api.morphstudio.com',
  'api.kaiber.ai',
  'api.genmo.ai',
  // Image AI (bisa image-to-video)
  'api.stability.ai',
  'api.leonardo.ai',
  'api.ideogram.ai',
  'api.midjourney.com',
  'api.d-id.com',
  'api.heygen.com',
  // LLM / Multi-modal
  'api.openai.com',
  'api.x.ai',
  'api.anthropic.com',
  'api.groq.com',
  'api.together.xyz',
  'api.fireworks.ai',
  'api.mistral.ai',
  'api.cohere.com',
  'api.deepseek.com',
  'api.perplexity.ai',
  'api.novita.ai',
  'api.siliconflow.cn',
  'api.glif.app',
  'api.segmind.com',
  'openrouter.ai',
  // HuggingFace
  'api-inference.huggingface.co',
  'huggingface.co',
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
    return res.status(403).json({ error: 'Host not allowed: ' + parsed.hostname + '. Contact admin to add this provider.' });
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
        'User-Agent': 'Text2Video-App/1.0',
      },
    };

    // Preserve original Content-Type if provided, else default to JSON
    const ct = req.headers['content-type'];
    if (ct) {
      fetchOptions.headers['Content-Type'] = ct;
    } else {
      fetchOptions.headers['Content-Type'] = 'application/json';
    }

    if ((req.method === 'POST' || req.method === 'PUT') && req.body) {
      // If body is already string (from Vercel parsing), pass as-is. Else stringify.
      if (typeof req.body === 'string') {
        fetchOptions.body = req.body;
      } else {
        fetchOptions.body = JSON.stringify(req.body);
        if (!ct) fetchOptions.headers['Content-Type'] = 'application/json';
      }
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
