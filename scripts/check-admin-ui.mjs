import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';

const base = process.env.SITE_URL || 'http://127.0.0.1:5181';
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Use a local development server for mocked browser checks.');
const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const context = await browser.newContext({ reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = []; page.on('pageerror', error => errors.push(error.message));
let role = null, calls = 0;
const records = [];
await page.route('**/api/**', async route => {
  const request = route.request(), url = new URL(request.url());
  const reply = (status, value) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
  if (url.pathname === '/api/me') return reply(role ? 200 : 401, role ? { user: { name: 'Staff Test', email: 'sayflux04@gmail.com', role } } : { error: 'Please sign in.' });
  if (url.pathname === '/api/logout') { role = null; return reply(200, { ok: true }); }
  if (url.pathname.startsWith('/api/admin-')) calls++;
  if (role !== 'admin') return reply(403, { error: 'Administrator access is required.' });
  if (request.method() === 'POST') {
    const data = request.postDataJSON();
    const record = { ...data, id: data.id || 'a'.repeat(24), has_account: false };
    const index = records.findIndex(item => item.id === record.id);
    if (index >= 0) records[index] = record; else records.push(record);
    return reply(index >= 0 ? 200 : 201, { student: record });
  }
  if (url.pathname === '/api/admin-student') return reply(200, { student: records.find(record => record.id === url.searchParams.get('id')) });
  const search = (url.searchParams.get('q') || '').toLowerCase();
  return reply(200, { students: records.filter(record => `${record.name} ${record.email}`.toLowerCase().includes(search)), nextCursor: null });
});
async function layout() {
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No overflow at ${width}px`);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    assert.deepEqual(result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })), []);
  }
}
try {
  await page.goto(base + '/admin'); await page.waitForURL('**/login');
  role = 'student'; await page.goto(base + '/admin');
  await page.getByRole('heading', { name: 'Administrator access required' }).waitFor();
  assert.equal(calls, 0, 'Student UI does not fetch the directory');
  role = 'admin'; await page.reload();
  await page.getByRole('button', { name: 'Add student' }).waitFor();
  await page.getByRole('button', { name: 'Add student' }).click();
  await page.getByLabel('Full name').fill('Browser Student');
  await page.getByLabel('Email address').fill('browser.student@example.test');
  await page.getByLabel('Phone number').fill('405-555-0123');
  await page.getByLabel('Program', { exact: true }).selectOption('certified-nurse-aide');
  await page.getByLabel('Enrollment status').selectOption('Enrolled');
  await page.getByLabel('Class start date').fill('2026-11-01');
  await page.getByLabel('Class end date').fill('2026-12-01');
  await page.getByLabel('Class schedule').fill('Monday–Friday, 9 AM–1 PM');
  await page.getByLabel('Staff notes').fill('Contact before orientation.');
  await layout();
  await page.getByRole('button', { name: 'Save student' }).click();
  await page.getByRole('status').filter({ hasText: 'Student record saved.' }).waitFor();
  await page.reload();
  await page.getByRole('button', { name: /Browser Student.*browser.student@example.test/ }).click();
  assert.equal(await page.getByLabel('Staff notes').inputValue(), 'Contact before orientation.');
  assert.equal(await page.getByLabel('Email address').getAttribute('readonly'), '');
  await page.getByLabel('Staff notes').fill('Orientation completed.');
  await page.getByRole('button', { name: 'Save student' }).click();
  await page.getByRole('status').filter({ hasText: 'Student record saved.' }).waitFor();
  assert.equal(records[0].notes, 'Orientation completed.');
  await page.getByLabel('Find a student').fill('missing-student');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByText('No student records found.').waitFor();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click(); await page.waitForURL('**/login');
  await page.goto(base + '/admin'); await page.waitForURL('**/login');
  assert.deepEqual(errors, []);
  console.log('Passed admin access guard, create/edit/reopen/search, logout, mobile layout, and accessibility. API responses were mocked; no student records were written to MongoDB.');
} finally { await browser.close(); }
