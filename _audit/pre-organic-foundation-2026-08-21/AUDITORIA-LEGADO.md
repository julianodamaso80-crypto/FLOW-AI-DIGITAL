# Auditoria do legado — o que reaproveitar

Auditoria profunda de `seo-autopilot`, `SEO SITES` e `mcp-gtm`, comparada ao
`organic-engine` que já existe. Objetivo: aproveitar o melhor, não reescrever.

---

## 1. `~/PROJETOS/PROJETO SEO/seo-autopilot`

**O que é:** SaaS multi-tenant de SEO para clientes. Next.js 16, tRPC, Drizzle,
NextAuth, Stripe, publicação em WordPress. 12 tabelas, 20 arquivos em
`src/server`, 2.674 linhas nos serviços.

### Comparação componente a componente

| Componente | Organic Engine | seo-autopilot | Melhor | Ação |
|---|---|---|---|---|
| Schema / banco | 19 tabelas, focadas em SEO orgânico | 12 tabelas, focadas em SaaS (workspaces, billing, wp_connections) | **Engine** | KEEP_CURRENT |
| Retry / backoff | `withRetry` com jitter, 4xx permanente, Retry-After | **0 ocorrências** de retry/backoff | **Engine** | KEEP_CURRENT |
| Idempotência | unique por hash e slug, `sendOnce`, `idempotencyKey` | **0 ocorrências** de idempotência/hash | **Engine** | KEEP_CURRENT |
| Controle de custo | `CostLedger` + `BudgetGuard` + custo por endpoint | 4 menções a "cost", sem ledger nem teto | **Engine** | KEEP_CURRENT |
| Observabilidade | `job_runs` com attempt, hashes, erro, custo | Sentry no `package.json`, **0 `captureException`** no código | **Engine** | KEEP_CURRENT |
| Hard gates | 10 gates (demanda, canibalização, fontes, alucinação…) | nenhum | **Engine** | KEEP_CURRENT |
| Quality score | 12 dimensões ponderadas, 0..1 contínuo | 6 checagens binárias tudo-ou-nada | **Engine** | KEEP_CURRENT |
| Scheduler | pg-boss, testado em integração | `trigger.ts` com **7 linhas** — só `configure()`, nenhum job | **Engine** | DISCARD_LEGACY |
| Pipeline de geração | ainda não escrito | `pipeline.ts` + `contentGenerationService.ts`: outline → seções → FAQ → meta | **autopilot** | **PORT_FROM_AUTOPILOT** |
| Internal linking | gate valida, mas não sugere | `resolveInternalLinks`: pillar pai + 3 do cluster + 2 pillars cross, teto de 6 | **autopilot** | **PORT_FROM_AUTOPILOT** |
| Referência de extensão | agora por intenção | mínimo **por tipo de página** (pillar 3000, cluster 800, faq 500) | **autopilot** | **MERGE** (ideia adotada) |
| Keyword research | DataForSEO com volume, ideas, intent, gap | DataForSEO só `search_volume` | **Engine** | KEEP_CURRENT |
| Análise de SERP | via DataForSEO | scraping do Google via `r.jina.ai` | **Engine** | DISCARD_LEGACY |
| Publisher | Git + Cloudflare Pages | WordPress REST | **Engine** | DISCARD_LEGACY |
| Auth / billing | não precisa | NextAuth + Stripe | — | DISCARD_LEGACY |

### Veredito

