import { ObjectId } from 'mongodb';
import { programs } from '../src/data.js';

const statuses = ['Inquiry', 'Applied', 'Enrolled', 'In progress', 'Completed', 'Withdrawn'];
const invalid = message => Object.assign(new Error(message), { status: 400 });
const text = (value, maximum, label) => {
  if (typeof value !== 'string' || value.trim().length > maximum) throw invalid(`Enter a valid ${label}.`);
  return value.trim();
};
export function studentFields(body) {
  const name = text(body.name, 100, 'student name');
  const email = text(body.email, 254, 'email address').toLowerCase();
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw invalid('Enter the student’s name and a valid email address.');
  const phone = text(body.phone ?? '', 40, 'phone number');
  const program = text(body.program ?? '', 100, 'program');
  if (program && !programs.some(item => item.slug === program)) throw invalid('Choose an academy program.');
  const status = body.status ?? 'Inquiry';
  if (!statuses.includes(status)) throw invalid('Choose a valid enrollment status.');
  const start_date = text(body.start_date ?? '', 10, 'start date');
  const end_date = text(body.end_date ?? '', 10, 'end date');
  for (const date of [start_date, end_date]) if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) throw invalid('Use a valid class date.');
  if (start_date && end_date && end_date < start_date) throw invalid('The end date must be on or after the start date.');
  return { name, email, phone, program, status, start_date, end_date, class_schedule: text(body.class_schedule ?? '', 300, 'class schedule'), notes: text(body.notes ?? '', 2000, 'notes') };
}
export const staffStudent = record => record ? {
  id: record._id.toString(), name: record.name, email: record.email,
  phone: record.phone || '', program: record.program || '', status: record.status || 'Inquiry',
  start_date: record.start_date || '', end_date: record.end_date || '', class_schedule: record.class_schedule || '', notes: record.notes || '',
  has_account: Boolean(record.user_id), created_at: record.created_at, updated_at: record.updated_at,
} : null;
export const ownStudent = record => record ? { name: record.name, program: record.program || '', status: record.status || 'Inquiry', start_date: record.start_date || '', end_date: record.end_date || '', class_schedule: record.class_schedule || '' } : null;
export async function linkStudent(students, user, timestamp) {
  const update = {
    $setOnInsert: { name: user.name, email: user.email, status: 'Inquiry', created_at: new Date(timestamp).toISOString() },
    $set: { user_id: user._id, updated_at: new Date(timestamp).toISOString() },
  };
  try { await students.updateOne({ email: user.email }, update, { upsert: true }); }
  catch (error) {
    if (error.code !== 11000) throw error;
    await students.updateOne({ email: user.email }, { $set: update.$set });
  }
}
export async function syncStudentAccounts(students, users, staffEmails, now) {
  let batch = [];
  for await (const account of users.find({ email: { $nin: staffEmails } }, { projection: { name: 1, email: 1, email_verified_at: 1 } })) {
    if (!account.email_verified_at) continue;
    batch.push(linkStudent(students, account, now()));
    if (batch.length === 20) { await Promise.all(batch); batch = []; }
  }
  await Promise.all(batch);
}
export async function handleStudentRequest({ req, body, url, user, currentUser, students, users, staffEmails, now, reply, syncAccounts }) {
  if (url.pathname === '/api/student-record') {
    if (!user) return reply(401, { error: 'Please sign in.' });
    return reply(200, { student: ownStudent(await students.findOne({ email: currentUser.email })) });
  }
  if (!user) return reply(401, { error: 'Please sign in.' });
  if (user.role !== 'admin') return reply(403, { error: 'Administrator access is required.' });
  if (url.pathname === '/api/admin-students' && req.method === 'GET') {
    // Migrate older verified accounts once per backend process. New sign-ins link directly.
    await syncAccounts();
    const query = url.searchParams.get('q') || '';
    if (query.length > 100) throw invalid('Use a shorter search.');
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filter = query ? { $or: [{ name: { $regex: escaped, $options: 'i' } }, { email: { $regex: escaped, $options: 'i' } }] } : {};
    const cursor = url.searchParams.get('cursor');
    if (cursor) {
      if (!/^[a-f0-9]{24}$/.test(cursor)) throw invalid('Invalid page cursor.');
      filter._id = { $gt: new ObjectId(cursor) };
    }
    const records = await students.find(filter).sort({ _id: 1 }).limit(51).toArray();
    return reply(200, { students: records.slice(0, 50).map(staffStudent), nextCursor: records.length > 50 ? records[49]._id.toString() : null });
  }
  if (url.pathname === '/api/admin-students') {
    const fields = studentFields(body);
    if (staffEmails.includes(fields.email)) throw invalid('Use a student email address, rather than an administrator account.');
    const timestamp = new Date(now()).toISOString();
    const account = await users.findOne({ email: fields.email });
    const record = { ...fields, ...(account && !staffEmails.includes(account.email) ? { user_id: account._id } : {}), created_at: timestamp, updated_at: timestamp, updated_by: currentUser._id };
    try {
      const result = await students.insertOne(record);
      return reply(201, { student: staffStudent({ ...record, _id: result.insertedId }) });
    } catch (error) {
      if (error.code === 11000) return reply(409, { error: 'A student record with this email already exists. Open it to make changes.' });
      throw error;
    }
  }
  const id = req.method === 'GET' ? url.searchParams.get('id') : body.id;
  if (typeof id !== 'string' || !/^[a-f0-9]{24}$/.test(id)) throw invalid('Invalid student record.');
  const record = await students.findOne({ _id: new ObjectId(id) });
  if (!record) return reply(404, { error: 'Student record not found.' });
  if (req.method === 'GET') return reply(200, { student: staffStudent(record) });
  const fields = studentFields(body);
  if (fields.email !== record.email) throw invalid('The saved email identifies this student account and cannot be changed here.');
  const updated = await students.findOneAndUpdate({ _id: record._id }, { $set: { ...fields, updated_at: new Date(now()).toISOString(), updated_by: currentUser._id } }, { returnDocument: 'after' });
  return reply(200, { student: staffStudent(updated) });
}
