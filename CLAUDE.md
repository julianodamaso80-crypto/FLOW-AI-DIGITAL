# FlowAI Digital — Contexto Completo do Projeto

## Quem é a FlowAI

A FlowAI Digital é uma **agência de IA** baseada no Rio de Janeiro, fundada pelo Juliano.

**Não é agência de marketing.** É um ecossistema onde **129 agentes de IA especializados, organizados em 12 squads**, operam 24/7 dentro da operação comercial do cliente. Os agentes conversam entre si em tempo real — CRM fala com tráfego, que fala com tracking, que fala com SEO, que fala com criativo, que fala com atendimento, que fala com dashboard, que fala com remarketing. Um alimenta o outro. Sem achismo. Decisões baseadas em dados reais que fluem entre os agentes.

## Posicionamento

- **O que é**: Agência de IA — ecossistema de agentes inteligentes
- **O que NÃO é**: Não é agência de marketing, não é bot de WhatsApp, não é consultoria de relatório mensal
- **Público**: Empresários e empresas (SEM nicho fixo) que precisam organizar operação comercial, automatizar processo e crescer com previsibilidade
- **Comparação central**: "Agência tradicional (achismo, equipe isolada, horário comercial, relatório mensal) VS FlowAI (dados reais, agentes conectados, 24/7, dashboard ao vivo)"

## Os 12 Squads e 129 Agentes (client-facing)

1. **Tráfego & Campanhas** — Meta, Google, YouTube
2. **SEO & Conteúdo** — Blog, keywords, autoridade
3. **Tracking & Analytics** — Cada clique medido
4. **Design & Criativo** — Anúncios, artes, páginas
5. **Copywriting & Persuasão** — Textos que vendem
6. **Social Media** — Presença com estratégia
7. **E-mail Marketing & Nutrição** — Sequências
8. **CRO & Otimização** — Testes contínuos
9. **Automação & CRM** — Pipeline organizado
10. **Sites & Landing Pages** — Rápidas e convertem
11. **Vendas & Fechamento** — Scripts, objeções, follow-up
12. **Remarketing & Reativação** — Lead frio não é lead perdido

## Identidade Visual (OBRIGATÓRIA)

### Paleta (regra 70/20/10)
- `#F5EFE6` — Off-white Quente (fundo principal, 70%)
- `#E7D8C7` — Areia Editorial (cards, apoio)
- `#6B412D` — Marrom Espresso (títulos, texto forte, 20%)
- `#C9653C` — Terracota Flow (acentos, 10%)
- `#A95532` — Cobre Queimado (hover, bordas)
- `#3D2518` — Marrom Escuro (seções dark como tracking e "agentes conversam")
- `#16A34A` — Verde CTA (TODOS os botões de ação)

### Tipografia
- **Headlines**: `Noto Serif Bold`
- **UI/Corpo**: `Noto Sans` (400, 500, 600, 700)
- Import via Google Fonts com `display=swap`

### Regras visuais
- Nunca preto puro — usar #6B412D
- Nunca fundo escuro como padrão — base é clara
- Nunca neon azul, roxo, verde eletrico
- `text-wrap: balance` em TODOS os headings (sem órfãos)
- `word-break: keep-all` para português
- Sem `<br>` forçados que quebram em mobile

### Logo
- Arquivos: `site-v7/assets/logo/logo-flowai-light.png` (principal)
- Versões disponíveis: light, 3d, padrão
- Nav: 90px de altura com margin negativa (-22px) para caber em navbar compacto
- Footer: 176px (grande)

## Regras Absolutas

1. **Sem preço no site** — nunca mencionar valores
2. **Sem nicho** — falar de "empresas" e "empresários", não de clínicas, imobiliárias, etc.
3. **Sem jargão** — zero Hormozi, CLOSER, Value Equation, StoryBrand no material client-facing
4. **CTA único em verde** — sempre texto impactante tipo "Quero parar de perder dinheiro", "Agendar diagnóstico"
5. **Sem números inventados** — nunca fabricar benchmarks, percentuais, projeções
6. **Sem clichê de IA** — nunca "revolucionário", "disruptivo", robôs, neon

## Estrutura do Repositório (atual)

