import { apiMethods } from './api-routes.mjs';

export async function proxyAccountRequest(req, res, { backend = process.env.RENDER_API_URL, fetchUpstream = fetch } = {}) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  const reply = (status, error) => { res.writeHead(status); res.end(JSON.stringify({ error })); };
  const url = new URL(req.url, 'http://localhost');
  const routedEndpoint = req.query?.__academyEndpoint || url.searchParams.get('__academyEndpoint');
  const path = url.pathname === '/api/[endpoint]' && typeof routedEndpoint === 'string' ? `/api/${routedEndpoint}` : url.pathname;
  url.searchParams.delete('__academyEndpoint');
  const methods = apiMethods[path];
  if (!methods) return reply(404, 'Not found.');
  if (!methods.includes(req.method)) { res.setHeader('Allow', methods.join(', ')); return reply(405, 'Method not allowed.'); }
  if (!backend) return reply(503, 'The account service is not configured yet.');
  try {
    const base = new URL(backend);
    if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/' || base.search || base.hash) return reply(503, 'The account service is not configured correctly.');
    let body;
    if (req.method === 'POST') {
      if (req.body !== undefined) body = Buffer.isBuffer(req.body) ? req.body : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
      else {
        const chunks = []; let size = 0;
        for await (const chunk of req) {
          const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          size += bytes.length;
          if (size > 8192) return reply(413, 'Request too large.');
          chunks.push(bytes);
        }
        body = Buffer.concat(chunks);
      }
      if (body.length > 8192) return reply(413, 'Request too large.');
    }
    const headers = {};
    for (const key of ['content-type', 'origin', 'cookie']) if (typeof req.headers[key] === 'string') headers[key] = req.headers[key];
    const destination = new URL(path, base);
    destination.search = url.search;
    const response = await fetchUpstream(destination, { method: req.method, headers, ...(body !== undefined ? { body } : {}), signal: AbortSignal.timeout(25000), redirect: 'error' });
    if (!response.headers.get('content-type')?.includes('application/json')) return reply(502, 'The account service is temporarily unavailable.');
    for (const key of ['content-type', 'retry-after', 'allow', 'x-content-type-options']) if (response.headers.has(key)) res.setHeader(key, response.headers.get(key));
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader('Set-Cookie', cookies);
    const responseBody = await response.text();
    res.writeHead(response.status);
    res.end(responseBody);
  } catch {
    if (!res.headersSent) reply(502, 'Unable to reach the account service. Please try again.');
  }
}
