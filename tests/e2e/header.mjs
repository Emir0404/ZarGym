// Screenshots of the header at various places on the page (to see how it looks while scrolling).
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright-core');
const url = process.argv[2] ?? 'http://localhost:5313/';
const out = path.resolve(process.argv[3] ?? './slike');
const b = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge' });
for (const [ime, opc, ids] of [['desktop', { viewport: { width: 1440, height: 900 } }, ['izreka', 'programi', 'zasto', 'raspored', 'poziv']], ['iphone', { ...devices['iPhone 13'] }, ['programi', 'prostor', 'poziv']]]) {
  const ctx = await b.newContext(opc); const s = await ctx.newPage();
  await s.goto(url); await s.waitForLoadState('networkidle');
  await s.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
  const h = await s.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 320) { await s.evaluate(y => scrollTo(0, y), y); await s.waitForTimeout(40); }
  await s.waitForTimeout(1500);
  for (const id of ids) {
    await s.evaluate(i => { const e = document.getElementById(i); scrollTo(0, e.getBoundingClientRect().top + scrollY + (i === 'programi' ? 380 : 120)); }, id);
    await s.waitForTimeout(400);
    await s.evaluate(() => scrollBy(0, -50)); await s.waitForTimeout(800);
    await s.screenshot({ path: path.join(out, `${ime}-zaglavlje-${id}.png`), clip: { x: 0, y: 0, width: opc.viewport?.width ?? 390, height: ime === 'desktop' ? 260 : 220 } });
  }
  await ctx.close();
}
await b.close();
