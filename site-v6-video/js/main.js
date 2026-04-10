/* ================================================================
   FLOWAI DIGITAL — v6 · main.js
   Nav scroll · Mobile menu · FAQ accordion
   Smooth scroll · GSAP hero animation · Scroll reveals
   CTA form → WhatsApp redirect
   ================================================================ */

'use strict';

/* ── NAV SCROLL ─────────────────────────────────────────────── */
(function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;

  let ticking = false;
  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        nav.classList.toggle('scrolled', window.scrollY > 20);
        ticking = false;
      });
      ticking = true;
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // init state
})();

/* ── MOBILE MENU ─────────────────────────────────────────────── */
(function initMobileMenu() {
  const toggle = document.getElementById('navToggle');
  const menu   = document.getElementById('navMobile');
  if (!toggle || !menu) return;

  function close() {
    menu.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });

  // Close on nav link click
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', close));

  // Close on outside click
  document.addEventListener('click', e => {
    if (!menu.contains(e.target) && !toggle.contains(e.target)) close();
  });

  // Close on Escape
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
})();

/* ── FAQ ACCORDION ───────────────────────────────────────────── */
(function initFAQ() {
  const items = document.querySelectorAll('.faq__item');
  items.forEach(item => {
    const btn = item.querySelector('.faq__q');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const open = item.classList.contains('open');

      // Close all
      items.forEach(i => {
        i.classList.remove('open');
        const b = i.querySelector('.faq__q');
        if (b) b.setAttribute('aria-expanded', 'false');
      });

      // Open clicked (unless it was already open)
      if (!open) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });

    // Keyboard: Enter / Space
    btn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btn.click();
      }
    });
  });
})();

/* ── SMOOTH SCROLL ───────────────────────────────────────────── */
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const navH = 64;
      const top  = target.getBoundingClientRect().top + window.scrollY - navH;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();

/* ── SCROLL REVEAL ───────────────────────────────────────────── */
(function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  els.forEach(el => io.observe(el));
})();

/* ── CTA FORM → WHATSAPP ─────────────────────────────────────── */
(function initCTAForm() {
  const form  = document.getElementById('ctaForm');
  const input = document.getElementById('ctaPhone');
  if (!form || !input) return;

  const WA_NUMBER = '5521980214882';

  function formatPhone(raw) {
    return raw.replace(/\D/g, '');
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const digits = formatPhone(input.value);
    if (digits.length < 10) {
      input.focus();
      input.style.borderColor = 'var(--red)';
      input.style.boxShadow   = '0 0 0 3px rgba(245,101,101,0.15)';
      setTimeout(() => {
        input.style.borderColor = '';
        input.style.boxShadow   = '';
      }, 1800);
      return;
    }

    const msg = encodeURIComponent(
      `Olá! Vi o site da FlowAI e quero agendar meu Diagnóstico de Receita. Meu WhatsApp: ${input.value}`
    );
    window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank', 'noopener');
  });

  // Live format feedback
  input.addEventListener('input', () => {
    input.style.borderColor = '';
    input.style.boxShadow   = '';
  });
})();

