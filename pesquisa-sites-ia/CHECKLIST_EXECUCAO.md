# Checklist de Execucao — Site V7 FlowAI Digital

> Ordem exata dos passos para construir o site v7 depois do plano aprovado.

---

## Pre-Requisitos (antes de comecar a codar)

- [ ] Plano V7 aprovado pelo Juliano
- [ ] Logo definitivo confirmado (usar existente ou novo)
- [ ] CTA flow definido (WhatsApp? Calendly? Cal.com?)
- [ ] Copy de todas as secoes revisada e aprovada
- [ ] 12 squads (nomes client-facing) confirmados

---

## Fase 1: Estrutura Base

**Dependencias**: Pre-requisitos aprovados

- [ ] Criar diretorio `site-v7/`
- [ ] Criar `site-v7/index.html` com HTML semantico das 11 secoes
- [ ] Criar `site-v7/css/styles.css` com design system (custom properties)
- [ ] Criar `site-v7/js/main.js` com interacoes base
- [ ] Importar Noto Serif + Noto Sans via Google Fonts (preconnect + display=swap)
- [ ] Copiar logo para `site-v7/assets/logo/`
- [ ] Criar `site-v7/Dockerfile` (nginx:alpine)
- [ ] Criar `site-v7/nginx.conf` (gzip, cache, headers)

**Ponto de aprovacao**: Estrutura HTML sem estilo — Juliano valida a ordem das secoes

---

## Fase 2: Design System

**Dependencias**: Fase 1

- [ ] Implementar CSS custom properties (:root com paleta, tipografia, espacamentos)
- [ ] Implementar componentes base: .btn, .btn--primary, .card, .container, .section
- [ ] Implementar navegacao (nav desktop + mobile hamburger)
- [ ] Implementar footer com links organizados
- [ ] Implementar hero section (gradient mesh animado OU particulas em canvas)
- [ ] Implementar secao alternada (background Areia Editorial)
- [ ] Testar responsivo: mobile (375px), tablet (768px), desktop (1024px+)

**Ponto de aprovacao**: Design system aplicado — Juliano valida visual geral

---

## Fase 3: Copy e Conteudo

**Dependencias**: Fase 2

- [ ] Inserir copy de TODAS as 11 secoes (do PLANO_SITE_V7.md)
- [ ] Implementar tabela comparativa (Agencia Tradicional vs Agencia de IA)
- [ ] Implementar cards dos 12 squads com icones SVG
- [ ] Implementar FAQ accordion (JS vanilla)
- [ ] Implementar formulario/botao CTA (link para WhatsApp ou Calendly)
- [ ] Implementar WhatsApp floating button
- [ ] Inserir texto de todos os eyebrows, headlines, subheadlines

---

## Fase 4: Visualizacao dos Agentes

**Dependencias**: Fase 3

- [ ] Implementar visualizacao principal dos 129 agentes (constelacao/orbital/grid)
- [ ] Implementar animacao "agentes conversam" (fluxo loop animado)
- [ ] Implementar hover states nos cards de squad (expandir para mostrar agentes)
- [ ] Implementar counter animado ("129 agentes", "12 squads", "24/7")
- [ ] Testar performance da visualizacao em mobile

**Ponto de aprovacao**: Visualizacao dos agentes — Juliano valida o "wow factor"

---

## Fase 5: Animacoes e Efeitos

**Dependencias**: Fase 4

- [ ] Instalar GSAP via CDN (ScrollTrigger)
- [ ] Instalar Lenis via CDN (smooth scroll)
- [ ] Implementar scroll reveal em todas as secoes (fade + translateY)
- [ ] Implementar stagger animation nos cards
- [ ] Implementar grain/noise overlay sutil (CSS SVG filter)
- [ ] Implementar hover states premium (sombra + scale em cards e botoes)
- [ ] Implementar transicoes suaves entre secoes
- [ ] Validar: nenhuma animacao >800ms, max 2 simultaneas na tela

---

## Fase 6: SEO e Meta

**Dependencias**: Fase 5

- [ ] Inserir title tag otimizado
- [ ] Inserir meta description
- [ ] Inserir Schema.org JSON-LD (Organization + Service + FAQ + LocalBusiness)
- [ ] Inserir Open Graph tags completas
- [ ] Inserir Twitter Card tags
- [ ] Criar `site-v7/robots.txt`
- [ ] Criar `site-v7/sitemap.xml`
- [ ] Inserir canonical URL
- [ ] Criar/atualizar favicon

---

## Fase 7: Performance

**Dependencias**: Fase 6

- [ ] Lighthouse audit: Performance 95+
- [ ] Lighthouse audit: Accessibility 95+
- [ ] Lighthouse audit: Best Practices 95+
- [ ] Lighthouse audit: SEO 95+
- [ ] LCP < 2.5s (verificar hero render)
- [ ] CLS < 0.1 (verificar font loading, imagens com dimensoes)
- [ ] Total weight < 2MB (sem video hero — usar CSS)
- [ ] Imagens em WebP com lazy load
- [ ] Fonts com preconnect e display=swap
- [ ] JS com defer, nenhum script blocking

---

## Fase 8: Blog Migration

**Dependencias**: Fase 7

- [ ] Copiar 50 blog posts de `site-v6-video/blog/` para `site-v7/blog/`
- [ ] Atualizar template dos posts (novo nav, footer, fonts, cores)
- [ ] Atualizar blog index com novo design
- [ ] Verificar todos os internal links
- [ ] Manter URLs identicas (sem quebrar SEO existente)

---

## Fase 9: Deploy

**Dependencias**: Fase 8

- [ ] Atualizar Dockerfile raiz para apontar para `site-v7/`
- [ ] Atualizar `nginx.conf`
- [ ] Build local com Docker — testar
- [ ] Push to main → auto-deploy via GitHub Actions
- [ ] Verificar producao em flowaidigital.com.br
- [ ] Submeter novo sitemap ao Google Search Console
- [ ] Submeter ao Bing Webmaster Tools

**Ponto de aprovacao FINAL**: Site em producao — Juliano valida tudo

---

## Fase 10: Pos-Deploy

- [ ] Tag git: `v7.0.0`
- [ ] Arquivar site-v6-video (manter como referencia)
- [ ] Monitorar Lighthouse semanalmente
- [ ] Monitorar Search Console (indexacao, erros)
- [ ] Planejar novos blog posts sem nicho fixo
