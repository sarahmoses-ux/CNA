import { createServer } from 'node:http';
import { MongoClient, ObjectId } from 'mongodb';
import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { apiMethods } from './api-routes.mjs';
import { linkStudent, handleStudentRequest, syncStudentAccounts } from './student-records.mjs';
import { createOtpMailer } from './resend.mjs';
import { createOtpFlow, consumeRateLimit } from './otp.mjs';
const derive = promisify(scrypt);
const hashToken = value => createHash('sha256').update(value).digest('hex');
export function createAccountHandler({ uri = process.env.MONGODB_URI, database = process.env.MONGODB_DB || 'cna_academy', origin = process.env.APP_ORIGIN, secure = process.env.NODE_ENV === 'production', adminEmails = process.env.ADMIN_EMAILS || '', otpSecret = process.env.OTP_SECRET, sendOtp = createOtpMailer(), now = Date.now, getClientIp = req => req.socket?.remoteAddress || 'unknown' } = {}) {
  if (secure && !origin) throw new Error('APP_ORIGIN is required in production.');
  if (secure && (new URL(origin).origin !== origin || !origin.startsWith('https://'))) throw new Error('APP_ORIGIN must be an exact HTTPS origin without a trailing slash.');
  const staffEmails = adminEmails.split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
  const otp = createOtpFlow({ secret: otpSecret, send: sendOtp, now });
  let client;
  let connecting;
  let syncingStudents;
  async function collections() {
    if (!uri) {
      const error = new Error('Student accounts are not configured yet. Please contact admissions.');
      error.status = 503;
      throw error;
    }
    if (!connecting) {
      client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000, maxPoolSize: 10, maxIdleTimeMS: 60000 });
      const activeClient = client;
      connecting = (async () => {
        await activeClient.connect();
        const db = activeClient.db(database);
        const users = db.collection('users');
        const sessions = db.collection('sessions');
        const rateLimits = db.collection('auth_rate_limits');
        const challenges = db.collection('auth_challenges');
        const students = db.collection('students');
        await Promise.all([
          users.createIndex({ email: 1 }, { unique: true }),
          students.createIndex({ email: 1 }, { unique: true }),
          sessions.createIndex({ expires: 1 }, { expireAfterSeconds: 0 }),
          sessions.createIndex({ user_id: 1 }),
          rateLimits.createIndex({ expires: 1 }, { expireAfterSeconds: 0 }),
          challenges.createIndex({ expires: 1 }, { expireAfterSeconds: 0 }),
        ]);
        return { db, users, sessions, rateLimits, challenges, students };
      })().catch(async () => {
        connecting = undefined;
        await activeClient.close();
        const error = new Error('Student accounts are temporarily unavailable. Please try again later.');
        error.status = 503;
        throw error;
      });
    }
    return connecting;
  }
  const publicUser = record => record ? { id: record._id.toString(), name: record.name, email: record.email, created_at: record.created_at, email_verified: Boolean(record.email_verified_at), role: staffEmails.includes(record.email) ? 'admin' : 'student' } : null;
  const dummySalt = randomBytes(16).toString('hex');
  const cookie = (token, age) => `academy_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age}${secure ? '; Secure' : ''}`;
  const handler = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const reply = (status, body) => { res.writeHead(status); res.end(JSON.stringify(body)); };
    try {
      const url = new URL(req.url, 'http://localhost');
      const path = url.pathname;
      if (!path.startsWith('/api/')) return reply(404, { error: 'Not found.' });
      const methods = apiMethods[path];
      if (!methods) return reply(404, { error: 'Not found.' });
      if (!methods.includes(req.method)) { res.setHeader('Allow', methods.join(', ')); return reply(405, { error: 'Method not allowed.' }); }
      if (req.method === 'POST') {
        const allowedOrigin = origin || `http://${req.headers.host}`;
        if (req.headers.origin !== allowedOrigin) return reply(403, { error: 'Request origin not allowed.' });
        if (!req.headers['content-type']?.startsWith('application/json')) return reply(415, { error: 'Send JSON.' });
      }
      const storage = await collections();
      const { db, users, sessions, rateLimits, students } = storage;
      if (path === '/api/health') { otp.configured(); await db.command({ ping: 1 }); return reply(200, { ok: true }); }
      const token = /(?:^|;\s*)academy_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
      const currentSession = token ? await sessions.findOne({ _id: hashToken(token), expires: { $gt: new Date(now()) }, otp_verified: true }) : null;
      const currentUser = currentSession ? await users.findOne({ _id: currentSession.user_id }) : null;
      const user = currentUser?.email_verified_at ? publicUser(currentUser) : null;
      if (path === '/api/me' && req.method === 'GET') return user ? reply(200, { user }) : reply(401, { error: 'Please sign in.' });
      if (path === '/api/logout' && req.method === 'POST') {
        if (token) await sessions.deleteOne({ _id: hashToken(token) });
        res.setHeader('Set-Cookie', cookie('', 0));
        return reply(200, { ok: true });
      }
      const syncAccounts = () => {
        if (!syncingStudents) syncingStudents = syncStudentAccounts(students, users, staffEmails, now).catch(error => { syncingStudents = undefined; throw error; });
        return syncingStudents;
      };
      const studentRoute = path.startsWith('/api/admin-') || path === '/api/student-record';
      if (studentRoute) {
        if (!user) return reply(401, { error: 'Please sign in.' });
        if (path.startsWith('/api/admin-') && user.role !== 'admin') return reply(403, { error: 'Administrator access is required.' });
        if (req.method === 'GET') return await handleStudentRequest({ req, url, user, currentUser, students, users, staffEmails, now, reply, syncAccounts });
      }
      const timestamp = now();
      await consumeRateLimit(rateLimits, `${studentRoute ? 'admin' : 'ip'}:${hashToken(getClientIp(req))}`, studentRoute ? 120 : 30, 15 * 60 * 1000, timestamp);
      let raw = '';
      if (req.body !== undefined) raw = typeof req.body === 'string' ? req.body : Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
      else for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 8192) return reply(413, { error: 'Request too large.' }); }
      if (Buffer.byteLength(raw) > 8192) return reply(413, { error: 'Request too large.' });
      let body;
      try { body = JSON.parse(raw); } catch { return reply(400, { error: 'Invalid request.' }); }
      if (!body || typeof body !== 'object') return reply(400, { error: 'Invalid request.' });
      if (studentRoute) return await handleStudentRequest({ req, body, url, user, currentUser, students, users, staffEmails, now, reply, syncAccounts });
      if (path === '/api/resend-otp') return reply(202, await otp.resend(storage, body.challengeId));
      if (path === '/api/verify-otp') {
        const challenge = await otp.verify(storage, body.challengeId, body.code);
        let account;
        if (challenge.purpose === 'register') {
          const record = { ...challenge.pending_user, email_verified_at: new Date(timestamp).toISOString(), created_at: new Date(timestamp).toISOString() };
          try {
            const result = await users.insertOne(record);
            account = publicUser({ ...record, _id: result.insertedId });
          } catch (error) {
            if (error.code === 11000) return reply(409, { error: 'Unable to create this account. Try signing in with your email.' });
            throw error;
          }
        } else {
          const record = await users.findOne({ _id: challenge.user_id });
          if (!record) return reply(400, { error: 'This account is no longer available. Please start again.' });
          const email_verified_at = new Date(timestamp).toISOString();
          await users.updateOne({ _id: record._id }, { $set: { email_verified_at } });
          account = publicUser({ ...record, email_verified_at });
        }
        if (account.role !== 'admin') await linkStudent(students, { _id: new ObjectId(account.id), name: account.name, email: account.email }, timestamp);
        if (token) await sessions.deleteOne({ _id: hashToken(token) });
        const session = randomBytes(32).toString('hex');
        await sessions.insertOne({ _id: hashToken(session), user_id: new ObjectId(account.id), otp_verified: true, expires: new Date(timestamp + 7 * 24 * 60 * 60 * 1000) });
        res.setHeader('Set-Cookie', cookie(session, 604800));
        return reply(challenge.purpose === 'register' ? 201 : 200, { user: account });
      }
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !password || password.length > 128) return reply(400, { error: 'Enter a valid email and password.' });
      otp.configured();
      if (path === '/api/register') {
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (!name || name.length > 100 || password.length < 12) return reply(400, { error: 'Enter your name and a password of at least 12 characters.' });
        if (await users.findOne({ email })) return reply(409, { error: 'Unable to create this account. Try signing in with your email.' });
        const salt = randomBytes(16).toString('hex');
        const password_hash = (await derive(password, salt, 64)).toString('hex');
        return reply(202, await otp.begin(storage, { purpose: 'register', email, pending_user: { name, email, salt, password_hash } }));
      }
      const record = await users.findOne({ email });
      const candidate = await derive(password, record?.salt || dummySalt, 64);
      if (!record || !timingSafeEqual(candidate, Buffer.from(record.password_hash, 'hex'))) return reply(401, { error: 'Email or password is incorrect.' });
      return reply(202, await otp.begin(storage, { purpose: 'login', email, user_id: record._id }));
    } catch (error) { if (!error.status || error.status >= 500) console.error('Account request failed:', error.name); if (!res.headersSent) { if (error.retryAfter) res.setHeader('Retry-After', String(error.retryAfter)); reply(error.status || 500, { error: error.status ? error.message : 'Unable to complete this request. Please try again.' }); } }
  };
  handler.closeDatabase = async () => { await connecting?.catch(() => {}); await client?.close(); };
  return handler;
}

export function createAccountServer(options) {
  const handler = createAccountHandler(options);
  const server = createServer(handler);
  server.closeDatabase = handler.closeDatabase;
  server.on('close', () => { void server.closeDatabase(); });
  return server;
}




