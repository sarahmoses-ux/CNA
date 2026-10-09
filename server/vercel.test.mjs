import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createAccountHandler } from './accounts.mjs';
import { proxyAccountRequest } from './proxy.mjs';

test('Render startup uses PORT and binds to its public interface', async t => {
  const reservation = createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const child = spawn(process.execPath, ['server/start.mjs'], { env: {
    ...process.env, RENDER: 'true', NODE_ENV: 'production', PORT: String(port), API_PORT: '1', API_HOST: '0.0.0.0',
    APP_ORIGIN: 'https://cnatrainingacademy.org', API_PROXY_SECRET: 'startup-test-secret', RESEND_API_KEY: 're_test', RESEND_FROM: 'verification@example.test', OTP_SECRET: 'startup-test-otp-secret-at-least-32-characters', MONGODB_URI: 'mongodb://127.0.0.1:27017',
  }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  t.after(() => new Promise(resolve => { if (child.exitCode !== null) return resolve(); child.once('exit', resolve); child.kill(); }));
  await new Promise((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error('Render startup timed out')), 15000);
    child.stdout.on('data', data => { if (data.toString().includes(`0.0.0.0:${port}`)) { clearTimeout(deadline); resolve(); } });
    child.once('error', error => { clearTimeout(deadline); reject(error); });
    child.once('exit', code => { clearTimeout(deadline); reject(new Error(`Startup exited early: ${code}`)); });
  });
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/missing`)).status, 404);
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/me`)).status, 403);
});

test('unknown API routes and wrong methods fail before connecting to MongoDB', async t => {
  const handler = createAccountHandler({ uri: '', secure: false });
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await handler.closeDatabase(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base + '/api/missing')).status, 404);
  const wrongMethod = await fetch(base + '/api/register');
  assert.equal(wrongMethod.status, 405);
  assert.equal(wrongMethod.headers.get('allow'), 'POST');
  assert.equal((await fetch(base + '/api/health')).status, 503);
});

test('Render rejects unauthenticated proxy requests and allows its public health check', async t => {
  const handler = createAccountHandler({ uri: '', secure: true, origin: 'https://cnatrainingacademy.org', proxySecret: 'shared-test-secret' });
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await handler.closeDatabase(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base + '/api/me')).status, 403);
  assert.equal((await fetch(base + '/api/me', { headers: { 'x-academy-proxy-secret': 'wrong' } })).status, 403);
  assert.equal((await fetch(base + '/api/me', { headers: { 'x-academy-proxy-secret': 'shared-test-secret' } })).status, 503);
  assert.equal((await fetch(base + '/api/health')).status, 503, 'Health reaches database configuration without proxy credentials');
});

test('Vercel relay forwards bodies, origins, cookies, and trusted client IPs to Render', async t => {
  const received = [];
  let offline = false;
  const server = createServer(async (req, res) => {
    if (req.headers['x-test-parsed']) { let raw = ''; for await (const chunk of req) raw += chunk; req.body = JSON.parse(raw); }
    await proxyAccountRequest(req, res, {
      backend: 'https://example.onrender.com', secret: 'relay-test-secret',
      fetchUpstream: async (url, options) => {
        if (offline) throw new Error('Offline');
        received.push({ url: url.toString(), ...options });
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json', 'set-cookie': 'academy_session=test; HttpOnly; Secure; SameSite=Lax; Path=/', 'retry-after': '60' } });
      },
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const parsed of [false, true]) {
    const response = await fetch(base + '/api/login', { method: 'POST', headers: {
      'Content-Type': 'application/json', Origin: 'https://cnatrainingacademy.org', Cookie: 'academy_session=existing',
      'x-forwarded-for': '203.0.113.4, 203.0.113.5', 'x-academy-client-ip': 'forged', 'x-academy-proxy-secret': 'forged',
      ...(parsed ? { 'x-test-parsed': '1' } : {}),
    }, body: JSON.stringify({ email: 'student@example.test', password: 'test-password' }) });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('set-cookie'), /HttpOnly; Secure/);
    assert.equal(response.headers.get('retry-after'), '60');
    const upstream = received.at(-1);
    assert.equal(upstream.url, 'https://example.onrender.com/api/login');
    assert.equal(upstream.headers.origin, 'https://cnatrainingacademy.org');
    assert.equal(upstream.headers.cookie, 'academy_session=existing');
    assert.equal(upstream.headers['x-academy-client-ip'], '203.0.113.4');
    assert.equal(upstream.headers['x-academy-proxy-secret'], 'relay-test-secret');
    assert.equal(JSON.parse(upstream.body.toString()).email, 'student@example.test');
  }
  const before = received.length;
  assert.equal((await fetch(base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'x'.repeat(9000) }) })).status, 413);
  assert.equal((await fetch(base + '/api/unknown')).status, 404);
  assert.equal(received.length, before, 'Invalid requests do not reach Render');
  offline = true;
  assert.equal((await fetch(base + '/api/health')).status, 502);
});
