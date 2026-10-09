import assert from 'node:assert/strict';

const site = new URL(process.env.SITE_URL || 'https://cnatrainingacademy.org');
assert.equal(site.protocol, 'https:', 'Use the HTTPS deployment URL.');
assert.equal(site.pathname, '/', 'SITE_URL must be an origin without a path.');
async function check(path) {
  const response = await fetch(new URL(path, site), { signal: AbortSignal.timeout(15000), redirect: 'follow' });
  assert.equal(new URL(response.url).protocol, 'https:', `${path} must stay on HTTPS`);
  assert.equal(new URL(response.url).origin, site.origin, `${path} must stay on the selected domain`);
  return response;
}
try {
  for (const path of ['/', '/register', '/login', '/dashboard', '/resources', '/academy/blog', '/programs/certified-nurse-aide']) {
    const response = await check(path);
    assert.equal(response.status, 200, `Frontend route ${path}`);
    assert.match(response.headers.get('content-type') || '', /text\/html/, `${path} must serve the website`);
    assert.match(await response.text(), /id="root"/, `${path} must serve the React application`);
  }
  let response = await check('/api/health');
  assert.equal(response.status, 200, 'Account API and MongoDB must be ready');
  assert.deepEqual(await response.json(), { ok: true });
  response = await check('/api/me');
  assert.equal(response.status, 401, 'Account details require a login');
  assert.equal(typeof (await response.json()).error, 'string');
  response = await check('/api/not-a-real-endpoint');
  assert.equal(response.status, 404, 'Unknown API routes must not serve the frontend');
  assert.equal(typeof (await response.json()).error, 'string');
  console.log('Launch checks passed: HTTPS, frontend routes, API routing, MongoDB readiness, and account access checks. No records were created.');
} catch (error) {
  console.error(`Launch check failed: ${error.message}`);
  console.error('Check the domain, deployment, Vercel environment variables, and Atlas Network Access.');
  process.exitCode = 1;
}
