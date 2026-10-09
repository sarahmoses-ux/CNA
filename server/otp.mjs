import { randomBytes, randomInt, createHash, createHmac, timingSafeEqual } from 'node:crypto';

const digest = value => createHash('sha256').update(value).digest('hex');
const lifetime = 10 * 60 * 1000;
const cooldown = 60 * 1000;
const failure = (message = 'This code is invalid or expired. Start again to request a new code.', status = 400, retryAfter) => Object.assign(new Error(message), { status, retryAfter });

export async function consumeRateLimit(collection, key, maximum, period, now) {
  const window = Math.floor(now / period);
  const expires = new Date((window + 1) * period);
  const filter = { _id: `${key}:${window}` };
  let limit;
  try { limit = await collection.findOneAndUpdate(filter, { $inc: { count: 1 }, $setOnInsert: { expires } }, { upsert: true, returnDocument: 'after' }); }
  catch (error) {
    if (error.code !== 11000) throw error;
    limit = await collection.findOneAndUpdate(filter, { $inc: { count: 1 } }, { returnDocument: 'after' });
  }
  if (limit.count > maximum) throw failure('Too many attempts. Please try again later.', 429, Math.ceil((expires.getTime() - now) / 1000));
}

export function createOtpFlow({ secret = process.env.OTP_SECRET, send, now = Date.now }) {
  const configured = () => {
    if (!secret || secret.length < 32 || !send || send.configured === false) throw failure('Email verification is not configured yet. Please contact admissions.', 503);
  };
  const hashCode = (id, code) => createHmac('sha256', secret).update(`${id}:${code}`).digest('hex');
  const validId = id => typeof id === 'string' && /^[a-f0-9]{64}$/.test(id);
  const details = id => ({ verificationRequired: true, challengeId: id, expiresIn: lifetime / 1000, resendAfter: cooldown / 1000 });
  const budget = (rateLimits, email) => consumeRateLimit(rateLimits, `email:${digest(email)}`, 5, 60 * 60 * 1000, now());
  const deliver = async (challenges, record, code) => {
    try {
      await send({ email: record.email, code, purpose: record.purpose, deliveryId: `otp/${record._id}/${record.delivery_id}` });
      await challenges.updateOne({ _id: record._id, delivery_id: record.delivery_id, state: 'sending' }, { $set: { state: 'ready' } });
    } catch (error) {
      await challenges.deleteOne({ _id: record._id, delivery_id: record.delivery_id });
      throw error;
    }
  };
  return {
    configured,
    async begin({ challenges, rateLimits }, draft) {
      configured();
      await budget(rateLimits, draft.email);
      const id = randomBytes(32).toString('hex');
      const code = String(randomInt(0, 1000000)).padStart(6, '0');
      const record = { ...draft, _id: digest(id), code_hash: hashCode(digest(id), code), attempts: 0, resend_count: 0, state: 'sending', delivery_id: randomBytes(16).toString('hex'), last_sent: new Date(now()), expires: new Date(now() + lifetime) };
      await challenges.insertOne(record);
      await deliver(challenges, record, code);
      return details(id);
    },
    async resend({ challenges, rateLimits }, id) {
      configured();
      if (!validId(id)) throw failure();
      const existing = await challenges.findOne({ _id: digest(id), state: 'ready', expires: { $gt: new Date(now()) }, attempts: { $lt: 5 }, resend_count: { $lt: 4 } });
      if (!existing) throw failure();
      const wait = Math.ceil((existing.last_sent.getTime() + cooldown - now()) / 1000);
      if (wait > 0) throw failure('Please wait before requesting another code.', 429, wait);
      await budget(rateLimits, existing.email);
      let code;
      do { code = String(randomInt(0, 1000000)).padStart(6, '0'); } while (hashCode(existing._id, code) === existing.code_hash);
      const record = await challenges.findOneAndUpdate({ _id: existing._id, state: 'ready', expires: { $gt: new Date(now()) }, attempts: { $lt: 5 }, resend_count: { $lt: 4 }, last_sent: { $lte: new Date(now() - cooldown) } }, {
        $set: { code_hash: hashCode(existing._id, code), state: 'sending', delivery_id: randomBytes(16).toString('hex'), last_sent: new Date(now()), expires: new Date(now() + lifetime) }, $inc: { resend_count: 1 },
      }, { returnDocument: 'after' });
      if (!record) throw failure('Please wait before requesting another code.', 429, 60);
      await deliver(challenges, record, code);
      return details(id);
    },
    async verify({ challenges }, id, code) {
      configured();
      if (!validId(id) || typeof code !== 'string' || !/^\d{6}$/.test(code)) throw failure('Enter the six-digit code from your email.');
      const record = await challenges.findOneAndUpdate({ _id: digest(id), state: 'ready', expires: { $gt: new Date(now()) }, attempts: { $lt: 5 } }, { $inc: { attempts: 1 } }, { returnDocument: 'after' });
      if (!record || !timingSafeEqual(Buffer.from(record.code_hash, 'hex'), Buffer.from(hashCode(record._id, code), 'hex'))) throw failure();
      // Atomic removal prevents replay and concurrent verification of one code.
      const consumed = await challenges.findOneAndDelete({ _id: record._id, code_hash: record.code_hash, state: 'ready', expires: { $gt: new Date(now()) }, attempts: { $lte: 5 } });
      if (!consumed) throw failure();
      return consumed;
    },
  };
}
