// Quick look at the design: page screenshots (after everything is revealed by scrolling) on desktop and phone.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright-core');
const url = process.argv[2] ?? 'http://localhost:5311/';
const out = path.resolve(process.argv[3] ?? './slike');
const b = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge' });
for (const [ime, opc] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['iphone', { ...devices['iPhone 13'] }]]) {
  const ctx = await b.newContext(opc); const s = await ctx.newPage();
  await s.goto(url); await s.waitForLoadState('networkidle');
  await s.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
  await s.waitForTimeout(900);
  await s.screenshot({ path: path.join(out, `${ime}-hero.png`) });
  const h = await s.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 300) { await s.evaluate(y => scrollTo(0, y), y); await s.waitForTimeout(60); }
  await s.waitForTimeout(2200);
  await s.evaluate(() => scrollTo(0, 0)); await s.waitForTimeout(500);
  await s.screenshot({ path: path.join(out, `${ime}-puna.png`), fullPage: true });
  await ctx.close();
}
await b.close();