```
FLOW-AI-DIGITAL/
├── site-v7/              # ÚNICO SITE (produção)
│   ├── index.html        # Landing page completa (11 secoes)
│   ├── css/styles.css    # Design system completo
│   ├── js/main.js        # GSAP, Lenis, Perlin waves, etc
│   ├── assets/
│   │   ├── logo/         # 3 variações do logo
│   │   ├── hero-bg.mp4   # Video do hero
│   │   └── favicon.svg   # Favicon editorial
│   ├── nginx.conf
│   ├── robots.txt
│   └── sitemap.xml
├── squads/               # 12 squads com config.yaml + routing-catalog.yaml
├── .claude/
│   ├── agents/           # 13 chiefs + organizer
│   └── skills/           # 4 skills (brand, visual, copy, site)
├── pesquisa-sites-ia/    # Plano master + pesquisa de 20 sites de IA
│   ├── PLANO_SITE_V7.md
│   ├── padroes-encontrados.md
│   ├── efeitos-referencias.md
│   ├── RESUMO_EXECUTIVO.md
│   ├── CHECKLIST_EXECUCAO.md
│   └── analises/         # 20 análises individuais
├── flowai-growth-os/     # Plugin system (growth)
├── flowai-revenue-engine/# Plugin system (revenue)
├── .github/workflows/    # deploy.yml (GitHub Actions → EasyPanel)
├── Dockerfile            # nginx:alpine servindo site-v7/
├── CLAUDE.md             # Este arquivo
└── .gitignore
```

## Seções do Site V7 (ordem atual)

1. **Hero** — Vídeo de fundo + overlay marrom + partículas + text stagger
2. **Orbital dos 129 agentes** — Diagrama animado com 8 nodes
3. **Ticker** — Fundo marrom escuro, texto negrito rolando infinito
4. **O Problema** — Grid de 6 cards com dores reais
5. **O Tracking Que Te Engana** (fundo marrom) — Comparativo Meta Pixel/GTM/GA4/Stape VS ecossistema próprio
6. **A Solução** — 3 pilares + métricas (5min, 24/7, 7x, 100%)
7. **Comparativo** — Tabela Agência Tradicional vs FlowAI
8. **12 Squads** (com Perlin waves de fundo em marrom) — Grid de cards + counters animados
9. **Agentes que Conversam** (fundo marrom) — 6 cards estilo chat com mensagens reais entre agentes
10. **Como Funciona** — 4 passos
11. **O que Você Ganha em 30 Minutos** — Flowchart vertical animado (cascade)
12. **Pra Quem É** — Cards por dor
13. **FAQ** — 8 perguntas reais
14. **CTA Final** — Urgência sutil
15. **Footer** — Logo grande (176px) + links

## Stack Técnica

- **HTML estático** (sem framework, sem build step)
- **CSS puro** com custom properties
- **JS vanilla** ES6+ com defer
- **Bibliotecas externas via CDN**:
  - GSAP + ScrollTrigger (animações de scroll)
  - Lenis (smooth scroll)
- **Perlin noise** implementado em vanilla (portado de React component)
- **Deploy**: Docker nginx:alpine → EasyPanel em Hostinger KVM 4
- **CI/CD**: GitHub Actions — push para `main` dispara webhook do EasyPanel
- **GitHub**: github.com/julianodamaso80-crypto/FLOW-AI-DIGITAL

## Efeitos Visuais Aplicados

| Efeito | Onde | Como |
|---|---|---|
| Gradient mesh animado | Hero | CSS radial-gradient com animação |
| Partículas conectadas | Hero | Canvas com linhas entre pontos |
| Grain overlay | Global | SVG turbulence fixo |
| Text stagger | Hero headline | GSAP timeline por palavra |
| Parallax scroll | Seções O Problema, Solução, Squads | GSAP ScrollTrigger scrub |
| Glow follow mouse | Todos os cards | CSS radial-gradient com var(--glow-x/y) |
| Scroll reveal | Todas as seções | GSAP + Intersection Observer |
| Counter animado | 12/129/24 e métricas | GSAP innerText snap |
| Interactive Perlin waves | Seção squads | Canvas + noise + física de cursor |
| Orbital diagram | Seção agentes | SVG + nodes rotativos |
| Ticker infinito | Entre seções | CSS keyframes linear infinite |
| Flow arrows pulsantes | Flowchart "30 min" | CSS gradient animado |

