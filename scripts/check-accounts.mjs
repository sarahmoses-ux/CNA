import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const context = await browser.newContext({ reducedMotion: 'reduce' }); const page = await context.newPage();
const errors = []; page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto('http://127.0.0.1:5180/dashboard');
  await page.waitForURL('**/login');
  await page.goto('http://127.0.0.1:5180/register');
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations.map(x => ({ id: x.id, nodes: x.nodes.map(n => ({target:n.target,summary:n.failureSummary})) })), []);
  }
  await page.getByLabel('Full name', { exact: true }).fill('Browser Test Student');
  const email = `browser-${Date.now()}@example.test`;
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('browser-password-123');
  await page.getByRole('button', {name: 'Create account', exact:true}).click();
  await page.waitForURL('**/dashboard');
  await page.getByRole('heading', {name:'Welcome, Browser Test Student.'}).waitFor();
  assert(await page.locator('main').innerText().then(x=>x.includes(email)));
  await page.reload(); await page.getByRole('heading', {name:'Welcome, Browser Test Student.'}).waitFor();
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations.map(x => ({ id: x.id, nodes: x.nodes.map(n => ({target:n.target,summary:n.failureSummary})) })), []);
  }
  await page.getByRole('button', {name:'Sign out', exact:true}).click(); await page.waitForURL('**/login');
  await page.goto('http://127.0.0.1:5180/dashboard'); await page.waitForURL('**/login');
  await page.getByLabel('Email address').fill(email); await page.getByLabel('Password', { exact: true }).fill('incorrect-password');
  await page.getByRole('button', {name:'Sign in', exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Email or password is incorrect.'}).waitFor();
  await page.getByLabel('Password', {exact:true}).fill('browser-password-123');
  await page.getByRole('button', {name:'Sign in', exact:true}).click(); await page.waitForURL('**/dashboard');
  assert.deepEqual(errors, []);
  console.log('Passed registration, dashboard refresh, logout protection, login, mobile layout, accessibility, and runtime checks. Test accounts used a temporary database.');
} finally { await browser.close(); }




