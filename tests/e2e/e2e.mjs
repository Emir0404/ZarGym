// End-to-end check of the Žar page in real Edge (Playwright): layout, menu, schedule, animations, working without the script.
// Usage: node e2e.mjs <address> <folder for screenshots>
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright-core');

const url = process.argv[2] ?? 'http://localhost:5311/';
const slike = path.resolve(process.argv[3] ?? './slike');
fs.mkdirSync(slike, { recursive: true });

let ok = 0, lose = 0;
const t = (naziv, uslov) => { if (uslov) ok++; else { lose++; console.log('GRESKA:', naziv); } };
const bezGlatkog = 'html{scroll-behavior:auto!important}';
const prosetaj = async s => {
  const h = await s.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 320) { await s.evaluate(y => scrollTo(0, y), y); await s.waitForTimeout(55); }
};
const SEKCIJE = ['pocetak', 'brojke', 'izreka', 'programi', 'zasto', 'prostor', 'raspored', 'clanarine', 'treneri', 'utisci', 'poziv', 'kontakt'];

const uredjaji = [
  ['iphone', { ...devices['iPhone 13'] }],
  ['mali-android', { viewport: { width: 360, height: 700 }, isMobile: true, hasTouch: true }],
  ['tablet', { viewport: { width: 820, height: 1100 } }],
  ['desktop', { viewport: { width: 1440, height: 900 } }],
  ['siroki', { viewport: { width: 1920, height: 1080 } }],
];

const b = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge' });

