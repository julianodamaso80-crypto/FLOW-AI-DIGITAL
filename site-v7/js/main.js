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
  gsap.utils.toArray('.problems-grid, .pillars, .squads-grid, .audience-grid, .steps, .testimonial-grid').forEach(grid => {
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

  // ── HERO TEXT STAGGER ──
  const heroWords = document.querySelectorAll('.hero-word');
  const heroTl = gsap.timeline({ delay: 0.4 });
  heroTl
    .fromTo('.hero__badge', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 });

  // Stagger each word
  heroWords.forEach((word, i) => {
    heroTl.to(word, {
      opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)',
      duration: 0.6, ease: 'power3.out'
    }, 0.5 + i * 0.1);
    word.classList.add('visible-target');
  });

  heroTl
    .fromTo('.hero__sub', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7 }, '-=0.2')
    .fromTo('.hero__cta-wrap', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.3');

  // ── PARALLAX SUTIL ──
  gsap.utils.toArray('.parallax-slow').forEach(el => {
    gsap.fromTo(el, { y: 0 }, {
      y: -30,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.5
      }
    });
  });
  gsap.utils.toArray('.parallax-fast').forEach(el => {
    gsap.fromTo(el, { y: 0 }, {
      y: -50,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1
      }
    });
  });

  // ── GLOW FOLLOW MOUSE on cards ──
  document.querySelectorAll('.squad-card, .agent__card, .pillar, .step, .problem-card').forEach(card => {
    card.style.position = 'relative';
    card.style.overflow = 'hidden';
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--glow-x', x + '%');
      card.style.setProperty('--glow-y', y + '%');
    });
  });

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

    // Create particles — larger and brighter to show over video
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 3 + 1,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        opacity: Math.random() * 0.5 + 0.15
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
        pCtx.fillStyle = `rgba(251,248,243,${p.opacity})`;
        pCtx.fill();

        // Draw connections — white lines visible over dark overlay
        particles.forEach((p2, j) => {
          if (j <= i) return;
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            pCtx.beginPath();
            pCtx.moveTo(p.x, p.y);
            pCtx.lineTo(p2.x, p2.y);
            pCtx.strokeStyle = `rgba(251,248,243,${0.12 * (1 - dist / 150)})`;
            pCtx.lineWidth = 0.8;
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

  // ── ORBITAL NODE ROTATION ──
  const orbitNodes = document.querySelectorAll('.orbit-node');
  if (orbitNodes.length) {
    let activeIdx = 0;
    setInterval(() => {
      orbitNodes.forEach(n => n.classList.remove('active'));
      activeIdx = (activeIdx + 1) % orbitNodes.length;
      orbitNodes[activeIdx].classList.add('active');
    }, 2000);
  }

  // ── FLOWCHART CASCADE ──
  const flowchart = document.querySelector('.flowchart');
  if (flowchart) {
    const flowItems = flowchart.querySelectorAll('.fc-node, .fc-arrow, .fc-split');
    const flowObs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        flowItems.forEach((item, i) => {
          setTimeout(() => item.classList.add('fc-in'), i * 180);
        });
        flowObs.unobserve(flowchart);
      }
    }, { threshold: 0.1 });
    flowObs.observe(flowchart);
  }

  // ── INTERACTIVE WAVES BACKGROUND (squads section) ──
  (function initWaves() {
    const canvas = document.getElementById('squadsWaves');
    if (!canvas) return;
    const section = canvas.parentElement;
    const ctx = canvas.getContext('2d');

    // Perlin noise
    class Grad {
      constructor(x, y, z) { this.x = x; this.y = y; this.z = z; }
      dot2(x, y) { return this.x * x + this.y * y; }
    }
    class Noise {
      constructor(seed = 0) {
        this.grad3 = [
          new Grad(1,1,0), new Grad(-1,1,0), new Grad(1,-1,0), new Grad(-1,-1,0),
          new Grad(1,0,1), new Grad(-1,0,1), new Grad(1,0,-1), new Grad(-1,0,-1),
          new Grad(0,1,1), new Grad(0,-1,1), new Grad(0,1,-1), new Grad(0,-1,-1)
        ];
        this.p = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
        this.perm = new Array(512);
        this.gradP = new Array(512);
        this.seed(seed);
      }
      seed(seed) {
        if (seed > 0 && seed < 1) seed *= 65536;
        seed = Math.floor(seed);
        if (seed < 256) seed |= seed << 8;
        for (let i = 0; i < 256; i++) {
          let v = i & 1 ? this.p[i] ^ (seed & 255) : this.p[i] ^ ((seed >> 8) & 255);
          this.perm[i] = this.perm[i + 256] = v;
          this.gradP[i] = this.gradP[i + 256] = this.grad3[v % 12];
        }
      }
      fade(t) { return t*t*t*(t*(t*6-15)+10); }
      lerp(a,b,t) { return (1-t)*a+t*b; }
      perlin2(x,y) {
        let X = Math.floor(x), Y = Math.floor(y);
        x -= X; y -= Y; X &= 255; Y &= 255;
        const n00 = this.gradP[X+this.perm[Y]].dot2(x,y);
        const n01 = this.gradP[X+this.perm[Y+1]].dot2(x,y-1);
        const n10 = this.gradP[X+1+this.perm[Y]].dot2(x-1,y);
        const n11 = this.gradP[X+1+this.perm[Y+1]].dot2(x-1,y-1);
        const u = this.fade(x);
        return this.lerp(this.lerp(n00,n10,u), this.lerp(n01,n11,u), this.fade(y));
      }
    }

    const noise = new Noise(Math.random());
    let bounding = { width: 0, height: 0, left: 0, top: 0 };
    let lines = [];
    const mouse = { x: -10, y: 0, lx: 0, ly: 0, sx: 0, sy: 0, v: 0, vs: 0, a: 0, set: false };
    const config = {
      lineColor: 'rgba(107,65,45,0.35)',
      waveSpeedX: 0.0125, waveSpeedY: 0.005,
      waveAmpX: 32, waveAmpY: 16,
      friction: 0.925, tension: 0.005,
      maxCursorMove: 100,
      xGap: 12, yGap: 36
    };

    function setSize() {
      const rect = section.getBoundingClientRect();
      bounding = { width: rect.width, height: rect.height, left: rect.left, top: rect.top };
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    function setLines() {
      const { width, height } = bounding;
      lines = [];
      const oWidth = width + 200, oHeight = height + 30;
      const totalLines = Math.ceil(oWidth / config.xGap);
      const totalPoints = Math.ceil(oHeight / config.yGap);
      const xStart = (width - config.xGap * totalLines) / 2;
      const yStart = (height - config.yGap * totalPoints) / 2;
      for (let i = 0; i <= totalLines; i++) {
        const pts = [];
        for (let j = 0; j <= totalPoints; j++) {
          pts.push({
            x: xStart + config.xGap * i,
            y: yStart + config.yGap * j,
            wave: { x: 0, y: 0 },
            cursor: { x: 0, y: 0, vx: 0, vy: 0 }
          });
        }
        lines.push(pts);
      }
    }

    function movePoints(time) {
      lines.forEach(pts => {
        pts.forEach(p => {
          const move = noise.perlin2((p.x + time * config.waveSpeedX) * 0.002, (p.y + time * config.waveSpeedY) * 0.0015) * 12;
          p.wave.x = Math.cos(move) * config.waveAmpX;
          p.wave.y = Math.sin(move) * config.waveAmpY;

          const dx = p.x - mouse.sx, dy = p.y - mouse.sy;
          const dist = Math.hypot(dx, dy);
          const l = Math.max(175, mouse.vs);
          if (dist < l) {
            const s = 1 - dist / l;
            const f = Math.cos(dist * 0.001) * s;
            p.cursor.vx += Math.cos(mouse.a) * f * l * mouse.vs * 0.00065;
            p.cursor.vy += Math.sin(mouse.a) * f * l * mouse.vs * 0.00065;
          }
          p.cursor.vx += (0 - p.cursor.x) * config.tension;
          p.cursor.vy += (0 - p.cursor.y) * config.tension;
          p.cursor.vx *= config.friction;
          p.cursor.vy *= config.friction;
          p.cursor.x += p.cursor.vx * 2;
          p.cursor.y += p.cursor.vy * 2;
          p.cursor.x = Math.min(config.maxCursorMove, Math.max(-config.maxCursorMove, p.cursor.x));
          p.cursor.y = Math.min(config.maxCursorMove, Math.max(-config.maxCursorMove, p.cursor.y));
        });
      });
    }

    function moved(point, withCursor = true) {
      const x = point.x + point.wave.x + (withCursor ? point.cursor.x : 0);
      const y = point.y + point.wave.y + (withCursor ? point.cursor.y : 0);
      return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    }

    function drawLines() {
      const { width, height } = bounding;
      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();
      ctx.strokeStyle = config.lineColor;
      ctx.lineWidth = 1;
      lines.forEach(points => {
        let p1 = moved(points[0], false);
        ctx.moveTo(p1.x, p1.y);
        points.forEach((p, idx) => {
          const isLast = idx === points.length - 1;
          p1 = moved(p, !isLast);
          const p2 = moved(points[idx + 1] || points[points.length - 1], !isLast);
          ctx.lineTo(p1.x, p1.y);
          if (isLast) ctx.moveTo(p2.x, p2.y);
        });
      });
      ctx.stroke();
    }

    let running = false;
    function tick(t) {
      if (!running) return;
      mouse.sx += (mouse.x - mouse.sx) * 0.1;
      mouse.sy += (mouse.y - mouse.sy) * 0.1;
      const dx = mouse.x - mouse.lx, dy = mouse.y - mouse.ly;
      const d = Math.hypot(dx, dy);
      mouse.v = d;
      mouse.vs += (d - mouse.vs) * 0.1;
      mouse.vs = Math.min(100, mouse.vs);
      mouse.lx = mouse.x;
      mouse.ly = mouse.y;
      mouse.a = Math.atan2(dy, dx);
      movePoints(t);
      drawLines();
      requestAnimationFrame(tick);
    }

    function onResize() { setSize(); setLines(); }
    function updateMouse(x, y) {
      mouse.x = x - bounding.left;
      mouse.y = y - bounding.top;
      if (!mouse.set) {
        mouse.sx = mouse.x; mouse.sy = mouse.y;
        mouse.lx = mouse.x; mouse.ly = mouse.y;
        mouse.set = true;
      }
    }

    setSize();
    setLines();

    // Only run when visible (performance)
    const visObs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        if (!running) { running = true; requestAnimationFrame(tick); }
      } else {
        running = false;
      }
    }, { threshold: 0.01 });
    visObs.observe(section);

    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', (e) => updateMouse(e.clientX, e.clientY));
    window.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      if (t) updateMouse(t.clientX, t.clientY);
    }, { passive: true });
  })();

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
