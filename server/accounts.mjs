import { createServer } from 'node:http';
import { MongoClient, ObjectId } from 'mongodb';
import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
const hashToken = value => createHash('sha256').update(value).digest('hex');
export function createAccountServer({ uri = process.env.MONGODB_URI, database = process.env.MONGODB_DB || 'cna_academy', origin = process.env.APP_ORIGIN, secure = process.env.NODE_ENV === 'production' } = {}) {
  if (secure && !origin) throw new Error('APP_ORIGIN is required in production.');
  let client;
  let connecting;
  async function collections() {
    if (!uri) {
      const error = new Error('Student accounts are not configured yet. Please contact admissions.');
      error.status = 503;
      throw error;
    }
    if (!connecting) {
      client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000, maxPoolSize: 10 });
      const activeClient = client;
      connecting = (async () => {
        await activeClient.connect();
        const db = activeClient.db(database);
        const users = db.collection('users');
        const sessions = db.collection('sessions');
        await Promise.all([
          users.createIndex({ email: 1 }, { unique: true }),
          sessions.createIndex({ expires: 1 }, { expireAfterSeconds: 0 }),
          sessions.createIndex({ user_id: 1 }),
        ]);
        return { users, sessions };
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
  const publicUser = record => record ? { id: record._id.toString(), name: record.name, email: record.email, created_at: record.created_at } : null;
  const attempts = new Map();
  const dummySalt = randomBytes(16).toString('hex');
  const cookie = (token, age) => `academy_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age}${secure ? '; Secure' : ''}`;
  const server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const reply = (status, body) => { res.writeHead(status); res.end(JSON.stringify(body)); };
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (!path.startsWith('/api/')) return reply(404, { error: 'Not found.' });
      if (!['GET', 'POST'].includes(req.method)) return reply(405, { error: 'Method not allowed.' });
      if (req.method === 'POST') {
        const allowedOrigin = origin || `http://${req.headers.host}`;
        if (req.headers.origin !== allowedOrigin) return reply(403, { error: 'Request origin not allowed.' });
        if (!req.headers['content-type']?.startsWith('application/json')) return reply(415, { error: 'Send JSON.' });
      }
      const { users, sessions } = await collections();
      const token = /(?:^|;\s*)academy_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
      const currentSession = token ? await sessions.findOne({ _id: hashToken(token), expires: { $gt: new Date() } }) : null;
      const user = currentSession ? publicUser(await users.findOne({ _id: currentSession.user_id })) : null;
      if (path === '/api/me' && req.method === 'GET') return user ? reply(200, { user }) : reply(401, { error: 'Please sign in.' });
      if (path === '/api/logout' && req.method === 'POST') {
        if (token) await sessions.deleteOne({ _id: hashToken(token) });
        res.setHeader('Set-Cookie', cookie('', 0));
        return reply(200, { ok: true });
      }
      if (!['/api/register', '/api/login'].includes(path) || req.method !== 'POST') return reply(404, { error: 'Not found.' });
      const ip = req.socket.remoteAddress;
      const now = Date.now();
      for (const [key, value] of attempts) if (value.until < now) attempts.delete(key);
      const limit = attempts.get(ip) || { count: 0, until: now + 15 * 60 * 1000 };
      attempts.set(ip, limit);
      if (++limit.count > 30) { res.setHeader('Retry-After', '900'); return reply(429, { error: 'Too many attempts. Please try again in 15 minutes.' }); }
      let raw = '';
      for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 8192) return reply(413, { error: 'Request too large.' }); }
      let body;
      try { body = JSON.parse(raw); } catch { return reply(400, { error: 'Invalid request.' }); }
      if (!body || typeof body !== 'object') return reply(400, { error: 'Invalid request.' });
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !password || password.length > 128) return reply(400, { error: 'Enter a valid email and password.' });
      let account;
      if (path === '/api/register') {
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (!name || name.length > 100 || password.length < 12) return reply(400, { error: 'Enter your name and a password of at least 12 characters.' });
        const salt = randomBytes(16).toString('hex');
        const passwordHash = (await derive(password, salt, 64)).toString('hex');
        try {
          const record = { name, email, salt, password_hash: passwordHash, created_at: new Date().toISOString() };
          const result = await users.insertOne(record);
          account = publicUser({ ...record, _id: result.insertedId });
        } catch (error) {
          if (error.code === 11000) return reply(409, { error: 'Unable to create this account. Try signing in with your email.' });
          throw error;
        }
      } else {
        const record = await users.findOne({ email });
        const candidate = await derive(password, record?.salt || dummySalt, 64);
        if (!record || !timingSafeEqual(candidate, Buffer.from(record.password_hash, 'hex'))) return reply(401, { error: 'Email or password is incorrect.' });
        account = publicUser(record);
      }

      if (token) await sessions.deleteOne({ _id: hashToken(token) });
      const session = randomBytes(32).toString('hex');
      await sessions.insertOne({ _id: hashToken(session), user_id: new ObjectId(account.id), expires: new Date(now + 7 * 24 * 60 * 60 * 1000) });
      res.setHeader('Set-Cookie', cookie(session, 604800));
      reply(path === '/api/register' ? 201 : 200, { user: account });
    } catch (error) { console.error('Account request failed:', error.name); if (!res.headersSent) reply(error.status || 500, { error: error.status === 503 ? error.message : 'Unable to complete this request. Please try again.' }); }
  });
  server.closeDatabase = async () => { await connecting?.catch(() => {}); await client?.close(); };
  server.on('close', () => { void server.closeDatabase(); });
  return server;
}