/* ── GSAP HERO ANIMATION ─────────────────────────────────────── */
(function initHeroGSAP() {
  // Wait for GSAP to load (it's deferred)
  function tryInit() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      setTimeout(tryInit, 100);
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    runHeroAnimation();
  }

  function runHeroAnimation() {
    const h1      = document.querySelector('.hero__h1');
    const sub     = document.querySelector('.hero__sub');
    const ctaWrap = document.querySelector('.hero__cta-wrap');
    const ctaNote = document.querySelector('.hero__cta-note');
    const metrics = document.querySelector('.hero__metrics');
    const visual  = document.querySelector('.hero__visual');

    if (!h1) return;

    // ── Word-split h1 ──
    const words = [];
    h1.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        if (!text) return;
        text.split(/\s+/).forEach(word => {
          if (!word) return;
          const span = document.createElement('span');
          span.className = 'word';
          const inner = document.createElement('span');
          inner.className = 'word-inner';
          inner.textContent = word;
          span.appendChild(inner);
          words.push(span);
        });
        node.replaceWith(...words.splice(0));
      } else if (node.nodeName === 'BR') {
        // keep br
      } else if (node.nodeName === 'EM') {
        node.childNodes.forEach(child => {
          if (child.nodeType === Node.TEXT_NODE) {
            const text = child.textContent.trim();
            if (!text) return;
            const frag = document.createDocumentFragment();
            text.split(/\s+/).forEach(word => {
              if (!word) return;
              const span = document.createElement('span');
              span.className = 'word';
              span.style.color = 'var(--green)'; /* terracota accent */
              const inner = document.createElement('span');
              inner.className = 'word-inner';
              inner.textContent = word;
              span.appendChild(inner);
              words.push(span);
              frag.appendChild(span);
            });
            child.replaceWith(frag);
          }
        });
      }
    });

    const wordInners = h1.querySelectorAll('.word-inner');

    // Build timeline
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    if (wordInners.length) {
      tl.from(wordInners, {
        y: '105%',
        duration: 0.7,
        stagger: 0.055,
        opacity: 0,
      });
    }

    if (sub)     tl.to(sub,     { opacity: 1, y: 0, duration: 0.55 }, '-=0.35');
    if (ctaWrap) tl.to(ctaWrap, { opacity: 1, y: 0, duration: 0.45 }, '-=0.3');
    if (ctaNote) tl.to(ctaNote, { opacity: 1, duration: 0.4 }, '-=0.2');
    if (metrics) tl.to(metrics, { opacity: 1, duration: 0.5 }, '-=0.15');
    if (visual)  tl.to(visual,  { opacity: 1, y: 0, duration: 0.6 }, '<0.15');
  }

  tryInit();
})();

/* ── ORBITAL NODE CYCLE ──────────────────────────────────────── */
(function initOrbitCycle() {
  const container = document.getElementById('orbitNodes');
  if (!container) return;

  const nodes = container.querySelectorAll('.orbit-node');
  if (!nodes.length) return;

  // Sync timing with SVG animation: one full orbit = 7s, 8 nodes = ~875ms each
  const INTERVAL = 875;
  let current = 0;

  function advance() {
    nodes[current].classList.remove('active');
    current = (current + 1) % nodes.length;
    nodes[current].classList.add('active');

    // Retrigger ping animation by re-inserting element
    const ping = nodes[current].querySelector('.orbit-node__ping');
    if (ping) {
      ping.style.animation = 'none';
      // eslint-disable-next-line no-unused-expressions
      ping.offsetHeight; // reflow
      ping.style.animation = '';
    }
  }

  const interval = setInterval(advance, INTERVAL);

  // Pause when tab not visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearInterval(interval);
  });
})();

/* ── FLOWCHART STAGGERED ANIMATION ────────────────────────────── */
(function initFlowchartAnim() {
  const flowchart = document.querySelector('.flowchart');
  if (!flowchart) return;

  const children = Array.from(flowchart.children).filter(function(el) {
    return el.classList.contains('fc-node') ||
           el.classList.contains('fc-arrow') ||
           el.classList.contains('fc-split');
  });

  if (!children.length) return;

  var triggered = false;
  var STAGGER = 220;

  function animateFlowchart() {
    if (triggered) return;
    triggered = true;

    children.forEach(function(el, i) {
      setTimeout(function() {
        el.classList.add('fc-in');
      }, i * STAGGER);
    });
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries) {
      for (var k = 0; k < entries.length; k++) {
        if (entries[k].isIntersecting) {
          animateFlowchart();
          io.disconnect();
          break;
        }
      }
    }, { threshold: 0.05, rootMargin: '0px 0px 50px 0px' });

    io.observe(flowchart);
  } else {
    function checkScroll() {
      var rect = flowchart.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.9) {
        animateFlowchart();
        window.removeEventListener('scroll', checkScroll);
      }
    }
    window.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll();
  }
})();

/* ── BRANCH CARD HIGHLIGHT CYCLE ─────────────────────────────── */
(function initBranchHighlight() {
  const cards = document.querySelectorAll('.branch-card');
  if (!cards.length) return;

  let i = 0;
  setInterval(() => {
    cards.forEach(c => c.classList.remove('highlight'));
    cards[i].classList.add('highlight');
    i = (i + 1) % cards.length;
  }, 2200);
})();