## Deploy Flow

```
Edit local → git commit → git push origin main
         ↓
GitHub Actions (.github/workflows/deploy.yml)
         ↓
curl webhook EasyPanel (timeout 300s)
         ↓
EasyPanel rebuild Docker
         ↓
nginx:alpine + site-v7/ servido
         ↓
flowaidigital.com.br
```

## Problemas Conhecidos & Workarounds

1. **Cache do CSS externo**: quando mudamos `css/styles.css`, o navegador cache a versão antiga. SOLUÇÃO: CSS crítico é inline no `<head>` do HTML com `!important` (logo, botões verdes, flowchart, seções dark).

2. **Deploy timeout**: o webhook do EasyPanel pode demorar. Configurado `--max-time 300` no curl.

3. **Vídeo hero 20MB**: pesado mas necessário para o impacto. Alternativa futura: usar CSS gradient mesh puro.

4. **GSAP/Lenis sem build**: carregados via CDN (jsdelivr). Ponto único de falha — se o CDN cair, as animações param.

## Tom de Voz

- **Direto**: vai ao ponto, sem introdução longa
- **Confiante**: sabe o que faz, não pede desculpa
- **Acessível**: qualquer empresário entende
- **Baseado em dados**: só afirma o que pode provar
- **Humano**: linguagem natural, coloquial quando cabe

### Exemplos CERTO vs ERRADO
| ❌ Errado | ✅ Certo |
|---|---|
| "Revolucione seu negócio com IA" | "129 agentes trabalham 24/7. Sem horário comercial." |
| "Solução disruptiva" | "Enquanto você dorme, seus leads estão sendo respondidos" |
| "Potencialize seus resultados" | "Seu lead espera 2 horas. O nosso responde em 5 minutos" |

### Palavras proibidas
Revolucionário, disruptivo, inovador, potencializar, alavancar, sinergia, paradigma, "líderes do mercado", "os melhores"

### Palavras aprovadas
Processo, operação, estrutura, agentes, dashboard ao vivo, dados reais, 24/7, previsibilidade, diagnóstico, call de alinhamento

## CTAs do Site (todos em VERDE #16A34A)

| Local | Texto |
|---|---|
| Nav | "Agendar diagnóstico" |
| Hero | "Quero parar de perder dinheiro" |
| Solução | "Quero entender como funciona" |
| Tracking | "Quero parar de jogar dinheiro fora agora" |
| Como funciona | "Começar pelo passo 1" |
| Call gratuita | "Agendar minha call gratuita" |
| CTA final | "Quero parar de perder dinheiro" |
| WhatsApp float | (ícone) |

## Pesquisa de Referência

Os 20 sites analisados em `pesquisa-sites-ia/analises/`:
anthropic.com, openai.com, perplexity.ai, cursor.com, vercel.com, linear.app, lovable.dev, v0.dev, bolt.new, replit.com, runwayml.com, elevenlabs.io, mistral.ai, cohere.com, writer.com, framer.com, stripe.com, resend.com, clerk.com, huggingface.co

### Padrões capturados no v7
- Paleta warm editorial (Anthropic tem paleta quase idêntica)
- Serif display + Sans body (universal em premium)
- Espaçamento generoso
- Grain overlay (Linear, Cursor, Anthropic)
- Gradient mesh (Stripe, Linear)
- Scroll reveal sutil (todos)
- Zero robôs, zero neon, zero "revolucionário"
- Visualização interativa dos "muitos agentes" (inspirado em HuggingFace, Mistral)

## Como Continuar o Projeto

1. **Editar copy/visual**: mexer direto no `site-v7/index.html` e `site-v7/css/styles.css`
2. **Ajustar animações**: `site-v7/js/main.js`
3. **Commit + push**: GitHub Actions faz o deploy automaticamente
4. **Se falhar**: clicar em "Implantar" no painel do EasyPanel
5. **Cache problema**: forçar reload com Ctrl+Shift+R, ou usar CSS inline no `<head>` do HTML com `!important`
