// Screenshot of the programs grid (the whole element) to see how the cards are laid out.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright-core');
const url = process.argv[2] ?? 'http://localhost:5311/';
const out = path.resolve(process.argv[3] ?? './slike');
const b = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge' });
for (const [ime, opc] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['tablet', { viewport: { width: 820, height: 1100 } }], ['iphone', { ...devices['iPhone 13'] }]]) {
  const ctx = await b.newContext(opc); const s = await ctx.newPage();
  await s.goto(url); await s.waitForLoadState('networkidle');
  await s.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
  const h = await s.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 300) { await s.evaluate(y => scrollTo(0, y), y); await s.waitForTimeout(50); }
  await s.waitForTimeout(1800);
  await s.locator('.programi-mreza').screenshot({ path: path.join(out, `${ime}-programi-mreza.png`) });
  await ctx.close();
}
await b.close();
