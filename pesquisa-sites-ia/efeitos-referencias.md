# Efeitos Visuais — Colecao de Referencias Tecnicas

> Snippets prontos para adaptar no site v7 da FlowAI. Paleta: #F5EFE6 (bg), #C9653C (accent), #6B412D (dark).

---

## 1. Gradient Mesh Animado (Stripe-style)

**Onde foi visto**: stripe.com, linear.app

```css
.gradient-mesh {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 20% 50%, rgba(201,101,60,0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(169,85,50,0.1) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 80%, rgba(231,216,199,0.3) 0%, transparent 50%);
  filter: blur(40px);
  animation: meshMove 8s ease-in-out infinite alternate;
}

@keyframes meshMove {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(-20px, 10px) scale(1.05); }
}
```

**Performance**: Puro CSS, GPU-accelerated. Impacto minimo. Mobile-safe.

---

## 2. Grain / Noise Overlay

**Onde foi visto**: linear.app, cursor.com, anthropic.com

```css
.grain::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
```

**Performance**: Overlay fixo, renderizado uma vez. Custo zero.

---

## 3. Scroll-Triggered Reveal (Vanilla JS)

**Onde foi visto**: Todos os 20 sites pesquisados

```js
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
reveals.forEach(el => observer.observe(el));
```

```css
.reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.reveal.revealed {
  opacity: 1;
  transform: translateY(0);
}
```

**Performance**: Vanilla JS, sem biblioteca. O padrao universal.

---

## 4. Smooth Scroll (Lenis)

**Onde foi visto**: linear.app, vercel.com

```html
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js"></script>
<script>
const lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
requestAnimationFrame(raf);
</script>
```

**Performance**: ~8KB gzipped. Leve. Mobile-safe com fallback nativo.

---

## 5. Counter / Number Animation

**Onde foi visto**: stripe.com, elevenlabs.io

```js
function animateCounter(el) {
  const target = parseInt(el.dataset.target);
  const duration = 1500;
  const start = performance.now();
  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}
```

```html
<span class="counter" data-target="129">0</span>
```

---

## 6. Constellation / Network Diagram (Canvas)

**Onde foi visto**: mistral.ai, huggingface.co — ideal para 12 squads conectados

```js
const canvas = document.getElementById('network');
const ctx = canvas.getContext('2d');
const nodes = [];
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;

// 12 squads em circulo
for (let i = 0; i < 12; i++) {
  const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
  nodes.push({
    x: centerX + Math.cos(angle) * 200,
    y: centerY + Math.sin(angle) * 200,
    r: 8,
    label: ['Trafego','SEO','Tracking','Design','Copy','Social','Email','CRO','CRM','Sites','Vendas','Remarketing'][i]
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Linhas conectando ao centro
  nodes.forEach(n => {
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(n.x, n.y);
    ctx.strokeStyle = 'rgba(201,101,60,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });
  // Linhas entre squads adjacentes
  nodes.forEach((n, i) => {
    const next = nodes[(i + 1) % 12];
    ctx.beginPath();
    ctx.moveTo(n.x, n.y);
    ctx.lineTo(next.x, next.y);
    ctx.strokeStyle = 'rgba(201,101,60,0.1)';
    ctx.stroke();
  });
  // Centro (FlowAI)
  ctx.beginPath();
  ctx.arc(centerX, centerY, 16, 0, Math.PI * 2);
  ctx.fillStyle = '#C9653C';
  ctx.fill();
  // Nodes dos squads
  nodes.forEach(n => {
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fillStyle = '#6B412D';
    ctx.fill();
    ctx.fillStyle = '#6B412D';
    ctx.font = '11px Noto Sans';
    ctx.textAlign = 'center';
    ctx.fillText(n.label, n.x, n.y + 22);
  });
  requestAnimationFrame(draw);
}
draw();
```

---

## 7. Animated Flow Lines (SVG + CSS)

**Para secao "agentes conversam entre si"**

```css
.flow-line {
  stroke-dasharray: 8 4;
  animation: flowDash 1.5s linear infinite;
}
@keyframes flowDash {
  to { stroke-dashoffset: -24; }
}
```

```html
<svg viewBox="0 0 800 100">
  <path class="flow-line" d="M50,50 Q200,10 400,50 Q600,90 750,50"
    stroke="#C9653C" stroke-width="2" fill="none" opacity="0.4"/>
</svg>
```

---

## 8. Hover Card Premium

**Onde foi visto**: linear.app, clerk.com

```css
.card {
  background: #F5EFE6;
  border: 1px solid rgba(107,65,45,0.08);
  border-radius: 12px;
  padding: 32px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
.card:hover {
  transform: translateY(-2px) scale(1.01);
  box-shadow: 0 8px 32px rgba(107,65,45,0.12);
  border-color: rgba(201,101,60,0.2);
}
```

---

## 9. Text Stagger Animation (CSS only)

```css
.stagger-word { display: inline-block; opacity: 0; transform: translateY(12px); }
.stagger-word.revealed {
  animation: staggerIn 0.5s ease forwards;
}
.stagger-word:nth-child(1) { animation-delay: 0ms; }
.stagger-word:nth-child(2) { animation-delay: 50ms; }
.stagger-word:nth-child(3) { animation-delay: 100ms; }
.stagger-word:nth-child(4) { animation-delay: 150ms; }
.stagger-word:nth-child(5) { animation-delay: 200ms; }

@keyframes staggerIn {
  to { opacity: 1; transform: translateY(0); }
}
```

---

## Resumo de Bibliotecas Recomendadas

| Lib | Tamanho | Necessaria? | Alternativa vanilla |
|-----|---------|-------------|---------------------|
| GSAP + ScrollTrigger | ~30KB gz | Opcional | Intersection Observer (acima) |
| Lenis | ~8KB gz | Recomendada | CSS scroll-behavior: smooth |
| Three.js | ~150KB gz | NAO recomendada | Canvas 2D (constellation acima) |
