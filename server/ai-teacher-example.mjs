// Example server for the AI teachers in labs3d.js (Node 18+, no packages needed).
//   ANTHROPIC_API_KEY=sk-ant-... node server/ai-teacher-example.mjs
// Then set AI.endpoint = 'https://your-server.example/ai' at the top of public/labs3d.js.
// Keep the API key on the server. Never put it in the website's JavaScript.
import http from 'node:http';

const PORT = process.env.PORT || 8787;
const MODEL = process.env.AI_MODEL || 'claude-haiku-4-5'; // any current Claude model id
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || '*';     // set to your site, e.g. https://school.example

http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.method !== 'POST' || !req.url.startsWith('/ai')) { res.writeHead(404); return res.end(); }
  let body = '';
  for await (const chunk of req) { body += chunk; if (body.length > 60000) { res.writeHead(413); return res.end(); } }
  try {
    const { system, messages } = JSON.parse(body);
    const clean = (messages || []).slice(-10).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 2000) }));
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 400, system: String(system || '').slice(0, 4000), messages: clean }),
    });
    const j = await r.json();
    const text = (j.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n') || 'Sorry, I could not answer that right now.';
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ text }));
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ text: 'The AI teacher is unavailable right now.' }));
  }
}).listen(PORT, () => console.log('AI teacher server on http://localhost:' + PORT + '/ai'));
