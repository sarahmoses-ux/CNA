import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { academyNews, resourceGroups } from '../src/data.js';
const base = process.env.SITE_URL || 'http://127.0.0.1:5174';
const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const context = await browser.newContext({ reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const routes = ['/', '/programs', '/about', '/admissions', '/contact', '/resources', '/register', '/login', '/programs/certified-nurse-aide', '/programs/cna-hha-deeming', '/programs/home-health-aide-deeming', '/programs/certified-medication-aide', '/programs/acma-diabetes-insulin', '/programs/acma-enteral-respiratory', '/missing-page', '/programs/missing-program'];
fs.mkdirSync('.reference/screenshots', { recursive: true });
routes.push(...new Set(['/academy/blog', ...resourceGroups.flatMap(group => group.links.map(([, href]) => href)), ...academyNews.map(([, href]) => href)].filter(href => href.startsWith('/academy/'))));
try {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(base + route, { waitUntil: 'domcontentloaded' });
      await page.locator('h1').waitFor();
      await page.evaluate(async () => {
        await document.fonts.ready;
        const images = [...document.images];
        images.forEach(image => { image.loading = 'eager'; });
        await Promise.all(images.map(image => image.decode().catch(() => {})));
      });
      assert.equal(await page.locator('h1').count(), 1, `One heading: ${route}`);
      assert.equal(await page.locator('a[href]').evaluateAll(links => links.filter(link => /^https?:\/\/(www\.)?cnatrainingacademy\.net(?:\/|$)/i.test(link.href)).length), 0, `No old website links: ${route}`);
      assert(await page.title().then(title => title.includes('CNA Training Academy')), `Page title: ${route}`);
      assert(await page.locator('meta[name="description"]').getAttribute('content'), `Description: ${route}`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Horizontal overflow: ${route} at ${width}`);
      assert.deepEqual(await page.evaluate(() => [...document.images].filter(image => !image.complete || !image.naturalWidth).map(image => image.src)), [], `Images: ${route}`);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      assert.deepEqual(results.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), [], `Accessibility: ${route} at ${width}`);
    }
    await page.goto(base);
    await page.screenshot({ path: `.reference/screenshots/home-${width}.png`, fullPage: true });
    console.log(`Passed ${routes.length} routes at ${width}px`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Programs', exact: true }).click();
  await page.getByRole('heading', { level: 1, name: 'Find your next step in care.' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Open navigation' }).getAttribute('aria-expanded'), 'false');
  assert.equal(await page.locator('.program-card').count(), 6);
  for (const category of ['Start your career', 'Advance your skills', 'Specialized training']) {
    await page.getByRole('button', { name: category, exact: true }).click();
    assert.equal(await page.locator('.program-card').count(), 2);
  }
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('button', { name: 'Open navigation' }).getAttribute('aria-expanded'), 'false');
  await page.goto(base);
  assert.equal(await page.locator('.program-card').count(), 6, 'All six programs on homepage');
  assert.equal(await page.locator('.news-grid article').count(), 4, 'All four academy news articles');
  assert.equal(await page.locator('.experiences-grid article').count(), 3, 'Academy-specific published student experiences');
  await page.locator('summary').first().click();
  assert.equal(await page.locator('details[open]').count(), 1);
  assert.equal(await page.locator('header a').filter({ hasText: 'Student Login' }).getAttribute('href'), '/login');
  await page.goto(base + '/contact');
  assert.equal(await page.locator('main a[href="tel:+14057406594"]').count(), 1);
  assert.equal(await page.locator('main .contact-method a[href="mailto:info@cnatrainingacademy.net"]').count(), 1);
  assert.equal(await page.locator('main a[href="mailto:cnatrainingacademy1@gmail.com"]').count(), 1);
  assert(await page.locator('main').innerText().then(text => text.includes('(405) 506-0373')), 'Contact fax');
  assert.deepEqual(await page.locator('.class-schedule dd').allTextContents(), ['7:00 AM-8:00 PM', '4:00 PM-10:00 PM', '8:00 AM-4:00 PM']);
  assert.equal(await page.getByRole('link', { name: 'Email admissions' }).getAttribute('href'), 'mailto:info@cnatrainingacademy.net');
  assert.equal(await page.locator('main a[href="https://www.facebook.com/CNAtrainingacademy"]').count(), 1);
  assert.equal(await page.locator('main a[href="https://www.instagram.com/cnatrainingacademy1/"]').count(), 1);
  await page.goto(base + '/resources');
  for (const [label, href] of [
    ['Make a payment', '/academy/make-a-payment'],
    ['Financial assistance', '/academy/financial-assistance'],
    ['Student handbook', '/academy/student-handbook'],
    ['Approvals & licensing', '/academy/approvals-licensing'],
  ]) assert.equal(await page.locator('main').getByRole('link', { name: label, exact: true }).getAttribute('href'), href);
  assert.deepEqual(errors, []);
  console.log('Passed mobile navigation, Escape, program filtering, FAQs, contact links, and runtime checks.');
} finally { await browser.close(); }

