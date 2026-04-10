# FlowAI Site Development Guide

## Estrutura do Repositorio

```
FLOW-AI-DIGITAL/
├── site-v6-video/          # Site de producao atual (NAO TOCAR)
├── site-v7/                # Novo site (em desenvolvimento)
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── main.js
│   ├── assets/
│   │   ├── logo/
│   │   ├── images/
│   │   └── videos/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── robots.txt
│   └── sitemap.xml
├── squads/                 # 12 squads com configs
├── .claude/
│   ├── agents/             # 13 agent files (chiefs + organizer)
│   └── skills/             # 4 skill files
├── pesquisa-sites-ia/      # Pesquisa e plano do v7
├── flowai-growth-os/       # Plugin system (NAO TOCAR)
├── flowai-revenue-engine/  # Plugin system (NAO TOCAR)
├── .github/workflows/      # CI/CD deploy (NAO TOCAR)
├── CLAUDE.md               # Contexto principal
├── .gitignore
└── Dockerfile              # Root Docker config
```

## Stack Tecnica

- **HTML estatico** — sem framework, sem build step
- **CSS puro** — custom properties, no Tailwind, no SASS
- **JS vanilla** — ES6+, modules se necessario
- **Bibliotecas externas** (via CDN):
  - GSAP (animacoes): `https://cdn.jsdelivr.net/npm/gsap@3/`
  - Lenis (smooth scroll): `https://cdn.jsdelivr.net/npm/lenis@1/`
  - Three.js (3D, se necessario): `https://cdn.jsdelivr.net/npm/three@0.160/`

## Deploy

- **Plataforma**: EasyPanel (Docker) em Hostinger KVM 4
- **Processo**: Push to `main` → GitHub Actions → Docker build → EasyPanel deploy
- **Dockerfile**: nginx:alpine servindo arquivos estaticos
- **nginx.conf**: gzip, cache headers, SPA fallback

## Padroes de Codigo

### HTML
- Semantico: `<section>`, `<nav>`, `<article>`, `<footer>`
- Acessibilidade: `aria-label`, `role`, `alt` em todas as imagens
- IDs para navegacao: `id="hero"`, `id="problema"`, etc.
- Schema.org via JSON-LD no `<head>`

### CSS
- Custom properties em `:root` para todas as cores e fontes
- Mobile-first: base mobile, `@media (min-width: 768px)` para tablet, `(min-width: 1024px)` para desktop
- BEM-like naming: `.section__title`, `.card__body`, `.btn--primary`
- Nao usar `!important` exceto em overrides de terceiros

### JS
- Intersection Observer para scroll animations (sem biblioteca)
- Event delegation quando possivel
- Defer scripts: `<script defer src="js/main.js"></script>`
- Nao bloquear render com JS sincrono

## Performance Targets

- **Lighthouse**: 95+ em todas as categorias
- **LCP**: < 2.5s
- **CLS**: < 0.1
- **FID/INP**: < 200ms
- **Peso total**: < 2MB na home
- **Imagens**: WebP, lazy load, srcset para responsivo
- **Fontes**: `display=swap`, preconnect para Google Fonts

## SEO Tecnico

- Title: 50-60 caracteres
- Meta description: 150-160 caracteres
- Canonical URL em todas as paginas
- Schema markup: Organization + Service + FAQ + LocalBusiness
- Open Graph completo
- sitemap.xml atualizado
- robots.txt permissivo

## Regras de Commit

- Prefixos: `feat:`, `fix:`, `chore:`, `docs:`, `style:`
- Mensagem em portugues ou ingles (consistente por PR)
- Um commit por mudanca logica
- Nunca commit direto na `main` sem review
