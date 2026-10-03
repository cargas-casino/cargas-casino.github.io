(() => {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============================================================
     AÑO
     ============================================================ */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ============================================================
     TOASTS
     ============================================================ */
  const toastWrap = $('#toastWrap');
  const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';

  function toast(msg, duration = 2000){
    if (!toastWrap) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `${ICON_CHECK}<span>${msg}</span>`;
    toastWrap.appendChild(el);
    const kill = () => {
      if (!el.isConnected) return;
      el.classList.add('out');
      el.addEventListener('animationend', () => el.remove(), { once: true });
      setTimeout(() => el.remove(), 300);
    };
    const t = setTimeout(kill, duration);
    el.addEventListener('click', () => { clearTimeout(t); kill(); });
  }

  /* ============================================================
     COPIAR NÚMEROS
     ============================================================ */
  const ICON_COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

  async function copyText(text){
    if (navigator.clipboard && window.isSecureContext){
      try { await navigator.clipboard.writeText(text); return true; } catch(_){}
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly','');
      ta.style.cssText = 'position:fixed;top:-9999px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch(_){ return false; }
  }

  $$('.copy-btn').forEach(btn => {
    let timer = null;
    btn.addEventListener('click', async () => {
      const val = btn.dataset.copy;
      if (!val) return;
      const ok = await copyText(val);
      if (ok){
        clearTimeout(timer);
        btn.classList.add('copied');
        btn.innerHTML = ICON_CHECK;
        toast('Número copiado');
        timer = setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = ICON_COPY;
        }, 1500);
      } else {
        toast('No se pudo copiar');
      }
    });
  });

  /* ============================================================
     NAV + BACK TO TOP
     ============================================================ */
  const nav = $('#nav');
  const top = $('#top');
  let ticking = false;

  function onScroll(){
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      try {
        const y = window.scrollY;
        if (nav) nav.classList.toggle('scrolled', y > 20);
        if (top) top.classList.toggle('show', y > window.innerHeight * 0.7);
      } finally { ticking = false; }
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  if (top){
    top.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ============================================================
     NAV ACTIVE LINK
     ============================================================ */
  const navLinks = $$('.nav-links a[href^="#"]');
  const navSections = navLinks.map(a => $(a.getAttribute('href'))).filter(Boolean);

  if ('IntersectionObserver' in window && navSections.length){
    const spy = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const id = '#' + e.target.id;
        navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === id));
      });
    }, {
      rootMargin: '-84px 0px -60% 0px',
      threshold: 0
    });
    navSections.forEach(s => spy.observe(s));
  }

  /* ============================================================
     MOBILE MENU
     ============================================================ */
  const burger = $('#burger');
  const menu = $('#mmenu');
  const FOCUSABLE = 'a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
  let scrollY = 0;
  let locked = false;

  function lock(){
    if (locked) return;
    scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    locked = true;
  }

  function unlock(){
    if (!locked) return;
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    window.scrollTo(0, scrollY);
    html.style.scrollBehavior = prev;
    locked = false;
  }

  function setMenu(open){
    if (!menu || !burger) return;
    menu.classList.toggle('open', open);
    burger.classList.toggle('active', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.setAttribute('aria-hidden', String(!open));

    if (open){
      lock();
      const first = menu.querySelector('a');
      if (first) setTimeout(() => first.focus({ preventScroll: true }), 60);
    } else {
      unlock();
    }
  }

  if (burger && menu){
    burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));

    menu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href');
        if (!href || href === '#') return;
        const target = $(href);
        if (!target) return;
        e.preventDefault();
        setMenu(false);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const offset = (nav?.offsetHeight || 64) + 14;
            const top = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
          });
        });
      });
    });

    menu.addEventListener('click', (e) => { if (e.target === menu) setMenu(false); });

    document.addEventListener('keydown', (e) => {
      if (!menu.classList.contains('open')) return;
      if (e.key === 'Escape'){
        e.preventDefault();
        setMenu(false);
        burger.focus({ preventScroll: true });
        return;
      }
      if (e.key === 'Tab'){
        const f = Array.from(menu.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1], act = document.activeElement;
        if (e.shiftKey){
          if (act === first || !menu.contains(act)){ e.preventDefault(); last.focus(); }
        } else {
          if (act === last || !menu.contains(act)){ e.preventDefault(); first.focus(); }
        }
      }
    });

    let rTO;
    window.addEventListener('resize', () => {
      clearTimeout(rTO);
      rTO = setTimeout(() => {
        if (window.innerWidth > 900 && menu.classList.contains('open')) setMenu(false);
      }, 150);
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && menu.classList.contains('open')) setMenu(false);
    });
  }

  /* ============================================================
     COUNTDOWN
     ============================================================ */
  // Sorteo: domingo 8 de noviembre de 2026, 22:00 hs (UTC-3)
  const TARGET = new Date('2026-11-08T22:00:00-03:00').getTime();

  const cd = {
    d: $$('[data-cd="d"]'),
    h: $$('[data-cd="h"]'),
    m: $$('[data-cd="m"]'),
    s: $$('[data-cd="s"]'),
    full: $$('[data-cd-full]')
  };
  const pad = (n) => String(n).padStart(2, '0');

  function tick(){
    const diff = TARGET - Date.now();

    if (diff <= 0){
      cd.d.forEach(e => e.textContent = '00');
      cd.h.forEach(e => e.textContent = '00');
      cd.m.forEach(e => e.textContent = '00');
      cd.s.forEach(e => e.textContent = '00');
      cd.full.forEach(e => e.textContent = 'Es hoy');
      return;
    }

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    cd.d.forEach(e => e.textContent = pad(d));
    cd.h.forEach(e => e.textContent = pad(h));
    cd.m.forEach(e => e.textContent = pad(m));
    cd.s.forEach(e => e.textContent = pad(s));

    const txt = d > 0
      ? `${d} d ${pad(h)} h ${pad(m)} min`
      : `${pad(h)} h ${pad(m)} min ${pad(s)} s`;
    cd.full.forEach(e => e.textContent = txt);
  }

  tick();
  setInterval(tick, 1000);

  /* ============================================================
     MODAL SORTEO
     ============================================================ */
  const modal = $('#modal');
  const MODAL_KEY = 'sorteo_8nov_visto';
  let lastFocused = null;

  function openModal(){
    if (!modal) return;
    lastFocused = document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');

    const y = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${y}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.body.dataset.scrollY = String(y);

    setTimeout(() => {
      const cta = modal.querySelector('.modal-cta');
      if (cta) cta.focus({ preventScroll: true });
    }, 80);
  }

  function closeModal(){
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    try { sessionStorage.setItem(MODAL_KEY, '1'); } catch(_){}

    const y = parseInt(document.body.dataset.scrollY || '0', 10);
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    delete document.body.dataset.scrollY;
    window.scrollTo(0, y);
    html.style.scrollBehavior = prev;

    if (lastFocused && typeof lastFocused.focus === 'function'){
      lastFocused.focus({ preventScroll: true });
    }
  }

  if (modal){
    $$('[data-close-modal]', modal).forEach(el => el.addEventListener('click', closeModal));

    document.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('open')) return;
      if (e.key === 'Escape'){ e.preventDefault(); closeModal(); return; }
      if (e.key === 'Tab'){
        const f = Array.from(modal.querySelectorAll(FOCUSABLE))
          .filter(el => el.offsetParent !== null && !el.hasAttribute('disabled'));
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1], act = document.activeElement;
        if (e.shiftKey){
          if (act === first || !modal.contains(act)){ e.preventDefault(); last.focus(); }
        } else {
          if (act === last || !modal.contains(act)){ e.preventDefault(); first.focus(); }
        }
      }
    });

    let shown = false;
    try { shown = sessionStorage.getItem(MODAL_KEY) === '1'; } catch(_){}
    if (!shown){
      setTimeout(() => {
        if (menu && menu.classList.contains('open')) return;
        openModal();
      }, 1400);
    }

    if (window.location.hash === '#sorteo'){
      try { sessionStorage.setItem(MODAL_KEY, '1'); } catch(_){}
    }
  }

  /* ============================================================
     REVEAL
     ============================================================ */
  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && revealEls.length){
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        obs.unobserve(e.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  /* ============================================================
     SMOOTH SCROLL FALLBACK
     ============================================================ */
  if (!('scrollBehavior' in document.documentElement.style)){
    $$('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (!id || id === '#') return;
        const t = $(id);
        if (!t) return;
        e.preventDefault();
        const offset = (nav?.offsetHeight || 64) + 14;
        const top = t.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo(0, top);
      });
    });
  }

  onScroll();

})();