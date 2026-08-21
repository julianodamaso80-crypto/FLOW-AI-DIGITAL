# Segredos necessários

Só **nomes e finalidade**. Nenhum valor entra neste arquivo, nunca.

Estado verificado em 21/08/2026 com `node organic-engine/src/cli.mjs health`.

## Cloudflare — o bloqueio atual

**Correção de uma recomendação anterior:** eu havia dito que
`Zone.Zone:Read + Zone.WAF:Edit` bastava. **Não basta.** Cada capacidade exige
uma permissão própria, e WAF Edit **não** substitui Bot Management Write.

| Nome | Finalidade | Obrigatório | Configurado |
|---|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Ler a política de bots e publicar no Pages | Sim | **Não** |
| `CLOUDFLARE_ACCOUNT_ID` | Necessário para operações de Pages | Sim | **Não** |
| `CLOUDFLARE_ZONE_ID` | Identifica a zona `flowaidigital.com.br` | Sim | **Não** |
| `CLOUDFLARE_PAGES_PROJECT` | Nome do projeto Pages que serve o domínio | Sim | **Não** — ainda não identificado |

### Permissões do token, por capacidade

Criar em **Cloudflare → My Profile → API Tokens → Create Custom Token**.

| Capacidade | Permissão exata | Por quê |
|---|---|---|
| Publicar preview e produção | **Account · Cloudflare Pages · Edit** | `pages deploy` e leitura de projetos/deployments |
| Ler e ajustar a política de AI bots | **Zone · Bot Management · Edit** | `GET`/`PUT /zones/{id}/bot_management`. **WAF Edit não dá acesso a isto** |
| Ler configuração da zona | **Zone · Zone · Read** | identificar a zona e ler settings |
| Regra customizada, **só se necessário** | **Zone · WAF · Edit** | criar/alterar custom rules. Não pedir se o AI Crawl Control resolver |

**Recursos (escopo mínimo):**
- Account Resources: **apenas** a conta que contém o projeto Pages da FlowAI
- Zone Resources: **apenas** a zona `flowaidigital.com.br`

**Nunca usar Global API Key** — ela dá acesso irrestrito a toda a conta.

### Já existe autenticação parcial

Há sessão do Wrangler em `~/AppData/Roaming/xdg.config/.wrangler/config/default.toml`,
**expirada em 27/04/2026** e sem refresh possível. Os escopos que ela tinha
incluíam `pages:write` e `zone:read`, mas **não** `bot_management:write`.

Consequência prática: `wrangler login` num terminal interativo resolveria o
**deploy no Pages**, mas **não** o desbloqueio dos crawlers de IA. Para isso o
API Token com Bot Management Edit é obrigatório.

## Publicação e infraestrutura

| Nome | Finalidade | Obrigatório | Onde criar | Permissão mínima | Configurado |
|---|---|---|---|---|---|
| `DATABASE_URL` | Postgres do Organic Engine (dados + fila pg-boss) | Sim em produção | Supabase, Neon ou VPS | usuário da própria base | Local: **sim**, via `docker compose up -d` |
| `GITHUB_APP_ID` | Publicação versionada de artigos | **FUTURE_REQUIRED** | GitHub → Developer settings → GitHub Apps | `contents:write` no repo | Não — não é bloqueador desta fase |
| `GITHUB_APP_PRIVATE_KEY` | Chave da GitHub App | **FUTURE_REQUIRED** | idem | idem | Não |

> `EASYPANEL_DEPLOY_URL` **saiu da lista**. O webhook do EasyPanel não serve o
> site da FlowAI (que roda no Cloudflare Pages) e o workflow foi removido. O
> token antigo continua precisando de rotação — ver o fim deste documento.

## Google

| Nome | Finalidade | Obrigatório | Onde criar | Permissão mínima | Configurado |
|---|---|---|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Autenticação de GSC e GA4 | Sim | Google Cloud → IAM → Service Accounts | somente os escopos abaixo. **Nunca commitar o JSON** | Não |
| `GSC_SITE_URL` | Propriedade no Search Console | Sim | Search Console | — | Não |
| `GA4_PROPERTY_ID` | Propriedade do GA4 para a Data API | Sim | GA4 → Admin → Property Settings | Viewer | Não |
| `GA4_MEASUREMENT_ID` | Tag do site (formato `G-XXXXXXX`) | Sim | GA4 → Data Streams | — | Não |
| `GA4_API_SECRET` | Measurement Protocol (eventos server-side) | Opcional | GA4 → Data Streams → Measurement Protocol | — | Não |
| `GOOGLE_API_KEY` | PageSpeed Insights e CrUX | Sim | Google Cloud → Credentials | restrita às duas APIs | Não |

