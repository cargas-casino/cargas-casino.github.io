(() => {
  'use strict';

  /* ============================================================
     HELPERS
     ============================================================ */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none)').matches;

  /* ============================================================
     AÑO DINÁMICO
     ============================================================ */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ============================================================
     TOAST SYSTEM
     ============================================================ */
  const toastWrap = $('#toastWrap');
  const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';

  function showToast(message, { duration = 2200, icon = ICON_CHECK } = {}){
    if (!toastWrap) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `${icon}<span>${message}</span>`;
    toastWrap.appendChild(toast);

    const remove = () => {
      if (!toast.isConnected) return;
      toast.classList.add('out');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
      setTimeout(() => toast.remove(), 400);
    };

    const timer = setTimeout(remove, duration);
    toast.addEventListener('click', () => {
      clearTimeout(timer);
      remove();
    });
  }

  /* ============================================================
     COPIAR NÚMEROS AL PORTAPAPELES
     ============================================================ */
  async function copyToClipboard(text){
    if (navigator.clipboard && window.isSecureContext){
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (_) { /* fallback */ }
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (_) {
      return false;
    }
  }

  $$('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const value = btn.getAttribute('data-copy');
      if (!value) return;

      const ok = await copyToClipboard(value);

      if (ok){
        btn.classList.add('copied');
        showToast('Número copiado');

        const original = btn.innerHTML;
        btn.innerHTML = ICON_CHECK;
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = original;
        }, 1400);
      } else {
        showToast('No se pudo copiar');
      }
    });
  });

  /* ============================================================
     NAV — SCROLLED + BOTÓN VOLVER ARRIBA
     ============================================================ */
  const nav = $('#nav');
  const backTop = $('#backTop');
  let ticking = false;

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if (nav) nav.classList.toggle('scrolled', y > 30);
      if (backTop) backTop.classList.toggle('show', y > window.innerHeight * 0.6);
      updateActiveLink();
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ============================================================
     NAV — LINK ACTIVO SEGÚN SECCIÓN VISIBLE
     ============================================================ */
  const navLinks = $$('.nav-links a[href^="#"]');
  const sections = navLinks
    .map(a => $(a.getAttribute('href')))
    .filter(Boolean);

  function updateActiveLink(){
    if (!sections.length) return;
    const y = window.scrollY + 130;
    let active = sections[0];
    for (const s of sections){
      if (s.offsetTop <= y) active = s;
    }
    navLinks.forEach(a => {
      const isActive = a.getAttribute('href') === '#' + active.id;
      a.classList.toggle('active', isActive);
    });
  }

  /* ============================================================
     BOTÓN VOLVER ARRIBA
     ============================================================ */
  if (backTop){
    backTop.addEventListener('click', () => {
      const behavior = prefersReducedMotion ? 'auto' : 'smooth';
      window.scrollTo({ top: 0, behavior });
    });
  }

  /* ============================================================
     MENÚ MÓVIL (focus trap + bloqueo de scroll + scroll al ancla)
     ============================================================ */
  const burger = $('#burger');
  const menu = $('#mmenu');
  const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
  let bodyScrollY = 0;
  let bodyIsLocked = false;

  const lockBody = () => {
    if (bodyIsLocked) return;
    bodyScrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${bodyScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    bodyIsLocked = true;
  };

  const unlockBody = () => {
    if (!bodyIsLocked) return;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    window.scrollTo(0, bodyScrollY);
    bodyIsLocked = false;
  };

  const setMenu = (open) => {
    if (!menu || !burger) return;

    menu.classList.toggle('open', open);
    burger.classList.toggle('active', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.setAttribute('aria-hidden', String(!open));

    if (open){
      lockBody();
      const firstLink = menu.querySelector('a');
      if (firstLink) setTimeout(() => firstLink.focus({ preventScroll: true }), 60);
    } else {
      unlockBody();
    }
  };

  if (burger && menu){
    burger.addEventListener('click', () => {
      setMenu(!menu.classList.contains('open'));
    });

    // Links del menú: cierra el menú y navega al ancla correctamente
    menu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href');
        if (!href || href === '#') return;
        const target = $(href);
        if (!target) return;

        e.preventDefault();

        // Guardar el destino para scrollear tras cerrar
        setMenu(false);

        // Esperamos dos rAF para asegurar que el layout se restauró
        // y luego hacemos scroll al destino con el offset correcto
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const offset = (nav?.offsetHeight || 72) + 16;
            const top = target.getBoundingClientRect().top + window.scrollY - offset;
            const behavior = prefersReducedMotion ? 'auto' : 'smooth';
            window.scrollTo({ top, behavior });

            // Devolver el foco al burger tras navegar (útil con teclado)
            if (!prefersReducedMotion){
              setTimeout(() => burger.focus({ preventScroll: true }), 500);
            }
          });
        });
      });
    });

    // Cerrar al tocar el backdrop (fuera del contenido)
    menu.addEventListener('click', (e) => {
      if (e.target === menu) setMenu(false);
    });

    // Escape + focus trap
    document.addEventListener('keydown', (e) => {
      if (!menu.classList.contains('open')) return;

      if (e.key === 'Escape'){
        e.preventDefault();
        setMenu(false);
        burger.focus({ preventScroll: true });
        return;
      }

      if (e.key === 'Tab'){
        const focusables = Array.from(menu.querySelectorAll(FOCUSABLE))
          .filter(el => el.offsetParent !== null);
        if (!focusables.length) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;

        if (e.shiftKey){
          if (active === first || !menu.contains(active)){
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last || !menu.contains(active)){
            e.preventDefault();
            first.focus();
          }
        }
      }
    });

    // Cerrar al agrandar ventana (vuelve a desktop)
    let resizeTO;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTO);
      resizeTO = setTimeout(() => {
        if (window.innerWidth > 900 && menu.classList.contains('open')) setMenu(false);
      }, 150);
    }, { passive: true });

    // Si el usuario vuelve a la pestaña, asegurarse de que el body no quede bloqueado
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && menu.classList.contains('open')){
        setMenu(false);
      }
    });
  }

  /* ============================================================
     REVEAL ON SCROLL
     ============================================================ */
  const revealEls = $$('.reveal');

  if ('IntersectionObserver' in window && revealEls.length){
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        obs.unobserve(entry.target);
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -8% 0px'
    });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  /* ============================================================
     SCROLL SUAVE CON FALLBACK (navegadores viejos)
     ============================================================ */
  if (!('scrollBehavior' in document.documentElement.style)){
    $$('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (!id || id === '#') return;
        const target = $(id);
        if (!target) return;
        e.preventDefault();
        const offset = (nav?.offsetHeight || 72) + 16;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo(0, top);
      });
    });
  }

  /* ============================================================
     SCROLL INICIAL
     ============================================================ */
  onScroll();

})();