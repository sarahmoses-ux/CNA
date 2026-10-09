import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { ObjectId } from 'mongodb';
import { createAccountHandler } from './accounts.mjs';
import { mockMongo } from './test-fixture.mjs';

async function setup(t) {
  const mongo = mockMongo(t), mail = [];
  const options = { uri: 'mongodb://127.0.0.1:27017', secure: false, proxySecret: '', otpSecret: 'admin-test-otp-secret-at-least-32-characters', adminEmails: 'sayflux04@gmail.com', sendOtp: async email => { mail.push(email); } };
  const handler = createAccountHandler(options), server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await handler.closeDatabase(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (path, body, cookie, origin = base) => fetch(base + '/api/' + path, { method: body ? 'POST' : 'GET', headers: { ...(body ? { Origin: origin, 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const auth = async (email, extra = {}) => {
    const started = await call('register', { name: email.split('@')[0], email, password: 'test-student-password', ...extra });
    assert.equal(started.status, 202);
    const pending = await started.json();
    const confirmed = await call('verify-otp', { challengeId: pending.challengeId, code: mail.at(-1).code });
    assert.equal(confirmed.status, 201);
    return { cookie: confirmed.headers.get('set-cookie').split(';')[0], user: (await confirmed.json()).user };
  };
  return { mongo, options, call, auth };
}
const record = { name: 'New Student', email: 'new.student@example.test', phone: '405-555-0123', program: 'certified-nurse-aide', status: 'Enrolled', start_date: '2026-11-01', end_date: '2026-12-01', class_schedule: 'Monday–Friday, 9 AM–1 PM', notes: 'Call before orientation.' };

test('admin access requires an OTP session and a server-configured staff email', async t => {
  const { call, auth, mongo } = await setup(t);
  assert.equal((await call('admin-students')).status, 401);
  const student = await auth('student@example.test', { role: 'admin' });
  assert.equal(student.user.role, 'student', 'A registration role field cannot grant access');
  assert.equal((await call('admin-students', null, student.cookie)).status, 403);
  assert.equal((await call('admin-students', record, student.cookie)).status, 403);
  assert.equal((await call('admin-student', { ...record, id: new ObjectId().toString() }, student.cookie)).status, 403);
  const admin = await auth('sayflux04@gmail.com');
  assert.equal(admin.user.role, 'admin');
  const list = await call('admin-students', null, admin.cookie);
  assert.equal(list.status, 200);
  const data = await list.json();
  assert.equal(data.students.length, 1);
  assert.equal(data.students[0].email, 'student@example.test');
  assert.equal(data.students[0].password_hash, undefined);
  assert.equal(data.students[0].salt, undefined);
  assert.equal(data.students[0].user_id, undefined);
  assert.equal((await call('admin-students', record, admin.cookie, 'https://wrong.example')).status, 403);
  assert.equal(mongo.store('students').size, 1);
});

test('staff can save and reopen records; account linking preserves notes and students see only their own class details', async t => {
  const { call, auth, mongo } = await setup(t);
  const admin = await auth('sayflux04@gmail.com');
  const created = await call('admin-students', record, admin.cookie);
  assert.equal(created.status, 201);
  const saved = (await created.json()).student;
  assert.equal(saved.has_account, false);
  const opened = await call(`admin-student?id=${saved.id}`, null, admin.cookie);
  assert.equal((await opened.json()).student.notes, record.notes);
  assert.equal((await call('admin-students', record, admin.cookie)).status, 409);
  assert.equal((await call('admin-student', { ...record, id: saved.id, end_date: '2026-10-01' }, admin.cookie)).status, 400);
  assert.equal((await call('admin-student', { ...record, id: saved.id, email: 'another@example.test' }, admin.cookie)).status, 400);
  const updated = await call('admin-student', { ...record, id: saved.id, status: 'In progress', notes: 'Orientation completed.', role: 'admin', user_id: 'forged' }, admin.cookie);
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).student.status, 'In progress');
  const student = await auth(record.email);
  const own = await call('student-record', null, student.cookie);
  const ownRecord = (await own.json()).student;
  assert.equal(ownRecord.program, record.program);
  assert.equal(ownRecord.status, 'In progress');
  assert.equal(ownRecord.class_schedule, record.class_schedule);
  assert.equal(ownRecord.notes, undefined);
  assert.equal(ownRecord.email, undefined);
  const staffRecord = (await (await call(`admin-student?id=${saved.id}`, null, admin.cookie)).json()).student;
  assert.equal(staffRecord.has_account, true);
  assert.equal(staffRecord.notes, 'Orientation completed.');
  const other = await auth('other@example.test');
  const stolen = await call(`student-record?id=${saved.id}&email=${record.email}`, null, other.cookie);
  assert.equal((await stolen.json()).student.program, '', 'A student cannot select someone else’s record');
  assert.equal((await call(`admin-student?id=${saved.id}`, null, other.cookie)).status, 403);
  const stored = [...mongo.store('students').values()].find(item => item.email === record.email);
  assert.equal(stored.role, undefined); assert.notEqual(stored.user_id, 'forged');
});

test('student search escapes regex characters and pagination preserves access to older records', async t => {
  const { call, auth, mongo } = await setup(t);
  const admin = await auth('sayflux04@gmail.com');
  for (let i = 0; i < 55; i++) {
    const _id = new ObjectId();
    mongo.store('students').set(_id.toString(), { ...record, _id, name: `Student ${i}`, email: `student${i}@example.test` });
  }
  const first = (await (await call('admin-students', null, admin.cookie)).json());
  assert.equal(first.students.length, 50); assert(first.nextCursor);
  const second = (await (await call(`admin-students?cursor=${first.nextCursor}`, null, admin.cookie)).json());
  assert.equal(second.students.length, 5);
  assert.equal(second.nextCursor, null);
  assert.equal(new Set([...first.students, ...second.students].map(item => item.id)).size, 55);
  const search = (await (await call('admin-students?q=Student%2054', null, admin.cookie)).json());
  assert.equal(search.students.length, 1);
  assert.equal((await (await call('admin-students?q=%2E%2A', null, admin.cookie)).json()).students.length, 0);
  assert.equal((await call('admin-students?cursor=invalid', null, admin.cookie)).status, 400);
  assert.equal((await call('admin-students', { ...record, program: 'invented' }, admin.cookie)).status, 400);
  assert.equal((await call('admin-students', { ...record, start_date: '2026-02-30' }, admin.cookie)).status, 400);
});