**Escopos do Google, mínimos:**

- Search Console leitura: `https://www.googleapis.com/auth/webmasters.readonly`
- Search Console escrita (só para submeter sitemap): `https://www.googleapis.com/auth/webmasters`
- GA4 leitura: `https://www.googleapis.com/auth/analytics.readonly`

A service account precisa ser **adicionada como usuário** na propriedade do
Search Console e do GA4 — criar a chave não basta.

## Providers de dados

| Nome | Finalidade | Obrigatório | Onde criar | Configurado |
|---|---|---|---|---|
| `DATAFORSEO_LOGIN` | Keyword, SERP, concorrentes, on-page | Sim | dataforseo.com | Existe no `.env` da raiz, **não** no ambiente do Engine |
| `DATAFORSEO_PASSWORD` | idem | Sim | idem | idem |
| `DATAFORSEO_MONTHLY_BUDGET_USD` | Teto mensal de gasto. Sem isso não há freio | Sim | definido por você | Não |
| `FIRECRAWL_API_KEY` | Captura de fonte para pesquisa | Opcional | firecrawl.dev | Existe no `.env` da raiz |
| `OPENROUTER_API_KEY` | Geração e revisão de conteúdo | Sim | openrouter.ai | Existe no `.env` da raiz |
| `INDEXNOW_KEY` | Notificar Bing e parceiros | Sim | você gera (32+ hex) e publica em `/<key>.txt` | Não |

## YouTube

| Nome | Finalidade | Obrigatório | Configurado |
|---|---|---|---|
| `YOUTUBE_API_KEY` | Leitura: busca, canais, estatísticas | Opcional | Não |
| `YOUTUBE_CLIENT_ID` | Upload (fase futura) | Não | Não |
| `YOUTUBE_CLIENT_SECRET` | Upload (fase futura) | Não | Não |
| `YOUTUBE_REFRESH_TOKEN` | Upload (fase futura) | Não | Não |

## Flags

| Nome | Finalidade | Padrão |
|---|---|---|
| `AUTO_PUBLISH` | Libera publicação automática quando todos os gates passam | `false` |

`AUTO_PUBLISH` só vai para `true` depois que: os gates técnicos estiverem 100%,
GSC conectado, produção sob controle, 404 correto, sitemap e robots corretos, os
crawlers de busca com acesso, e o pipeline tiver passado por dry runs.

## Ação externa pendente

### AÇÃO EXTERNA NECESSÁRIA: INVALIDAR O TOKEN DE DEPLOY DO EASYPANEL

**A gravidade é maior do que a estimada antes.** O servidor `31.97.30.227` não
hospeda a FlowAI — ele hospeda **outros negócios seus**. Confirmado nas notas de
projeto: ScaleAgente/Agentes Inteligentes, CONTADOR-NFSe, MeuCaixa e Meu Celular
Protegido usam esse mesmo EasyPanel.

Ou seja: um repositório **público** da FlowAI expôs, em texto claro, um token de
deploy de um painel que serve vários outros sistemas.

O workflow foi **removido** nesta rodada (o webhook não servia a FlowAI, que roda
no Cloudflare Pages). Mas remover o arquivo **não invalida o token** — ele segue
no histórico do Git e possivelmente em caches públicos.

Passos, em ordem:

1. **Invalidar/regenerar o token de deploy no EasyPanel.** Como o workflow saiu,
   não é preciso recadastrar nada — basta invalidar.
2. Colocar o painel `31.97.30.227:3000` atrás de TLS e restringir origem por IP.
3. Avaliar tornar o repositório `FLOW-AI-DIGITAL` privado, ou reescrever o
   histórico — **depois** dos passos 1 e 2, e com os bundles de backup em mãos
   (`_backups/repo-{interno,externo}-pre-organic-20260821.bundle`).

Enquanto o passo 1 não acontecer, qualquer pessoa que leia o histórico do
repositório pode disparar deploys nos serviços daquele painel.
