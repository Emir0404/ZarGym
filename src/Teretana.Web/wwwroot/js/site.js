// Žar: a small script for what HTML and CSS cannot do (menu, sparks, counting, schedule cards).
// The content comes from the server (C#), so the page works without the script too; this only "brings it to life".
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var html = document.documentElement;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  // ---------- Header, floating button, active section ----------
  var zaglavlje = $('#zaglavlje');
  var zovi = $('.plutajuce-zovi');
  var linkovi = $$('.glavni-meni a');
  var odjeljci = linkovi.map(function (a) { return $(a.getAttribute('href')); });
  var cekaSkrol = false;
  var zadnjiY = window.scrollY;

  function pratiSkrol() {
    cekaSkrol = false;
    var y = window.scrollY;
    if (zaglavlje) {
      zaglavlje.classList.toggle('skrolano', y > 40);
      // Smart header: hides when you scroll down, returns when you scroll up (and always at the top)
      var pomak = y - zadnjiY;
      if (!html.classList.contains('meni')) {
        if (pomak > 8 && y > 420) zaglavlje.classList.add('sakriveno');
        else if (pomak < -8 || y <= 420) zaglavlje.classList.remove('sakriveno');
      }
      if (Math.abs(pomak) > 8) zadnjiY = y;
      var ukupno = document.documentElement.scrollHeight - window.innerHeight;
      zaglavlje.style.setProperty('--napredak', ukupno > 0 ? Math.max(0, Math.min(1, y / ukupno)).toFixed(4) : '0');
    }
    if (zovi) zovi.classList.toggle('vidljivo', y > 560);
    var granica = window.innerHeight * 0.36, aktivan = -1;
    odjeljci.forEach(function (el, i) { if (el && el.getBoundingClientRect().top <= granica) aktivan = i; });
    linkovi.forEach(function (a, i) { a.classList.toggle('aktivan', i === aktivan); });
    otkrijVidljive();
    upaliRijeci();
  }
  function zakaziSkrol() {
    if (cekaSkrol) return;
    cekaSkrol = true;
    requestAnimationFrame(pratiSkrol);
  }

  // ---------- Full-screen menu ----------
  var burger = $('#burger');
  var meni = $('#mobilni-meni');
  function postaviMeni(otvoren) {
    html.classList.toggle('meni', otvoren);
    if (burger) {
      burger.setAttribute('aria-expanded', otvoren ? 'true' : 'false');
      burger.setAttribute('aria-label', otvoren ? 'Zatvorite meni' : 'Otvorite meni');
    }
    if (meni) meni.setAttribute('aria-hidden', otvoren ? 'false' : 'true');
  }
  if (burger) burger.addEventListener('click', function () { postaviMeni(!html.classList.contains('meni')); });
  if (meni) meni.addEventListener('click', function (e) { if (e.target.closest('a')) postaviMeni(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') postaviMeni(false); });
  window.addEventListener('resize', function () { if (window.innerWidth > 860) postaviMeni(false); zakaziSkrol(); });

  // ---------- Reveal on scroll (by position, not IntersectionObserver: it does not skip elements on fast scrolling) ----------
  var rv = $$('.rv');
  var cekaju = rv.slice();
  function otkrijVidljive() {
    if (!cekaju.length) return;
    var granica = window.innerHeight * 0.92;
    cekaju = cekaju.filter(function (el) {
      if (el.getBoundingClientRect().top >= granica) return true;
      el.classList.add('vidljivo');
      var brojka = $('[data-broj]', el);
      if (brojka) brojanje(brojka);
      return false;
    });
  }
  rv.forEach(function (el, i) {
    var roditelj = el.parentElement, indeks = roditelj ? Array.prototype.indexOf.call(roditelj.children, el) : i;
    el.style.transitionDelay = Math.min(indeks, 6) * 90 + 'ms';
    // When the reveal is done we restore the normal transition (so cards lifting on hover have no delay).
    el.addEventListener('transitionend', function (e) {
      if (e.target === el && e.propertyName === 'opacity') el.style.transitionDelay = '';
    });
  });

  // ---------- Counting up to the final number ----------
  function format(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function brojanje(el) {
    if (el.dataset.gotovo) return;
    el.dataset.gotovo = '1';
    var cilj = parseInt(el.dataset.broj, 10), sufiks = el.dataset.sufiks || '';
    if (reduce || !isFinite(cilj)) { el.textContent = format(cilj) + sufiks; return; }
    var pocetak = null, trajanje = 1700;
    function korak(t) {
      if (pocetak === null) pocetak = t;
      var p = Math.min((t - pocetak) / trajanje, 1);
      var e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = format(Math.round(cilj * e)) + sufiks;
      if (p < 1) requestAnimationFrame(korak);
    }
    el.textContent = '0' + sufiks;
    requestAnimationFrame(korak);
  }

  // ---------- Words that light up as you scroll ----------
  var izreka = $('[data-rijeci]');
  var rijeci = [];
  if (izreka) {
    var tekst = izreka.textContent.trim().split(/\s+/);
    izreka.setAttribute('aria-label', izreka.textContent.trim());
    izreka.textContent = '';
    tekst.forEach(function (r, i) {
      var s = document.createElement('span');
      s.className = 'rijec' + (i >= tekst.length - 3 ? ' zadnja' : '');
      s.setAttribute('aria-hidden', 'true');
      s.textContent = r;
      izreka.appendChild(s);
      if (i < tekst.length - 1) izreka.appendChild(document.createTextNode(' '));
      rijeci.push(s);
    });
  }
  function upaliRijeci() {
    if (!izreka) return;
    if (reduce) { rijeci.forEach(function (s) { s.classList.add('upaljena'); }); return; }
    var r = izreka.getBoundingClientRect(), vh = window.innerHeight;
    var p = Math.max(0, Math.min(1, (vh * 0.88 - r.top) / (vh * 0.38 + r.height * 0.9)));
    var upaljeno = Math.round(p * rijeci.length);
    rijeci.forEach(function (s, i) { s.classList.toggle('upaljena', i < upaljeno); });
  }

  // ---------- Schedule cards by day ----------
  var tabovi = $$('.tab');
  var paneli = $$('.panel');
  function izaberiDan(dan, fokus) {
    tabovi.forEach(function (t) {
      var on = t.dataset.dan === String(dan);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on && fokus) t.focus();
    });
    paneli.forEach(function (p) { p.hidden = p.dataset.dan !== String(dan); });
  }
  if (tabovi.length) {
    var danas = new Date().getDay();
    tabovi.forEach(function (t) {
      if (t.dataset.dan === String(danas)) t.classList.add('danas');
      t.addEventListener('click', function () { izaberiDan(t.dataset.dan); });
      t.addEventListener('keydown', function (e) {
        var i = tabovi.indexOf(t), n = tabovi.length, sljedeci = null;
        if (e.key === 'ArrowRight') sljedeci = tabovi[(i + 1) % n];
        if (e.key === 'ArrowLeft') sljedeci = tabovi[(i - 1 + n) % n];
        if (sljedeci) { e.preventDefault(); izaberiDan(sljedeci.dataset.dan, true); }
      });
    });
    izaberiDan(danas);
  }

  // ---------- Sparks over the hero ----------
  var platno = $('.iskre');
  if (platno && !reduce && platno.getContext) {
    var ctx = platno.getContext('2d'), w = 0, h = 0, dpr = 1, iskre = [], radi = true, id = 0;
    var postavi = function () {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = platno.clientWidth; h = platno.clientHeight;
      platno.width = Math.round(w * dpr); platno.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    var nova = function (o, prvi) {
      o.x = Math.random() * w;
      o.y = prvi ? Math.random() * h : h + 12;
      o.r = 0.7 + Math.random() * 2.3;
      o.v = 0.3 + Math.random() * 1.0;
      o.a = 0.35 + Math.random() * 0.65;
      o.fi = Math.random() * 6.28;
      o.f = 0.01 + Math.random() * 0.02;
      return o;
    };
    var napravi = function () {
      var n = Math.max(24, Math.min(80, Math.round(w / 16)));
      iskre = [];
      for (var i = 0; i < n; i++) iskre.push(nova({}, true));
    };
    var crtaj = function () {
      if (!radi) return;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < iskre.length; i++) {
        var o = iskre[i];
        o.y -= o.v; o.fi += o.f; o.x += Math.sin(o.fi) * 0.45;
        if (o.y < -12) nova(o, false);
        var vis = Math.max(0, Math.min(1, o.y / h));
        var alfa = o.a * (0.25 + vis * 0.75) * (o.y > h - 30 ? (h - o.y) / 30 : 1);
        var g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r * 5);
        g.addColorStop(0, 'rgba(255,190,70,' + alfa + ')');
        g.addColorStop(0.35, 'rgba(255,100,20,' + alfa * 0.5 + ')');
        g.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 5, 0, 6.2832); ctx.fill();
      }
      id = requestAnimationFrame(crtaj);
    };
    postavi(); napravi(); id = requestAnimationFrame(crtaj);
    window.addEventListener('resize', function () { postavi(); napravi(); });
    // Saves battery when the hero is off screen or the tab is in the background.
    var hero = $('.hero');
    var odluci = function (vidljivo) {
      var treba = vidljivo && !document.hidden;
      if (treba && !radi) { radi = true; id = requestAnimationFrame(crtaj); }
      if (!treba) { radi = false; cancelAnimationFrame(id); }
    };
    if (hero && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (z) { odluci(z[0].isIntersecting); }, { threshold: 0 }).observe(hero);
    }
    document.addEventListener('visibilitychange', function () { odluci(!document.hidden); });
  }

  // The header also returns when the mouse nears the top of the screen or the keyboard enters it
  if (zaglavlje) {
    document.addEventListener('mousemove', function (e) { if (e.clientY < 70) zaglavlje.classList.remove('sakriveno'); });
    zaglavlje.addEventListener('focusin', function () { zaglavlje.classList.remove('sakriveno'); });
  }

  window.addEventListener('scroll', zakaziSkrol, { passive: true });
  pratiSkrol();
})();
