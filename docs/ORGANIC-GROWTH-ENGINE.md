# FlowAI Organic Growth Engine

Documentação operacional. O que existe hoje, como rodar, e o que ainda depende
de credencial.

---

## 1. Arquitetura

```
                    ┌──────────────────────────────────────────┐
   flowaidigital →  │           CLOUDFLARE PAGES               │
   .com.br          │  site/dist  (gerado por site/build.mjs)  │
                    │                                          │
                    │   /                 SPA Vite 3D (intocada)│
                    │   /<13 serviços>/   HTML estático real    │
                    │   /blog/ e /blog/*/ HTML estático real    │
                    │   /404.html         404 de verdade        │
                    │   _redirects        sem catch-all 200     │
                    └────────────────┬─────────────────────────┘
                                     │ publica (commit → build → deploy)
                    ┌────────────────┴─────────────────────────┐
                    │           ORGANIC ENGINE                 │
                    │                                          │
                    │  providers/   DataForSEO, GSC, GA4,      │
                    │               PageSpeed, CrUX, IndexNow, │
                    │               Cloudflare, Firecrawl, YT  │
                    │  gates/       10 hard gates + score      │
                    │  crawler/     matriz de acesso dos bots  │
                    │  audit/       acervo de posts antigos    │
                    │  db/          19 tabelas (Drizzle)       │
                    │                                          │
                    │  Postgres  +  pg-boss (fila e cron)      │
                    └──────────────────────────────────────────┘
```

**Por que pg-boss e não Redis:** o Postgres já é necessário para os dados. O
pg-boss entrega fila, retry, cron, lock, prioridade, concorrência e
dead-letter no mesmo banco. Um serviço a menos para manter e pagar.

---

## 2. O site

### Gerar

```bash
node site/build.mjs          # saída em site/dist
node --test "site/test/*.test.mjs"
```

### O que o gerador garante

- A home é copiada **byte a byte** de `site/public/index.html`. O visual 3D
  aprovado nunca é regerado — há teste que falha se o arquivo mudar.
- Cada money page sai com título, description, canonical, H1, conteúdo, links,
  breadcrumb, CTA e JSON-LD **no HTML**, sem depender de JavaScript.
- O sitemap sai das rotas realmente geradas. É impossível listar URL que não
  existe — há teste que verifica arquivo por arquivo.
- `lastmod` vem da data do último commit do arquivo de conteúdo. Não muda a
  cada build.
- `_redirects` **não** tem `/* /index.html 200`. Um teste falha se voltar.

### Conteúdo

- Money pages: `site/content/services.mjs` (13 serviços, portados do `site-v8`).
- Artigos: `site/content/blog/*.md`, Markdown com front matter.

Markdown é renderizado por `site/lib/markdown.mjs`, que **escapa tudo antes** e
só reintroduz um subconjunto conhecido de tags. Não existe passthrough de HTML:
conteúdo gerado por LLM não consegue injetar `<script>` nem `javascript:`.

---

## 3. Providers

Todos herdam de `Provider` e expõem `health()`, que informa o que falta
**sem nunca revelar valor de segredo** — há teste que verifica isso.

| Provider | Estado | Observação |
|---|---|---|
| `dataforseo` | Implementado | Reaproveita a lógica de `api/services/dataforseo.js`; acrescenta keyword ideas, search volume, intent e domain intersection |
| `google-search-console` | Implementado | Read-only por padrão; `submitSitemap` exige escopo ampliado |
| `google-analytics` | Implementado | GA4 Data API, com filtro de sessões orgânicas |
| `pagespeed` | Implementado | Semanal e após mudança de frontend |
| `crux` | Implementado | 404 = sem dado de campo, não é erro |
| `indexnow` | Implementado | Não reenvia URL que não mudou |
| `cloudflare` | Implementado | `readCurrentConfig()` e `listWafRules()` — **ler antes de escrever** |
| `firecrawl` | Implementado | Captura de fonte; não substitui GSC nem DataForSEO |
| `youtube` | Implementado (leitura) | Upload fora de escopo nesta fase |

### Retry e custo

- 4xx (exceto 408/429) é **permanente**: não repete.
- 429 respeita `Retry-After`.
- 5xx e timeout: backoff exponencial com jitter, teto de 30s.
- Todo custo vai para `provider_costs`. O `BudgetGuard` **barra a chamada
  antes** de estourar `DATAFORSEO_MONTHLY_BUDGET_USD`, e estrangula jobs não
  críticos a partir de 80% do teto.

### Política de custo do DataForSEO

- Deep research: **1x por mês** (sugestão: dia 1).
- Rank tracking: só keywords marcadas `is_tracked`.
- Nunca consultar milhares de keywords diariamente.

---

## 4. Ciclo de vida do conteúdo

```
DISCOVER → VALIDATE DEMAND → CHECK CANNIBALIZATION → SERP RESEARCH
   → SOURCE RESEARCH → CONTENT BRIEF → DRAFT → FACT CHECK
   → SEO QA → GEO QA → INTERNAL LINK QA → BRAND QA → TECHNICAL QA
   → PUBLISH → SITEMAP → INDEXNOW → MONITOR → REFRESH
```

### Hard gates

