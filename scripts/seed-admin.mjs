import { MongoClient } from 'mongodb';
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { loadApiEnvironment } from '../server/environment.mjs';

loadApiEnvironment();
const email = (process.env.SEED_ADMIN_EMAIL || 'sayflux04@gmail.com').trim().toLowerCase();
const allowed = (process.env.ADMIN_EMAILS || '').split(',').map(value => value.trim().toLowerCase());
if (!allowed.includes(email)) throw new Error('SEED_ADMIN_EMAIL must be included in ADMIN_EMAILS.');
if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI before seeding the administrator.');
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
try {
  await client.connect();
  const users = client.db(process.env.MONGODB_DB || 'cna_academy').collection('users');
  await users.createIndex({ email: 1 }, { unique: true });
  if (await users.findOne({ email })) {
    console.log('Administrator account already exists. Its password and records were preserved. Sign in at /admin with the existing password and email OTP.');
  } else {
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (!password || password.length < 12 || password.length > 128) throw new Error('Set a private SEED_ADMIN_PASSWORD of 12–128 characters before seeding.');
    const salt = randomBytes(16).toString('hex');
    const password_hash = (await promisify(scrypt)(password, salt, 64)).toString('hex');
    try {
      await users.insertOne({ email, name: process.env.SEED_ADMIN_NAME || 'Academy Administrator', salt, password_hash, created_at: new Date().toISOString() });
      console.log('Administrator account seeded. Sign in at /admin with SEED_ADMIN_PASSWORD and complete email OTP verification.');
    } catch (error) {
      if (error.code !== 11000) throw error;
      console.log('Administrator account already exists. Existing credentials were preserved.');
    }
  }
} finally { await client.close(); }