for (const [ime, opc] of uredjaji) {
  const mobilni = (opc.viewport?.width ?? 390) <= 860;
  const ctx = await b.newContext(opc);
  const s = await ctx.newPage();
  const greske = [];
  s.on('pageerror', e => greske.push('JS: ' + e.message));
  s.on('console', m => { if (m.type() === 'error') greske.push('konzola: ' + m.text()); });
  s.on('requestfailed', r => greske.push('zahtjev: ' + r.url()));
  await s.goto(url); await s.waitForLoadState('networkidle');
  await s.addStyleTag({ content: bezGlatkog });

  t(`${ime}: nema grešaka (${greske.join(' | ')})`, greske.length === 0);
  const sir = await s.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth, Math.round(visualViewport.scale * 100) / 100]);
  t(`${ime}: nema horizontalnog skrola, stranica nije šira od ekrana (scrollWidth, clientWidth, zoom = ${sir})`, sir[0] <= sir[1] && sir[2] === 1);
  t(`${ime}: sve sekcije postoje`, (await s.evaluate(ids => ids.filter(i => !document.getElementById(i)), SEKCIJE)).length === 0);
  t(`${ime}: font Anton učitan i ima Č Ž Š Đ Ć`, await s.evaluate(async () => { await document.fonts.ready; return ['Č', 'Ž', 'Š', 'Đ', 'Ć'].every(c => document.fonts.check('40px Anton', c)); }));
  t(`${ime}: font Inter učitan`, await s.evaluate(() => document.fonts.check('16px Inter', 'č')));
  t(`${ime}: tamna pozadina`, await s.evaluate(() => getComputedStyle(document.body).backgroundColor) === 'rgb(9, 7, 6)');
  t(`${ime}: naslov "Žar počinje u tebi."`, (await s.locator('h1').innerText()).replace(/\s+/g, ' ').toLowerCase().includes('žar počinje u tebi'));
  t(`${ime}: sve kvačice (href=#) vode na postojeći odjeljak`, await s.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].every(a => a.getAttribute('href') === '#' || document.querySelector(a.getAttribute('href')))));
  t(`${ime}: tel link postoji`, await s.locator('a[href^="tel:"]').count() >= 2);

  // Gap between the label above the heading and the carons on Ž/Č (so they do not collide)
  const razmak = await s.evaluate(() => {
    const o = document.querySelector('.hero-nadnaslov').getBoundingClientRect(), h = document.querySelector('.hero-naslov .kontura').getBoundingClientRect();
    return Math.round(h.top - o.bottom);
  });
  t(`${ime}: oznaka ne dodiruje naslov (razmak ${razmak}px)`, razmak >= 20);

  // Reveal on scroll
  const skrivenih = await s.locator('.rv:not(.vidljivo)').count();
  t(`${ime}: dijelovi ispod ekrana čekaju otkrivanje (${skrivenih})`, skrivenih > 10);
  await prosetaj(s); await s.waitForTimeout(2200);
  t(`${ime}: nakon skrolanja sve je otkriveno`, await s.locator('.rv:not(.vidljivo)').count() === 0);

  // Numbers reach their final value
  const brojke = await s.locator('.brojka strong').allInnerTexts();
  t(`${ime}: brojke završavaju na pravim vrijednostima (${brojke})`, brojke[0] === '1.200 m²' && brojke[1] === '60+' && brojke[2] === '22' && brojke[3] === '4');

  // Words that light up
  await s.evaluate(() => { const e = document.querySelector('.izreka-tekst'); scrollTo(0, e.getBoundingClientRect().top + scrollY - innerHeight * 0.2); });
  await s.waitForTimeout(700);
  const upaljene = await s.evaluate(() => [document.querySelectorAll('.rijec.upaljena').length, document.querySelectorAll('.rijec').length]);
  t(`${ime}: sve riječi izreke se upale (${upaljene})`, upaljene[1] >= 10 && upaljene[0] === upaljene[1]);

  // Pictures
  await s.evaluate(() => document.querySelectorAll('img').forEach(i => { i.loading = 'eager'; }));
  await prosetaj(s); await s.waitForTimeout(800);
  const slikeStanje = await s.evaluate(() => [...document.images].map(i => [i.getAttribute('src'), i.complete && i.naturalWidth > 0]));
  t(`${ime}: sve fotografije učitane (${slikeStanje.filter(x => !x[1]).map(x => x[0])})`, slikeStanje.length >= 8 && slikeStanje.every(x => x[1]));

  // Schedule by day
  await s.evaluate(() => scrollTo(0, 0));
  const danas = await s.evaluate(() => new Date().getDay());
  t(`${ime}: izabran je današnji dan u rasporedu`, await s.getAttribute(`.tab[data-dan="${danas}"]`, 'aria-selected') === 'true');
  t(`${ime}: tačno jedan panel je vidljiv`, await s.locator('.panel:visible').count() === 1);
  await s.locator('.tab[data-dan="1"]').click();
  t(`${ime}: ponedjeljak prikazuje 4 termina`, await s.locator('.panel:visible .termin').count() === 4);
  t(`${ime}: ponedjeljak počinje u 07:00`, (await s.locator('.panel:visible .termin-vrijeme').first().innerText()) === '07:00');
  await s.locator('.tab[data-dan="1"]').focus(); await s.keyboard.press('ArrowRight');
  t(`${ime}: strelica desno prelazi na utorak`, await s.getAttribute('.tab[data-dan="2"]', 'aria-selected') === 'true' && await s.locator('.panel:visible .termin').count() === 3);
  t(`${ime}: nedjelja ima 2 termina`, (await s.locator('.tab[data-dan="0"]').click(), await s.locator('.panel:visible .termin').count()) === 2);

  // Sparks
  if (ime === 'desktop') {
    await s.evaluate(() => scrollTo(0, 0)); await s.waitForTimeout(1400);
    const piksela = await s.evaluate(() => { const c = document.querySelector('.iskre'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 10) n++; return n; });
    t(`${ime}: iskre se crtaju na platnu (${piksela} piksela)`, piksela > 300);
  }

  // Menu (the header is visible only at the top or when scrolling up, like for a real user)
  await s.evaluate(() => scrollTo(0, 0)); await s.waitForTimeout(700);
  if (mobilni) {
    await s.evaluate(() => scrollTo(0, 0)); await s.waitForTimeout(500);
    t(`${ime}: burger vidljiv, glavni meni skriven`, await s.locator('#burger').isVisible() && !(await s.locator('.glavni-meni').isVisible()));
    t(`${ime}: plutajuće dugme skriveno na vrhu`, !(await s.locator('.plutajuce-zovi').evaluate(e => e.classList.contains('vidljivo'))));
    await s.click('#burger'); await s.waitForTimeout(500); // the menu appears over 0.35 s
    t(`${ime}: meni preko ekrana se otvara`, await s.locator('#mobilni-meni').isVisible() && await s.getAttribute('#burger', 'aria-expanded') === 'true');
    await s.click('#mobilni-meni a[href="#raspored"]'); await s.waitForTimeout(500);
    t(`${ime}: klik na Raspored zatvara meni`, !(await s.evaluate(() => document.documentElement.classList.contains('meni'))));
    const gore = await s.evaluate(() => Math.round(document.getElementById('raspored').getBoundingClientRect().top));
    t(`${ime}: skroluje do rasporeda (top=${gore})`, gore > -200 && gore < 200);
    await s.evaluate(() => scrollBy(0, -60)); await s.waitForTimeout(700);
    await s.click('#burger'); await s.keyboard.press('Escape');
    t(`${ime}: Escape zatvara meni`, !(await s.evaluate(() => document.documentElement.classList.contains('meni'))));
    t(`${ime}: plutajuće dugme se pojavi nakon skrolanja`, await s.locator('.plutajuce-zovi').evaluate(e => e.classList.contains('vidljivo')));
  } else {
    t(`${ime}: glavni meni vidljiv, burger skriven`, await s.locator('.glavni-meni').isVisible() && !(await s.locator('#burger').isVisible()));
    await s.click('.glavni-meni a[href="#clanarine"]'); await s.waitForTimeout(500);
    t(`${ime}: meni vodi do članarina`, await s.evaluate(() => Math.abs(document.getElementById('clanarine').getBoundingClientRect().top) < 260));
    t(`${ime}: istaknut je aktivan odjeljak u meniju`, await s.locator('.glavni-meni a.aktivan').count() === 1);
  }
  t(`${ime}: zaglavlje dobije pozadinu pri skrolanju`, await s.evaluate(() => document.getElementById('zaglavlje').classList.contains('skrolano')));

  // Smart header: pill, hides when scrolling down, returns when scrolling up, fiery progress line
  await s.evaluate(() => scrollTo(0, 0)); await s.waitForTimeout(700);
  const naVrhu = await s.evaluate(() => { const z = document.getElementById('zaglavlje'), r = z.querySelector('.zaglavlje-red'); return [z.classList.contains('skrolano'), z.classList.contains('sakriveno'), getComputedStyle(r).borderRadius, getComputedStyle(r).backgroundColor, +getComputedStyle(z).getPropertyValue('--napredak') || 0]; });
  t(`${ime}: na vrhu je zaglavlje prozirno i bez pilule (${naVrhu})`, !naVrhu[0] && !naVrhu[1] && parseFloat(naVrhu[2]) === 0 && naVrhu[3] === 'rgba(0, 0, 0, 0)' && naVrhu[4] === 0);
  await s.evaluate(() => scrollTo(0, 1500)); await s.waitForTimeout(900);
  const dolje = await s.evaluate(() => { const z = document.getElementById('zaglavlje'); return [z.classList.contains('sakriveno'), Math.round(z.getBoundingClientRect().bottom)]; });
  t(`${ime}: pri skrolanju prema dolje zaglavlje se sakrije (${dolje})`, dolje[0] && dolje[1] <= 0);
  await s.evaluate(() => scrollBy(0, -150)); await s.waitForTimeout(900);
  const gore = await s.evaluate(() => { const z = document.getElementById('zaglavlje'), r = z.querySelector('.zaglavlje-red'); const b = z.getBoundingClientRect(); return [z.classList.contains('sakriveno'), Math.round(b.top), parseFloat(getComputedStyle(r).borderRadius), Math.round(r.getBoundingClientRect().width), innerWidth, getComputedStyle(r, '::after').opacity]; });
  t(`${ime}: pri skrolanju prema gore se vrati kao zaobljena pilula uža od ekrana (${gore})`, !gore[0] && gore[1] >= 0 && gore[2] >= 20 && gore[3] < gore[4] && gore[5] === '1');
  const prog = await s.evaluate(() => { scrollTo(0, 0); return null; });
  await s.evaluate(() => scrollTo(0, document.body.scrollHeight)); await s.waitForTimeout(500);
  await s.evaluate(() => scrollBy(0, -40)); await s.waitForTimeout(700);
  const kraj = await s.evaluate(() => +getComputedStyle(document.getElementById('zaglavlje')).getPropertyValue('--napredak'));
  t(`${ime}: linija napretka je na kraju stranice skoro puna (${kraj})`, kraj > 0.9 && kraj <= 1);
  await s.evaluate(() => scrollTo(0, 2200)); await s.waitForTimeout(500);
  await s.evaluate(() => scrollBy(0, -100)); await s.waitForTimeout(600);
  const sredina = await s.evaluate(() => +getComputedStyle(document.getElementById('zaglavlje')).getPropertyValue('--napredak'));
  t(`${ime}: linija napretka je u sredini stranice srednja (${sredina})`, sredina > 0.1 && sredina < 0.9);

  // "Back to top" and the logo
  await s.evaluate(() => scrollTo(0, document.body.scrollHeight)); await s.waitForTimeout(300);
  await s.click('.gore'); await s.waitForTimeout(500);
  t(`${ime}: "Na vrh" vraća na početak`, await s.evaluate(() => scrollY) < 5);
  await s.evaluate(() => scrollTo(0, 3000)); await s.waitForTimeout(300);
  await s.evaluate(() => scrollBy(0, -60)); await s.waitForTimeout(600); // a real user scrolls up and so sees the header
  await s.click('.zaglavlje .logo'); await s.waitForTimeout(500);
  t(`${ime}: logo vraća na početak`, await s.evaluate(() => scrollY) < 5);

  // Text on the page: Bosnian and no bookings
  const tekst = (await s.evaluate(() => document.body.innerText)).toLowerCase();
  const tudje = ['tjed', 'točn', 'sustav', 'kruh', 'pećnic', 'tisuć', 'rezerv'].filter(r => new RegExp('(^|[^\\p{L}])' + r, 'u').test(tekst));
  t(`${ime}: nema riječi koje nisu bosanske (${tudje})`, tudje.length === 0);
  t(`${ime}: nema obrasca`, await s.locator('form').count() === 0);
  t(`${ime}: stranica je iz Sarajeva`, tekst.includes('sarajevo') && tekst.includes('demo stranica'));
  t(`${ime}: navedeni autori fotografija`, tekst.includes('pexels') && tekst.includes('cottonbro'));

  // Screenshots
  await s.evaluate(() => scrollTo(0, 0)); await s.waitForTimeout(600);
  await s.screenshot({ path: path.join(slike, `${ime}-hero.png`) });
  await s.screenshot({ path: path.join(slike, `${ime}-puna.png`), fullPage: true });
  await ctx.close();
}

