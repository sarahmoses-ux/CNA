import { MongoClient } from 'mongodb';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { loadApiEnvironment } from '../server/environment.mjs';

loadApiEnvironment();
const email = (process.env.SEED_ADMIN_EMAIL || 'sayflux04@gmail.com').trim().toLowerCase();
const allowed = (process.env.ADMIN_EMAILS || '').split(',').map(value => value.trim().toLowerCase());
const password = process.env.SEED_ADMIN_PASSWORD;
if (!allowed.includes(email)) throw new Error('SEED_ADMIN_EMAIL must be included in ADMIN_EMAILS.');
if (!password || password.length < 12 || password.length > 128) throw new Error('Set SEED_ADMIN_PASSWORD to 12–128 characters in your private .env.');
if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI before resetting the administrator password.');
const derive = promisify(scrypt);
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'cna_academy');
  const users = db.collection('users');
  const account = await users.findOne({ email });
  if (!account) throw new Error('Administrator account does not exist. Run npm run seed:admin first.');
  const salt = randomBytes(16).toString('hex');
  const password_hash = (await derive(password, salt, 64)).toString('hex');
  const result = await users.updateOne({ _id: account._id }, { $set: { salt, password_hash } });
  if (result.matchedCount !== 1) throw new Error('Administrator account changed before the password could be updated.');
  await db.collection('sessions').deleteMany({ user_id: account._id });
  await db.collection('auth_challenges').deleteMany({ email });
  const saved = await users.findOne({ _id: account._id });
  const candidate = await derive(password, saved.salt, 64);
  if (!timingSafeEqual(candidate, Buffer.from(saved.password_hash, 'hex'))) throw new Error('Password verification failed.');
  console.log('Administrator password updated and verified. Existing sessions and pending OTP challenges revoked. Sign in at /admin with your new password and a fresh email code.');
} finally { await client.close(); }
