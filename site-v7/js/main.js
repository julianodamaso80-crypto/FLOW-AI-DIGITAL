/* ================================================================
   FLOWAI DIGITAL — v7 Premium JS
   GSAP + Lenis + Canvas Particles + Flow Diagram
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── LENIS SMOOTH SCROLL ──
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth: true,
  });
  function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);
  // Connect Lenis to GSAP ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // ── GSAP SCROLL REVEALS ──
  gsap.registerPlugin(ScrollTrigger);

  // Eyebrows
  gsap.utils.toArray('.eyebrow').forEach(el => {
    gsap.fromTo(el, { opacity: 0, x: -20 }, {
      opacity: 1, x: 0, duration: 0.6, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });

  // Section titles
  gsap.utils.toArray('.section__title').forEach(el => {
    gsap.fromTo(el, { opacity: 0, y: 30 }, {
      opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%' }
    });
  });

  // Section subtitles
  gsap.utils.toArray('.section__sub').forEach(el => {
    gsap.fromTo(el, { opacity: 0, y: 20 }, {
      opacity: 1, y: 0, duration: 0.7, delay: 0.15, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%' }
    });
  });

  // Cards with stagger
  gsap.utils.toArray('.problems-grid, .pillars, .squads-grid, .audience-grid, .steps').forEach(grid => {
    const children = grid.children;
    gsap.fromTo(children, { opacity: 0, y: 30 }, {
      opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out',
      scrollTrigger: { trigger: grid, start: 'top 80%' }
    });
  });

  // Value items
  gsap.utils.toArray('.value-item').forEach((el, i) => {
    gsap.fromTo(el, { opacity: 0, x: -20 }, {
      opacity: 1, x: 0, duration: 0.5, delay: i * 0.06, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });

  // Compare table
  gsap.utils.toArray('.compare-table').forEach(el => {
    gsap.fromTo(el, { opacity: 0, y: 20, scale: 0.98 }, {
      opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 80%' }
    });
  });

  // FAQ items
  gsap.utils.toArray('.faq-item').forEach((el, i) => {
    gsap.fromTo(el, { opacity: 0, y: 15 }, {
      opacity: 1, y: 0, duration: 0.5, delay: i * 0.05, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%' }
    });
  });

  // Stats counter with GSAP
  gsap.utils.toArray('.stats-row').forEach(row => {
    gsap.fromTo(row, { opacity: 0, scale: 0.95 }, {
      opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out',
      scrollTrigger: {
        trigger: row, start: 'top 80%',
        onEnter: () => {
          row.querySelectorAll('.stat__number[data-target]').forEach(animateCounter);
        }
      }
    });
  });

  // Hero entrance
  const heroTl = gsap.timeline({ delay: 0.3 });
  heroTl
    .fromTo('.hero__badge', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 })
    .fromTo('.hero__h1', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, '-=0.3')
    .fromTo('.hero__sub', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7 }, '-=0.4')
    .fromTo('.hero__cta-wrap', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.3');

  // ── COUNTER ANIMATION ──
  function animateCounter(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = 'true';
    const target = parseInt(el.dataset.target);
    gsap.fromTo(el, { innerText: 0 }, {
      innerText: target, duration: 2, ease: 'power2.out', snap: { innerText: 1 },
      onUpdate: function() { el.textContent = Math.floor(this.targets()[0].innerText); }
    });
  }

  // ── FAQ ACCORDION ──
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
      btn.setAttribute('aria-expanded', !isOpen);
    });
  });

  // ── MOBILE NAV ──
  const toggle = document.getElementById('navToggle');
  const mobileNav = document.getElementById('navMobile');
  if (toggle && mobileNav) {
    toggle.addEventListener('click', () => {
      const isOpen = mobileNav.classList.contains('active');
      mobileNav.classList.toggle('active');
      toggle.setAttribute('aria-expanded', !isOpen);
    });
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ── NAV SCROLL ──
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) nav.classList.add('nav--scrolled');
    else nav.classList.remove('nav--scrolled');
  }, { passive: true });

  // ── HERO PARTICLES ──
  const pCanvas = document.getElementById('heroParticles');
  if (pCanvas) {
    const pCtx = pCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    let particles = [];

    function resizeParticles() {
      pCanvas.width = window.innerWidth * dpr;
      pCanvas.height = window.innerHeight * dpr;
      pCanvas.style.width = window.innerWidth + 'px';
      pCanvas.style.height = window.innerHeight + 'px';
      pCtx.scale(dpr, dpr);
    }
    resizeParticles();
    window.addEventListener('resize', resizeParticles);

    // Create particles
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 2 + 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.3 + 0.05
      });
    }

    function drawParticles() {
      pCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = window.innerWidth;
        if (p.x > window.innerWidth) p.x = 0;
        if (p.y < 0) p.y = window.innerHeight;
        if (p.y > window.innerHeight) p.y = 0;

        pCtx.beginPath();
        pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        pCtx.fillStyle = `rgba(201,101,60,${p.opacity})`;
        pCtx.fill();

        // Draw connections
        particles.forEach((p2, j) => {
          if (j <= i) return;
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            pCtx.beginPath();
            pCtx.moveTo(p.x, p.y);
            pCtx.lineTo(p2.x, p2.y);
            pCtx.strokeStyle = `rgba(201,101,60,${0.06 * (1 - dist / 120)})`;
            pCtx.lineWidth = 0.5;
            pCtx.stroke();
          }
        });
      });

      requestAnimationFrame(drawParticles);
    }
    drawParticles();
  }

  // ── FLOW DIAGRAM ──
  const fCanvas = document.getElementById('flowCanvas');
  if (fCanvas) {
    const ctx = fCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const squads = [
      'Tráfego', 'Tracking', 'CRM', 'Atendimento',
      'Follow-up', 'Vendas', 'Dashboard', 'Remarketing'
    ];

    let offset = 0;
    let animating = false;

    function drawFlow() {
      const rect = fCanvas.parentElement.getBoundingClientRect();
      const w = Math.min(rect.width, 800);
      const h = 350;
      fCanvas.width = w * dpr;
      fCanvas.height = h * dpr;
      fCanvas.style.width = w + 'px';
      fCanvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cx = w / 2;
      const cy = h / 2;
      const rx = Math.min(w * 0.38, 280);
      const ry = Math.min(h * 0.36, 120);

      ctx.clearRect(0, 0, w, h);

      const positions = squads.map((_, i) => {
        const angle = (i / squads.length) * Math.PI * 2 - Math.PI / 2;
        return { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry };
      });

      // Glow behind connections
      positions.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 20);
        grad.addColorStop(0, 'rgba(201,101,60,0.08)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fill();
      });

      // Base connection line
      ctx.beginPath();
      positions.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.closePath();
      ctx.strokeStyle = 'rgba(107,65,45,0.1)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Animated dashes
      ctx.beginPath();
      positions.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.closePath();
      ctx.strokeStyle = 'rgba(201,101,60,0.5)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([10, 14]);
      ctx.lineDashOffset = -offset;
      ctx.stroke();
      ctx.setLineDash([]);

      // Connection to center
      positions.forEach(p => {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = 'rgba(107,65,45,0.06)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Center node (FlowAI)
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
      centerGrad.addColorStop(0, '#C9653C');
      centerGrad.addColorStop(1, '#A95532');
      ctx.fillStyle = centerGrad;
      ctx.fill();
      ctx.shadowColor = 'rgba(201,101,60,0.3)';
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.font = '700 11px Noto Sans';
      ctx.fillStyle = '#FBF8F3';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('flowAI', cx, cy);

      // Squad nodes
      positions.forEach((p, i) => {
        // Highlight active node
        const active = Math.floor((offset / 30) % squads.length) === i;

        ctx.beginPath();
        ctx.arc(p.x, p.y, active ? 9 : 7, 0, Math.PI * 2);
        ctx.fillStyle = active ? '#C9653C' : '#6B412D';
        if (active) {
          ctx.shadowColor = 'rgba(201,101,60,0.4)';
          ctx.shadowBlur = 12;
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.font = `${active ? '700' : '500'} 12px Noto Sans`;
        ctx.fillStyle = active ? '#C9653C' : '#6B412D';
        ctx.textAlign = 'center';
        const labelY = p.y > cy ? p.y + 22 : p.y - 16;
        ctx.fillText(squads[i], p.x, labelY);
      });

      offset += 0.6;
      if (animating) requestAnimationFrame(drawFlow);
    }

    const flowObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) { animating = true; drawFlow(); }
      else { animating = false; }
    }, { threshold: 0.1 });
    flowObserver.observe(fCanvas);
  }

  // ── SMOOTH ANCHOR SCROLL ──
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        lenis.scrollTo(target, { offset: -80 });
      }
    });
  });

  // ── CTA FINAL REVEAL ──
  const ctaSection = document.querySelector('.section--cta');
  if (ctaSection) {
    gsap.fromTo(ctaSection.querySelector('.section__title'),
      { opacity: 0, y: 30 }, {
        opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: ctaSection, start: 'top 75%' }
      }
    );
    gsap.fromTo(ctaSection.querySelector('.section__sub'),
      { opacity: 0, y: 20 }, {
        opacity: 1, y: 0, duration: 0.7, delay: 0.2, ease: 'power3.out',
        scrollTrigger: { trigger: ctaSection, start: 'top 75%' }
      }
    );
  }

});