// 404 page
{
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const s = await ctx.newPage();
  const r = await s.goto(new URL('/nema-ove-stranice', url).toString());
  t('404: status 404', r.status() === 404);
  t('404: naša stranica s dugmetom', (await s.locator('h1').innerText()).toLowerCase().includes('ovdje nema') && await s.locator('a.dugme[href="/"]').count() === 1);
  await s.screenshot({ path: path.join(slike, '404.png') });
  await ctx.close();
}

// Without JavaScript: all content is visible (the schedule for all seven days, nothing hidden)
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, javaScriptEnabled: false });
  const s = await ctx.newPage();
  await s.goto(url);
  t('bez JS: svih 7 dana rasporeda je vidljivo', await s.locator('.panel:visible').count() === 7);
  t('bez JS: nijedan dio nije sakriven (opacity)', await s.evaluate(() => [...document.querySelectorAll('.rv')].every(e => getComputedStyle(e).opacity === '1')));
  t('bez JS: brojke imaju završne vrijednosti', (await s.locator('.brojka strong').first().innerText()) === '1.200 m²');
  t('bez JS: izreka je cijela vidljiva', (await s.locator('.izreka-tekst').innerText()).toLowerCase().includes('snaga se ne dobije'));
  await ctx.close();
}

// Reduced motion: no sparks or animations, numbers finished at once
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const s = await ctx.newPage();
  await s.goto(url); await s.waitForLoadState('networkidle'); await s.waitForTimeout(1200);
  const piksela = await s.evaluate(() => { const c = document.querySelector('.iskre'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 10) n++; return n; });
  t(`manje pokreta: iskre se ne crtaju (${piksela})`, piksela === 0);
  t('manje pokreta: tačka "otvoreno" ne pulsira', await s.evaluate(() => document.getAnimations().filter(a => a.effect?.target?.closest?.('.hero-otvoreno')).every(a => a.effect.getTiming().duration <= 1)));
  await prosetaj(s); await s.waitForTimeout(500);
  t('manje pokreta: brojke odmah gotove', (await s.locator('.brojka strong').first().innerText()) === '1.200 m²');
  t('manje pokreta: sve riječi izreke upaljene', await s.evaluate(() => document.querySelectorAll('.rijec.upaljena').length === document.querySelectorAll('.rijec').length));
  await ctx.close();
}

// Screenshots of the phone menu
{
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const s = await ctx.newPage();
  await s.goto(url); await s.waitForLoadState('networkidle');
  await s.click('#burger'); await s.waitForTimeout(700);
  await s.screenshot({ path: path.join(slike, 'iphone-meni.png') });
  await ctx.close();
}

await b.close();
console.log(`Prošlo: ${ok}, palo: ${lose}`);
process.exit(lose ? 1 : 0);