O `seo-autopilot` **não** é uma base melhor que o Engine atual: falta-lhe
exatamente o que sustenta automação confiável — retry, idempotência, custo,
observabilidade e gates. A recomendação da rodada anterior ("candidato a base do
Engine") estava **errada** e fica corrigida aqui.

O que vale portar são **duas peças de conteúdo**, não a arquitetura:

1. `resolveInternalLinks` — a lógica de cluster (pillar pai, irmãos, cross-cluster).
2. O encadeamento outline → seções → FAQ → refinar meta, do `contentGenerationService`.

E uma ideia: **referência de extensão por tipo/intenção**, que já foi incorporada
ao `thinnessScore`.

**Trigger.dev fica de fora.** Além de acoplar a um serviço na nuvem, no legado ele
nunca saiu do `configure()` — não há job para portar.

---

## 2. `~/PROJETOS/SEO SITES`

**O que é:** projeto Django/Python com RAG (`ai_context/`), agente Claude,
chunking semântico e embeddings. O `ARCHITECTURE.md` descreve geração de páginas
por combinação serviço × cidade.

| Item | Avaliação | Ação |
|---|---|---|
| Estratégia serviço × cidade em massa | É exatamente o *scaled content abuse* que a política do projeto proíbe | **DISCARD_LEGACY** |
| Sitemap auto-update | Conceito válido, mas o Engine já gera sitemap das rotas reais | KEEP_CURRENT |
| Geração com Claude API | O Engine usa OpenRouter, com ledger e budget | KEEP_CURRENT |
| `ai_context/` (chunking + embeddings + RAG) | Interessante para pesquisa de fonte no futuro | **AVALIAR DEPOIS** — não nesta fase |
| Stack Python/Django | Engine é Node; misturar runtime não se paga aqui | DISCARD_LEGACY |

**Nada foi portado.** A parte de RAG fica anotada para quando a etapa de
`SOURCE RESEARCH` do pipeline precisar de recuperação semântica.

---

## 3. `~/PROJETOS/mcp-gtm`

**O que é:** MCP de GTM e Google Ads, com OAuth Google funcionando.

| Item | Achado | Ação |
|---|---|---|
| `credentials/token.json` | OAuth com **refresh_token válido**; access_token expirou em 01/06/2026 | não reutilizar diretamente |
| Escopos do token | `tagmanager.*`, `adwords`, `analytics.edit` | **não servem** — faltam `webmasters.readonly` e `analytics.readonly` |
| `GOOGLE_OAUTH_CLIENT_ID` / `_SECRET` | OAuth client próprio, já registrado no Google Cloud | **REUTILIZÁVEL** — evita criar novo projeto no Cloud |
| Padrão `auth.ts` / `auth-cli.ts` | Fluxo OAuth com refresh e token store em arquivo | **PORT_FROM_LEGACY** quando GSC/GA4 entrarem |
| `GA4_MEASUREMENT_ID` e `GA4_PROPERTY_ID` | **Preenchidos, mas de `meucaixa.ia.br`** | **NÃO USAR** |

### Alerta importante

Os IDs de GA4 encontrados pertencem ao **MeuCaixa**, não à FlowAI — confirmado
pelo `GA4_STREAM_URL` (`https://meucaixa.ia.br`). Usá-los enviaria os dados da
FlowAI para a propriedade de outro negócio e contaminaria os dois relatórios.

**A FlowAI precisa de propriedade GA4 própria.** O que dá para reaproveitar é o
*OAuth client*, não os identificadores.

---

## 4. Postgres reutilizável

Varredura nos `.env` de todos os projetos: **nenhum Postgres compartilhável e
isolável** foi encontrado (só `localhost` em arquivos de exemplo).

Decisão: Postgres local próprio via `organic-engine/docker-compose.yml`, porta
5433 para não colidir. Já rodando, com as 19 tabelas migradas e 17 testes de
integração passando.

Quando for para produção, criar **banco ou schema dedicado** — nunca reaproveitar
tabela de sistema em produção de outro projeto.

---

## Resumo das ações

| Ação | Itens |
|---|---|
| KEEP_CURRENT | schema, retry, idempotência, custo, observabilidade, gates, score, scheduler, keyword research |
| PORT_FROM_AUTOPILOT | `resolveInternalLinks`; encadeamento outline → seções → FAQ → meta |
| MERGE | referência de extensão por tipo/intenção (já incorporada ao `thinnessScore`) |
| PORT_FROM_LEGACY | padrão de OAuth do `mcp-gtm` + reuso do OAuth client |
| DISCARD_LEGACY | Trigger.dev, WordPress publisher, Stripe/auth, SERP via `r.jina.ai`, páginas serviço × cidade, IDs GA4 do MeuCaixa |
| AVALIAR DEPOIS | RAG/embeddings do `SEO SITES` para pesquisa de fonte |
