import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';

const base = process.env.SITE_URL || 'http://127.0.0.1:5174';
assert(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Run this mocked UI check against a local development server.');
const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const context = await browser.newContext({ reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = []; page.on('pageerror', error => errors.push(error.message));
let signedIn = false, nextCode = '123456', pending, profile;
await page.route('**/api/**', async route => {
  const request = route.request(), path = new URL(request.url()).pathname;
  const body = request.method() === 'POST' ? request.postDataJSON() : {};
  const reply = (status, json) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(json) });
  if (path === '/api/me') return reply(signedIn ? 200 : 401, signedIn ? { user: profile } : { error: 'Please sign in.' });
  if (path === '/api/student-record') return reply(signedIn ? 200 : 401, signedIn ? { student: null } : { error: 'Please sign in.' });
  if (path === '/api/logout') { signedIn = false; return reply(200, { ok: true }); }
  if (path === '/api/register' || path === '/api/login') {
    if (path.endsWith('login') && body.password !== 'browser-password-123') return reply(401, { error: 'Email or password is incorrect.' });
    pending = { id: 'a'.repeat(64), name: body.name || 'Browser Test Student', email: body.email, created_at: new Date().toISOString(), email_verified: true };
    nextCode = '123456';
    return reply(202, { verificationRequired: true, challengeId: 'b'.repeat(64), expiresIn: 600, resendAfter: 1 });
  }
  if (path === '/api/resend-otp') { nextCode = '654321'; return reply(202, { verificationRequired: true, challengeId: 'b'.repeat(64), expiresIn: 600, resendAfter: 1 }); }
  if (path === '/api/verify-otp') {
    if (body.code !== nextCode) return reply(400, { error: 'This code is invalid or expired. Start again to request a new code.' });
    signedIn = true; profile = pending; return reply(200, { user: profile });
  }
  return reply(404, { error: 'Not found.' });
});
async function layoutChecks() {
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No horizontal overflow at ${width}px`);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    assert.deepEqual(result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) })), []);
  }
}
try {
  await page.goto(base + '/dashboard'); await page.waitForURL('**/login');
  await page.goto(base + '/register'); await layoutChecks();
  await page.getByLabel('Full name', { exact: true }).fill('Browser Test Student');
  await page.getByLabel('Email address').fill('browser@example.test');
  await page.getByLabel('Password', { exact: true }).fill('browser-password-123');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByRole('heading', { name: 'Verify your email', exact: true }).waitFor();
  assert(new URL(page.url()).pathname === '/register', 'OTP step precedes the dashboard');
  await layoutChecks();
  await page.getByLabel('Verification code').fill('000000');
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  await page.getByRole('alert').filter({ hasText: 'invalid or expired' }).waitFor();
  await page.getByRole('button', { name: 'Resend code', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'A new code has been sent' }).waitFor();
  await page.getByLabel('Verification code').fill('654321');
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  await page.waitForURL('**/dashboard');
  await page.getByRole('heading', { name: 'Welcome, Browser Test Student.' }).waitFor();
  await page.reload(); await page.getByRole('heading', { name: 'Welcome, Browser Test Student.' }).waitFor();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click(); await page.waitForURL('**/login');
  await page.getByLabel('Email address').fill('browser@example.test');
  await page.getByLabel('Password', { exact: true }).fill('incorrect-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Email or password is incorrect.' }).waitFor();
  await page.getByLabel('Password', { exact: true }).fill('browser-password-123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('heading', { name: 'Verify your email', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Start again / change email' }).click();
  await page.getByLabel('Email address').waitFor();
  await page.getByLabel('Email address').fill('browser@example.test');
  await page.getByLabel('Password', { exact: true }).fill('browser-password-123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', { name: 'Verify and continue' }).click(); await page.waitForURL('**/dashboard');
  assert.deepEqual(errors, []);
  console.log('Passed OTP registration/login UI, invalid code, resend, start over, dashboard refresh, logout, mobile layout, and accessibility. API responses were mocked; no emails or database records were created.');
} finally { await browser.close(); }