Reprovou um, não publica. Rodar:

```bash
node organic-engine/src/cli.mjs gates caminho/artigo.md
```

| Gate | Reprova quando |
|---|---|
| `demand` | Sem evidência de demanda nem justificativa estratégica |
| `intent` | Intenção não declarada ou inválida |
| `cannibalization` | Outra página já responde a mesma keyword+intenção, ou título quase idêntico |
| `source` | Afirmação quantitativa sem fonte, ou só fonte de baixa qualidade |
| `hallucination` | Número sem lastro na evidência, ou cliente/case não autorizado |
| `originality` | Não declara contribuição original, ou sobreposição alta com a SERP |
| `brand` | Fora do escopo da FlowAI, promessa de resultado, ou sem money page |
| `technical` | Metadata incompleta, slug inválido, data no futuro |
| `internal_link` | Não linka a money page, link para rota inexistente, excesso de links |
| `spam` | Curto demais, keyword stuffing, parágrafos repetidos |

### Quality score

12 dimensões, pesos somando 100.

| Faixa | Decisão |
|---|---|
| ≥ 92 | `PUBLISH` |
| 85–91 | `REWORK` (máximo 3 ciclos) |
| < 85 | `HOLD` |

Depois de 3 retrabalhos vira `HOLD` — não existe quarto ciclo. Sem isso o motor
entra em loop caro.

### Cadência

Máximo **1 artigo forte por dia** no início. Aumenta só quando houver backlog
validado, indexação saudável, gates continuando verdes, sem canibalização e sem
sinal de spam. 3/dia apenas com demanda real comprovada.

---

## 5. Acervo de posts antigos

Os 51 posts do `site-v6` são **acervo, não fila**. Auditoria de 21/08/2026:

| Veredito | Posts |
|---|---|
| KEEP | 0 |
| UPDATE | 36 |
| MERGE | 11 |
| ARCHIVE | 4 |

Mediana de 350 palavras, 8 de 51 citam fontes, 11 grupos de canibalização
interna. **Nenhum é publicável como está.** Relatório completo em
`_audit/pre-organic-foundation-2026-08-21/AUDITORIA-ACERVO-51-POSTS.md`.

---

## 6. Política de crawlers

```bash
node organic-engine/src/cli.mjs crawlers
```

| Crawler | Política | Por quê |
|---|---|---|
| Googlebot, Bingbot | **Allow** | Busca. AI Overviews e AI Mode usam o índice normal do Google |
| OAI-SearchBot, ChatGPT-User | **Allow** | Descoberta e citação no ChatGPT Search |
| Claude-SearchBot, Claude-User | **Allow** | Busca do Claude |
| PerplexityBot, Perplexity-User | **Allow** | Busca do Perplexity |
| GPTBot | **Disallow** | Treinamento. Não é necessário para o ChatGPT Search |
| ClaudeBot | **Disallow** | Treinamento |
| Google-Extended | **Disallow** | Usos de IA além da Busca. **Não** afeta AI Overviews |

`Google-Extended` e `Applebot-Extended` não têm user-agent próprio: são tokens
de robots.txt, verificados por `checkRobotsTokens`, não por requisição.

Um `allow` que devolve 200 com menos de 100 palavras **falha** — casca de SPA
vazia não conta como acesso.

---

## 7. Indexação

- **Google:** sitemap, links internos, Search Console e crawl normal. A
  Indexing API **não** é usada: ela é oficialmente para `JobPosting` e
  `BroadcastEvent` em `VideoObject`. Blog não se enquadra e não haverá
  workaround.
- **Bing e parceiros:** IndexNow, disparado só quando a URL foi criada,
  atualizada ou removida.

---

## 8. Observabilidade

Toda execução grava em `job_runs`: `jobId`, `jobType`, `status`, `attempt`,
`inputHash`, `outputHash`, `provider`, `costUsd`, `publishedUrl`, `error`,
início e fim. Nenhum job falha em silêncio.

Publicações vão para `publishing_events`, com `commitSha` e status do IndexNow —
é o que permite rollback rastreável.

---

## 9. Idempotência

- `articles.content_hash` é **unique**: o mesmo conteúdo não vira dois artigos.
- `articles.slug` é **unique**.
- `gsc_daily`, `ga4_daily`, `keyword_snapshots`, `serp_results`, `page_metrics`
  têm unique por (dia + chaves): reprocessar não duplica.
- IndexNow compara hash antes de enviar.

---

## 10. Rodar

```bash
cd organic-engine
npm install
npm test                       # 98 testes
node src/cli.mjs health        # estado dos providers
node src/cli.mjs crawlers      # matriz de acesso
node src/cli.mjs gates <file>  # gates + score de um artigo
```

---

## 11. Não configurado ainda

`node src/cli.mjs health` reporta 0/9 providers configurados e Postgres
ausente. Os adapters, testes e healthchecks estão prontos; falta credencial.
Ver `docs/SECRETS_REQUIRED.md`.

---

## 12. Rollback

Toda publicação é um commit. Se o pós-deploy falhar em healthcheck, rota,
canonical, sitemap ou HTML, reverter é `git revert` do commit da publicação,
registrado em `publishing_events`. Produção nunca fica quebrada esperando
intervenção manual.
