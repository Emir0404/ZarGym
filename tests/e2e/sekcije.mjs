// Screenshots of individual sections (viewport) so the design can be checked up close.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright-core');
const url = process.argv[2] ?? 'http://localhost:5311/';
const out = path.resolve(process.argv[3] ?? './slike');
const ids = (process.argv[4] ?? 'brojke,izreka,programi,zasto,prostor,raspored,clanarine,treneri,utisci,poziv,kontakt').split(',');
const uredjaji = (process.argv[5] ?? 'desktop').split(',');
const b = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge' });
for (const ime of uredjaji) {
  const opc = ime === 'iphone' ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } };
  const ctx = await b.newContext(opc); const s = await ctx.newPage();
  await s.goto(url); await s.waitForLoadState('networkidle');
  await s.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
  for (const id of ids) {
    await s.evaluate(i => { const e = document.getElementById(i); scrollTo(0, e.getBoundingClientRect().top + scrollY - 70); }, id);
    await s.waitForTimeout(1500);
    await s.screenshot({ path: path.join(out, `${ime}-s-${id}.png`) });
  }
  await ctx.close();
}
await b.close();
