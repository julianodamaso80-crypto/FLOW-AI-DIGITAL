# Segredos necessários

Só **nomes e finalidade**. Nenhum valor entra neste arquivo, nunca.

Estado verificado em 21/08/2026 com `node organic-engine/src/cli.mjs health`.

## Publicação e infraestrutura

| Nome | Finalidade | Obrigatório | Onde criar | Permissão mínima | Configurado |
|---|---|---|---|---|---|
| `EASYPANEL_DEPLOY_URL` | URL completa do webhook de deploy, token incluso | Sim, se o EasyPanel seguir em uso | GitHub → Settings → Secrets → Actions | — | **Não** |
| `CLOUDFLARE_API_TOKEN` | Ler e ajustar regras de bot/WAF da zona | Sim | Cloudflare → My Profile → API Tokens | `Zone.Zone:Read` + `Zone.WAF:Edit`. **Nunca Global API Key** | Não |
| `CLOUDFLARE_ZONE_ID` | Identifica a zona `flowaidigital.com.br` | Sim | Cloudflare → Overview da zona | leitura | Não |
| `CLOUDFLARE_ACCOUNT_ID` | Operações de conta (Pages) | Opcional | Cloudflare → Overview | leitura | Não |
| `DATABASE_URL` | Postgres do Organic Engine (dados + fila pg-boss) | Sim | Supabase, Neon ou Postgres no VPS | usuário da própria base | Não |
| `GITHUB_APP_ID` | Publicação versionada de artigos | Depois | GitHub → Developer settings → GitHub Apps | `contents:write` no repo | Não |
| `GITHUB_APP_PRIVATE_KEY` | Chave da GitHub App | Depois | idem | idem | Não |

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

**AÇÃO EXTERNA NECESSÁRIA: ROTACIONAR EASYPANEL DEPLOY TOKEN**

O token anterior esteve em texto claro em `.github/workflows/deploy.yml`, em
repositório **público**, e trafegava por HTTP sem TLS. Removê-lo do arquivo
**não basta** — ele permanece no histórico do Git e possivelmente em caches
públicos. Passos:

1. Gerar novo token de deploy no EasyPanel (o antigo deve ser invalidado).
2. Cadastrar a URL completa nova em: GitHub → Settings → Secrets and variables
   → Actions → **`EASYPANEL_DEPLOY_URL`**.
3. Colocar o painel `31.97.30.227:3000` atrás de TLS e restringir origem.

Sem o passo 1 o token antigo continua válido para qualquer pessoa que leia o
histórico do repositório.
