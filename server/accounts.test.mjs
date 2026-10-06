import test from 'node:test';
import assert from 'node:assert/strict';
import { MongoClient } from 'mongodb';
import { randomUUID } from 'node:crypto';
import { createAccountServer } from './accounts.mjs';
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const close = async server => { await new Promise(resolve => server.close(resolve)); await server.closeDatabase(); };
test('MongoDB accounts persist; sessions isolate students and are revoked on logout', { skip: !process.env.TEST_MONGODB_URI }, async t => {
  const uri = process.env.TEST_MONGODB_URI;
  const database = 'cna_auth_test_' + randomUUID().replaceAll('-', '');
  t.after(async () => {
    if (server.listening) await close(server);
    const cleanup = new MongoClient(uri);
    try { await cleanup.connect(); await cleanup.db(database).dropDatabase(); } finally { await cleanup.close(); }
  });
  let server = createAccountServer({ uri, database });
  await listen(server);
  let base = `http://127.0.0.1:${server.address().port}`;
  const call = (path, body, cookie, origin = base) => fetch(base + '/api/' + path, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type': 'application/json', Origin: origin } : {}), ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  let response = await call('me'); assert.equal(response.status, 401);
  response = await call('register', { name: 'Test Student A', email: 'a@example.test', password: 'test-password-123' }, null, 'https://wrong.example'); assert.equal(response.status, 403);
  response = await call('register', { name: 'Test Student A', email: 'a@example.test', password: 'short' }); assert.equal(response.status, 400);
  response = await call('register', { name: 'Test Student A', email: 'A@EXAMPLE.TEST', password: 'test-password-123' }); assert.equal(response.status, 201);
  const first = response.headers.get('set-cookie').split(';')[0];
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  const firstUser = (await response.json()).user;
  assert.equal(firstUser.email, 'a@example.test'); assert.equal(firstUser.password_hash, undefined);
  response = await call('register', { name: 'Test Student A', email: 'a@example.test', password: 'test-password-123' }); assert.equal(response.status, 409);
  response = await call('register', { name: 'Test Student B', email: 'b@example.test', password: 'test-password-456' }); assert.equal(response.status, 201);
  const second = response.headers.get('set-cookie').split(';')[0];
  assert.equal((await (await call('me', null, first)).json()).user.name, 'Test Student A');
  assert.equal((await (await call('me', null, second)).json()).user.name, 'Test Student B');
  assert.equal((await call('login', { email: 'a@example.test', password: 'wrong-password' })).status, 401);
  assert.equal((await call('logout', {}, first)).status, 200);
  assert.equal((await call('me', null, first)).status, 401);
  await close(server);
  server = createAccountServer({ uri, database }); await listen(server); base = `http://127.0.0.1:${server.address().port}`;
  try {
    response = await call('login', { email: 'a@example.test', password: 'test-password-123' }); assert.equal(response.status, 200);
    assert.equal((await response.json()).user.id, firstUser.id);
    for (let i = 0; i < 31; i++) response = await call('login', { email: 'a@example.test', password: 'wrong-password' });
    assert.equal(response.status, 429);
  } finally { await close(server); }
});


test('missing Atlas configuration reports service unavailable without accepting accounts', async t => {
  const server = createAccountServer({ uri: '', secure: false });
  await listen(server);
  t.after(() => close(server));
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(base + '/api/register', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'No Account', email: 'no-account@example.test', password: 'not-a-real-account' }) });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /not configured yet/);
  assert.equal(response.headers.get('set-cookie'), null);
  const rejected = await fetch(base + '/api/login', { method: 'POST', headers: { Origin: 'https://wrong.example', 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(rejected.status, 403);
});

test('production requires an explicit website origin', () => {
  assert.throws(() => createAccountServer({ uri: '', origin: '', secure: true }), /APP_ORIGIN/);
});

