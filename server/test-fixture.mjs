import { MongoClient, ObjectId } from 'mongodb';

// In-memory Mongo fixture for isolated auth tests; no real network or email sends.
export function mockMongo(t) {
  const state = { connections: 0, healthy: true, stores: new Map() };
  const equal = (left, right) => left instanceof ObjectId || right instanceof ObjectId ? left?.toString() === right?.toString() : left === right;
  const matches = (record, filter) => Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some(branch => matches(record, branch));
    if (value && typeof value === 'object' && !(value instanceof Date) && !(value instanceof ObjectId)) return Object.entries(value).every(([op, target]) => {
      const actual = record[key];
      if (op === '$gt') return actual > target;
      if (op === '$gte') return actual >= target;
      if (op === '$lt') return actual < target;
      if (op === '$lte') return actual <= target;
      if (op === '$nin') return !target.some(item => equal(actual, item));
      if (op === '$regex') return new RegExp(target, value.$options || '').test(actual || '');
      if (op === '$options') return true;
      throw new Error(`Unsupported fixture operator ${op}`);
    });
    return equal(record[key], value);
  });
  const store = name => { if (!state.stores.has(name)) state.stores.set(name, new Map()); return state.stores.get(name); };
  state.store = store;
  const collection = name => {
    const records = store(name);
    const find = filter => [...records.values()].find(record => matches(record, filter));
    const apply = (record, update, inserted = false) => {
      if (inserted) Object.assign(record, update.$setOnInsert);
      Object.assign(record, update.$set);
      for (const [key, value] of Object.entries(update.$inc || {})) record[key] = (record[key] || 0) + value;
    };
    return {
      createIndex: async () => {},
      insertOne: async record => {
        if (['users', 'students'].includes(name) && find({ email: record.email })) throw Object.assign(new Error('Duplicate'), { code: 11000 });
        const _id = record._id || new ObjectId(); records.set(_id.toString(), { ...record, _id }); return { insertedId: _id };
      },
      findOne: async filter => { const record = find(filter); return record ? { ...record } : null; },
      updateOne: async (filter, update, options = {}) => {
        let record = find(filter), inserted = false;
        if (!record && options.upsert) { record = { ...filter, _id: filter._id || new ObjectId() }; records.set(record._id.toString(), record); inserted = true; }
        if (record) apply(record, update, inserted);
        return { matchedCount: record ? 1 : 0 };
      },
      find: filter => {
        let values = [...records.values()].filter(record => matches(record, filter)).map(record => ({ ...record }));
        const cursor = {
          sort: order => { const [key, direction] = Object.entries(order)[0]; values.sort((a, b) => { const left = a[key]?.toString(), right = b[key]?.toString(); return (left < right ? -1 : left > right ? 1 : 0) * direction; }); return cursor; },
          limit: count => { values = values.slice(0, count); return cursor; },
          toArray: async () => values,
          async *[Symbol.asyncIterator]() { yield* values; },
        };
        return cursor;
      },
      deleteOne: async filter => { const record = find(filter); if (record) records.delete(record._id.toString()); return { deletedCount: record ? 1 : 0 }; },
      findOneAndDelete: async filter => { const record = find(filter); if (!record) return null; records.delete(record._id.toString()); return { ...record }; },
      findOneAndUpdate: async (filter, update, options = {}) => {
        let record = find(filter), inserted = false;
        if (!record && options.upsert) { record = { ...filter }; records.set(record._id.toString(), record); inserted = true; }
        if (!record) return null;
        const before = { ...record }; apply(record, update, inserted);
        return { ...(options.returnDocument === 'after' ? record : before) };
      },
    };
  };
  t.mock.method(MongoClient.prototype, 'connect', async function () { state.connections++; return this; });
  t.mock.method(MongoClient.prototype, 'db', () => ({ collection, command: async () => { if (!state.healthy) throw new Error('Offline'); return { ok: 1 }; } }));
  t.mock.method(MongoClient.prototype, 'close', async () => {});
  return state;
}
