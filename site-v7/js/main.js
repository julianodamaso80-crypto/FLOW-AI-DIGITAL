/* ================================================================
   FLOWAI DIGITAL — v7 Main JS
   Vanilla JS — no framework, no build step
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── SCROLL REVEAL ──
  const reveals = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  reveals.forEach(el => revealObserver.observe(el));

  // ── COUNTER ANIMATION ──
  const counters = document.querySelectorAll('.stat__number[data-target]');
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(el => counterObserver.observe(el));

  function animateCounter(el) {
    const target = parseInt(el.dataset.target);
    const duration = 1500;
    const start = performance.now();
    function update(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      el.textContent = Math.floor(eased * target);
      if (progress < 1) requestAnimationFrame(update);
      else el.textContent = target;
    }
    requestAnimationFrame(update);
  }

  // ── FAQ ACCORDION ──
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const isOpen = item.classList.contains('open');
      // Close all
      document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
      // Toggle clicked
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
    // Close on link click
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ── NAV SCROLL STYLE ──
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) nav.classList.add('nav--scrolled');
    else nav.classList.remove('nav--scrolled');
  }, { passive: true });

  // ── FLOW DIAGRAM (Canvas) ──
  const canvas = document.getElementById('flowCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    function resizeCanvas() {
      const rect = canvas.parentElement.getBoundingClientRect();
      const w = Math.min(rect.width, 800);
      const h = 300;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.scale(dpr, dpr);
      return { w, h };
    }

    const squads = [
      'Tráfego', 'Tracking', 'CRM', 'Atendimento',
      'Follow-up', 'Vendas', 'Dashboard', 'Remarketing'
    ];

    let offset = 0;

    function draw() {
      const { w, h } = resizeCanvas();
      const cx = w / 2;
      const cy = h / 2;
      const rx = Math.min(w * 0.4, 300);
      const ry = Math.min(h * 0.35, 110);

      ctx.clearRect(0, 0, w, h);

      // Draw connections
      const positions = squads.map((_, i) => {
        const angle = (i / squads.length) * Math.PI * 2 - Math.PI / 2;
        return { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry };
      });

      // Animated flow line
      ctx.beginPath();
      positions.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.strokeStyle = 'rgba(201,101,60,0.15)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Animated dashes
      ctx.beginPath();
      positions.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.strokeStyle = 'rgba(201,101,60,0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 12]);
      ctx.lineDashOffset = -offset;
      ctx.stroke();
      ctx.setLineDash([]);

      // Center node
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#C9653C';
      ctx.fill();
      ctx.font = '600 10px Noto Sans';
      ctx.fillStyle = '#FBF8F3';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('AI', cx, cy);

      // Squad nodes
      positions.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#6B412D';
        ctx.fill();

        // Labels
        ctx.font = '500 11px Noto Sans';
        ctx.fillStyle = '#6B412D';
        ctx.textAlign = 'center';
        const labelY = p.y > cy ? p.y + 18 : p.y - 14;
        ctx.fillText(squads[i], p.x, labelY);

        // Connection to center
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = 'rgba(107,65,45,0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      offset += 0.5;
      requestAnimationFrame(draw);
    }

    // Only animate when visible
    const flowObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) draw();
    }, { threshold: 0.1 });
    flowObserver.observe(canvas);
  }

  // ── SMOOTH SCROLL for anchor links ──
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

});
