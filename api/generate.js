export default async function handler(req, res) {
  const ALLOWED = [
    'https://pkro-pipeline-montage.vercel.app',
    'https://pipeline.propertykro.com'
  ];
  const origin = req.headers.origin;
  if (ALLOWED.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-pkro-token');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  if (req.headers['x-pkro-token'] !== process.env.PKRO_APP_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' }); return;
  }

  try {
    const { prompt } = req.body;
    if (!prompt) { res.status(400).json({ error: 'Missing prompt' }); return; }
    if (prompt.length > 12000) { res.status(413).json({ error: 'Prompt too large' }); return; }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      res.status(response.status).json({ error: err });
      return;
    }

    const data = await response.json();
    const text = data.content?.map(c => c.text || '').join('') || '';
    res.status(200).json({ text });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
