import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { createAccountHandler } from './accounts.mjs';
import { createOtpMailer } from './resend.mjs';
import { mockMongo } from './test-fixture.mjs';

async function setup(t) {
  const mongo = mockMongo(t), emails = [];
  let clock = Date.UTC(2026, 9, 9, 12), mailFails = false;
  const options = {
    uri: 'mongodb://127.0.0.1:27017', secure: true, origin: 'https://cnatrainingacademy.org', proxySecret: undefined,
    otpSecret: 'isolated-otp-test-secret-at-least-32-characters', now: () => clock,
    getClientIp: req => req.headers['x-forwarded-for'] || 'test-ip',
    sendOtp: async mail => { if (mailFails) throw Object.assign(new Error('Email unavailable'), { status: 503 }); emails.push(mail); },
  };
  const handler = createAccountHandler(options);
  const server = createServer(async (req, res) => {
    if (req.headers['x-test-parsed']) { let raw = ''; for await (const chunk of req) raw += chunk; req.body = JSON.parse(raw); }
    await handler(req, res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await handler.closeDatabase(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (path, body, { ip = 'test-ip', cookie, parsed = false, origin = options.origin } = {}) => fetch(base + '/api/' + path, {
    method: body ? 'POST' : 'GET', headers: { 'x-forwarded-for': ip, ...(body ? { 'Content-Type': 'application/json', Origin: origin, ...(parsed ? { 'x-test-parsed': '1' } : {}) } : {}), ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const begin = async (path, data, extra) => {
    const response = await call(path, data, extra); assert.equal(response.status, 202);
    assert.equal(response.headers.get('set-cookie'), null, 'No session before OTP verification');
    const result = await response.json();
    assert.equal(result.verificationRequired, true); assert.equal(result.code, undefined);
    return { ...result, code: emails.at(-1).code };
  };
  return { mongo, emails, options, call, begin, advance: ms => { clock += ms; }, failMail: () => { mailFails = true; } };
}
const student = { name: 'Test Student', email: 'student@example.test', password: 'test-password-at-least-12' };
const verify = challenge => ({ challengeId: challenge.challengeId, code: challenge.code });

test('registration creates an account and a secure session only after OTP; login requires a new OTP', async t => {
  const { mongo, call, begin, emails } = await setup(t);
  assert.equal((await call('health')).status, 200);
  assert.equal((await call('register', student, { origin: 'https://wrong.example' })).status, 403);
  const challenge = await begin('register', student, { parsed: true });
  assert.equal(mongo.store('users').size, 0);
  assert.equal(mongo.store('sessions').size, 0);
  assert.equal((await call('me')).status, 401);
  const stored = [...mongo.store('auth_challenges').values()][0];
  assert.notEqual(stored.code_hash, challenge.code);
  assert.notEqual(stored._id, challenge.challengeId);
  assert.equal(stored.pending_user.password, undefined);
  assert.equal((await call('verify-otp', { ...verify(challenge), code: challenge.code === '000000' ? '000001' : '000000' })).status, 400);
  const confirmed = await call('verify-otp', verify(challenge));
  assert.equal(confirmed.status, 201);
  assert.match(confirmed.headers.get('set-cookie'), /HttpOnly/);
  assert.match(confirmed.headers.get('set-cookie'), /Secure/);
  const cookie = confirmed.headers.get('set-cookie').split(';')[0];
  const firstUser = (await confirmed.json()).user;
  assert.equal(firstUser.email_verified, true);
  assert.equal(firstUser.password_hash, undefined);
  assert.equal((await (await call('me', null, { cookie })).json()).user.email, student.email);
  assert.equal((await call('verify-otp', verify(challenge))).status, 400, 'OTP cannot be reused');
  assert.equal((await call('register', student)).status, 409);
  assert.equal((await call('logout', {}, { cookie })).status, 200);
  assert.equal((await call('me', null, { cookie })).status, 401);
  const before = emails.length;
  assert.equal((await call('login', { ...student, password: 'wrong' })).status, 401);
  assert.equal(emails.length, before, 'Wrong password sends no OTP');
  const login = await begin('login', student);
  assert.equal((await call('me')).status, 401);
  const signedIn = await call('verify-otp', verify(login));
  assert.equal(signedIn.status, 200);
  assert.equal((await signedIn.json()).user.id, firstUser.id);
  assert.equal(mongo.connections, 1);
  mongo.healthy = false;
  assert.equal((await call('health')).status, 500);
});

test('expired codes, five wrong attempts, and simultaneous replay cannot create extra accounts or sessions', async t => {
  const { mongo, begin, call, advance } = await setup(t);
  const expired = await begin('register', student);
  advance(10 * 60 * 1000);
  assert.equal((await call('verify-otp', verify(expired))).status, 400, 'Expiry is enforced before TTL cleanup');
  const locked = await begin('register', { ...student, email: 'locked@example.test' });
  for (let i = 0; i < 5; i++) assert.equal((await call('verify-otp', { ...verify(locked), code: locked.code === '000000' ? '000001' : '000000' })).status, 400);
  assert.equal((await call('verify-otp', verify(locked))).status, 400);
  assert.equal((await call('resend-otp', { challengeId: locked.challengeId })).status, 400, 'Resending cannot bypass attempt limit');
  const concurrent = await begin('register', { ...student, email: 'concurrent@example.test' });
  const responses = await Promise.all([call('verify-otp', verify(concurrent)), call('verify-otp', verify(concurrent))]);
  assert.deepEqual(responses.map(response => response.status).sort(), [201, 400]);
  assert.equal(mongo.store('users').size, 1);
  assert.equal(mongo.store('sessions').size, 1);
});

test('resend cooldown, code replacement, and email budget persist in MongoDB', async t => {
  const { mongo, begin, call, advance, emails } = await setup(t);
  const challenge = await begin('register', student);
  assert.equal((await call('verify-otp', { ...verify(challenge), code: challenge.code === '000000' ? '000001' : '000000' })).status, 400);
  let response = await call('resend-otp', { challengeId: challenge.challengeId });
  assert.equal(response.status, 429); assert.equal(response.headers.get('retry-after'), '60');
  assert.equal(emails.length, 1);
  advance(60000);
  response = await call('resend-otp', { challengeId: challenge.challengeId });
  assert.equal(response.status, 202);
  const latest = emails.at(-1).code;
  assert.notEqual(latest, challenge.code);
  assert.equal((await call('verify-otp', verify(challenge))).status, 400);
  const record = [...mongo.store('auth_challenges').values()][0];
  assert.equal(record.resend_count, 1);
  assert.equal(record.attempts, 2, 'Resend does not reset attempts');
  assert.equal((await call('verify-otp', { challengeId: challenge.challengeId, code: latest })).status, 201);
  for (let i = 0; i < 3; i++) await begin('login', student, { ip: `email-budget-${i}` });
  assert.equal((await call('login', student, { ip: 'another-visitor' })).status, 429, 'Email sending budget is shared between IPs');
  // Two previous sends plus three accepted logins exhaust the five-per-hour budget.
});

test('mail failures and missing email configuration never grant account access', async t => {
  const { mongo, call, failMail, options } = await setup(t);
  failMail();
  assert.equal((await call('register', student)).status, 503);
  assert.equal(mongo.store('users').size, 0);
  assert.equal(mongo.store('sessions').size, 0);
  assert.equal(mongo.store('auth_challenges').size, 0, 'Failed delivery removes the pending challenge');
  const handler = createAccountHandler({ ...options, otpSecret: '' });
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await handler.closeDatabase(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base + '/api/health')).status, 503);
  assert.equal((await fetch(base + '/api/register', { method: 'POST', headers: { Origin: options.origin, 'Content-Type': 'application/json' }, body: JSON.stringify(student) })).status, 503);
});

test('legacy sessions cannot bypass OTP and IP limits are shared between instances', async t => {
  const { mongo, call, options } = await setup(t);
  const legacyToken = 'a'.repeat(64);
  mongo.store('sessions').set(createHash('sha256').update(legacyToken).digest('hex'), { _id: createHash('sha256').update(legacyToken).digest('hex'), user_id: 'legacy-user', expires: new Date(Date.UTC(2027, 0, 1)) });
  assert.equal((await call('me', null, { cookie: `academy_session=${legacyToken}` })).status, 401);
  for (let i = 0; i < 30; i++) await call('verify-otp', { challengeId: 'invalid', code: '111111' }, { ip: 'limited' });
  const handler = createAccountHandler(options), server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await handler.closeDatabase(); });
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/verify-otp`, { method: 'POST', headers: { Origin: options.origin, 'Content-Type': 'application/json', 'x-forwarded-for': 'limited' }, body: JSON.stringify({ challengeId: 'invalid', code: '111111' }) });
  assert.equal(response.status, 429);
});

test('Resend uses server credentials and an idempotency key, and handles delivery failures safely', async () => {
  let request;
  const mailer = createOtpMailer({ apiKey: 're_test_private', from: 'CNA Training Academy <verification@example.test>', fetchEmail: async (url, options) => { request = { url, ...options }; return new Response(JSON.stringify({ id: 'email-id' }), { status: 200 }); } });
  await mailer({ email: 'student@example.test', code: '012345', purpose: 'register', deliveryId: 'otp/test/delivery' });
  assert.equal(request.url, 'https://api.resend.com/emails');
  assert.equal(request.headers.Authorization, 'Bearer re_test_private');
  assert.equal(request.headers['Idempotency-Key'], 'otp/test/delivery');
  const data = JSON.parse(request.body); assert.deepEqual(data.to, ['student@example.test']); assert.match(data.text, /012345/);
  const failing = createOtpMailer({ apiKey: 're_test_private', from: 'verification@example.test', fetchEmail: async () => new Response('secret provider failure details', { status: 401 }) });
  await assert.rejects(() => failing({ email: 'student@example.test', code: '123456', purpose: 'login', deliveryId: 'test' }), error => error.status === 503 && !error.message.includes('secret provider'));
});
