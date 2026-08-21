---
data: 2026-08-21
projeto: FlowAI Digital
tags: [ga4, analytics, gsc, gtm, oauth, release-gate, evidencia]
tipo: aprendizado
---

# GA4 e OAuth — o que está provado e o que continua sem prova

## Contexto

O relatório anterior afirmou `FLOWAI_GA4 = NOT_CONFIGURED`. A afirmação era mais
forte que a evidência: eu havia buscado em arquivos locais e não encontrado
`GA4_MEASUREMENT_ID`. Isso prova que **o ID não está no `.env`** — não prova que
a propriedade não existe na conta Google. Buscar em arquivo não é prova de
inexistência de recurso na nuvem.

Uma revisão externa apontou depois um segundo erro, mais grave, no próprio
fluxo de autorização. Ambos estão corrigidos abaixo.

---

## 1. O OAuth client é Web Application, não Desktop

### O erro

Escrevi que "o client é do tipo App para computador (Desktop), então o Google
aceita redirect para loopback — não é preciso registrar URI de callback", e
implementei `server.listen(0)`, porta efêmera.

O client **"GOOGLE ANALYTICS" é do tipo Aplicativo da Web**, conforme o Google
Cloud Console. Eu nunca verifiquei isso; assumi.

### Por que isso quebrava tudo

Para client Web, o `redirect_uri` precisa bater **exatamente** com um URI
cadastrado no Console. Porta efêmera gera um redirect diferente a cada execução:

| Execução | redirect_uri gerado |
|---|---|
| 1ª | `http://127.0.0.1:64630/callback` |
| 2ª | `http://127.0.0.1:55393/callback` |

Nenhum dos dois estava cadastrado. As duas janelas de autorização que abri
**teriam falhado com `redirect_uri_mismatch` mesmo se o usuário clicasse** — e o
erro só apareceria depois do consentimento, na troca do código.

Ou seja: as duas expirações não foram só falta de clique. O fluxo estava quebrado.

### A correção

Host, porta e caminho agora são constantes exportadas, e o mesmo valor alimenta
a URL de consentimento, o servidor e a troca do código:

```
OAUTH_HOST   = 127.0.0.1
OAUTH_PORT   = 8765
OAUTH_PATH   = /callback
REDIRECT_URI = http://127.0.0.1:8765/callback
```

Porta ocupada é **erro** (`OAUTH_PORT_IN_USE`), nunca motivo para escolher outra:
qualquer outra porta não está cadastrada, e a falha só apareceria com o usuário
já na tela do Google.

`prompt=consent` deixou de ser padrão em `buildAuthUrl` — quem precisa de refresh
token novo pede explicitamente. `access_type=offline` continua sempre.

### Registro cadastrado no Console

`http://127.0.0.1:8765/callback`, informado pelo usuário.

**`REDIRECT_URI_REGISTRATION = UNVERIFIABLE_PRE_LOGIN`.** Tentei provar
programaticamente comparando a resposta do Google para o redirect cadastrado
contra um inventado (`:9999`). Os dois devolveram `HTTP 302` para a tela de
login, sem `redirect_uri_mismatch`: o Google só valida o redirect **depois** da
autenticação. A checagem não distingue os casos, então não serve como prova. O
cadastro se apoia na evidência do Console mostrada pelo usuário.

---

## 2. GA4 no site: provado

Não é busca em repositório. São os bytes que o navegador recebe:

| Recurso | HTTP | Bytes | gtag / GTM / dataLayer / Pixel |
|---|---|---|---|
| `https://flowaidigital.com.br/` | 200 | 2.240 | nenhum |
| `/assets/flowai-enhancements.js` | 200 | 12.984 | nenhum |
| `/assets/index-C-j3JIV1.js` | 200 | 334.445 | nenhum |

Padrões procurados: `G-XXXXXXX`, `GTM-XXXX`, `UA-x-y`, `gtag`, `dataLayer`,
`googletagmanager`, `fbq`, `connect.facebook.net`, `analytics.js`, `clarity`,
`hotjar`, `plausible`, `umami`. **Zero ocorrências em 349.669 bytes.**

**`FLOWAI_GA4_SITE = VERIFIED_NOT_INSTALLED`**

---

## 3. GA4 na conta Google: não verificado

**`FLOWAI_GA4_PROPERTY = CLOUD_UNVERIFIED`**, bloqueado em
`GOOGLE_OAUTH_AUTHORIZATION_REQUIRED`.

As duas classificações são separadas de propósito: a propriedade pode existir na
conta e nunca ter sido instalada no site. Juntá-las numa frase só foi o erro
original.

Credenciais presentes: Client ID e Client Secret do OAuth client "GOOGLE
ANALYTICS", já existente. **Nenhum client novo foi criado.**
Credencial ausente: refresh token válido.

---

## 4. Refresh tokens antigos: causa desconhecida

Os dois tokens encontrados (`mcp-gtm/credentials/token.json` e
`MY IPHONE/mcp-gtm-myiphone/credentials/token.json`) devolvem `invalid_grant`.

**`OLD_REFRESH_TOKENS = INVALID_GRANT`**
**`CAUSA_EXATA_CONHECIDA = NO`**

Eu havia escrito "expiraram, comportamento normal de app em modo Testing". Isso
não se sustenta: `invalid_grant` sozinho não distingue entre token revogado pelo
usuário, expirado, limite de refresh tokens por client atingido, política
administrativa da organização, app em Testing, ou mudança de senha da conta. A
causa só se estabelece consultando o Publishing Status — que não consultei.

O código agora propaga o código de erro cru do Google, sem interpretar, e há
teste que trava isso.

---

## 5. OAuth consent screen

**`OAUTH_PUBLISHING_STATUS = UNKNOWN`**

Não há API pública de leitura da configuração do consent screen acessível com os
escopos que tenho (`analytics.readonly`, `webmasters.readonly`,
`tagmanager.readonly`). Ler `User Type`, `Publishing Status` e `Test Users`
exigiria escopo `cloud-platform` — que eu não peço e não vou pedir sem
autorização explícita. Nada foi alterado.

**Condicional, para quando o status for conhecido:** se `Testing`, registrar
`REFRESH_TOKEN_LONG_TERM_RISK = 7_DAY_EXPIRATION`, porque os escopos pedidos são
sensíveis (`analytics.readonly`, `webmasters.readonly`, `tagmanager.readonly`) e
não apenas `openid`/`profile`/`email`. **Não mudar para Production
automaticamente** — a estratégia de autenticação permanente é decisão do
arquiteto.

---

## 6. Estado real das APIs — corrigido

Projeto `flow-ai-445618`, number `503203012274`.

| API | Estado | Evidência |
|---|---|---|
| Analytics Admin | `ENABLED` | responde "requires OAuth", não `SERVICE_DISABLED` |
| Analytics Data | `ENABLED` | idem |
| Search Console | `ENABLED` | idem |
| Tag Manager | `ENABLED` | idem |
| CrUX | **`SERVICE_DISABLED`** | `HTTP 403`, `PERMISSION_DENIED`, reason `SERVICE_DISABLED`, mensagem cita o projeto `503203012274` |
| PageSpeed Insights | **`API_KEY_RESTRICTED`** | ver abaixo |

### Correção do PageSpeed

Eu havia classificado PageSpeed como `SERVICE_DISABLED`. Estava errado — aquilo
era o resultado do CrUX. O PageSpeed devolvia `HTTP 403`, e 403 sozinho não diz
o motivo. Reexecutado:

| Chamada | HTTP | status | reason |
|---|---|---|---|
| com API key | 403 | `PERMISSION_DENIED` | **`API_KEY_SERVICE_BLOCKED`** |
| sem API key | 429 | `RESOURCE_EXHAUSTED` | `RATE_LIMIT_EXCEEDED` |

A mensagem com key: *"Requests to this API pagespeedonline method
...RunPagespeed are blocked."*

A leitura das duas juntas: o serviço **não** está desabilitado — sem key ele
responde e só esbarra na cota anônima compartilhada. O que bloqueia é uma
**restrição de serviço na própria API key**, que não inclui
`pagespeedonline.googleapis.com`.

**`PAGESPEED = API_KEY_RESTRICTED`** — corrigível liberando o serviço na
restrição da key, sem habilitar API nenhuma. Nada foi alterado.

Nenhuma API key aparece neste documento; as mensagens de erro foram sanitizadas
antes de qualquer registro.

---

## 7. Consequência para o release

**GA4 permanece PRE-PRODUCTION GATE.**

É verdade que o site atual não coleta nada, e que `site/lib/analytics.mjs` por
construção não injeta nada sem Measurement ID real — sem ID, a página sai sem
analytics, de propósito, sem gerar ID fictício.

Mas o objetivo do Organic Growth Engine é **medir desde a entrada da nova
fundação em produção**. Publicar sem GA4 significa perder a linha de base do
próprio lançamento, que não se recupera depois. Minha conclusão anterior
("publicar sem GA4 não tem consequência prática") olhava só para o site de hoje
e ignorava isso.

Não publicar produção até saber:

- se já existe propriedade FlowAI;
- se já existe data stream para `flowaidigital.com.br`;
- qual é o `GA4_PROPERTY_ID`;
- qual é o `GA4_MEASUREMENT_ID`.

---

## 8. Como desbloquear (uma vez)

```
cd organic-engine
node src/cli.mjs google-auth --timeout-min=45
node src/cli.mjs google-discover
```

O primeiro imprime a URL de consentimento e sobe o servidor em
`http://127.0.0.1:8765/callback`. O refresh token vai para
`%APPDATA%/flowai/google-oauth-token.json`, modo 0600, fora do repositório e
fora de qualquer `.env` versionado.

O segundo lista contas e propriedades GA4, data streams (é onde mora o
Measurement ID), sites do Search Console e containers do GTM. Nada cria, nada
altera. O que decide se a propriedade é da FlowAI é principalmente o
`defaultUri` do data stream — não o nome da propriedade.

---

## 9. Observação que não é tarefa

A home vende a squad "Tracking & Analytics — cada clique medido" e tem uma seção
inteira comparando Meta Pixel / GTM / GA4. O próprio site não mede clique nenhum.
Registro o fato; a decisão é do dono.

---

## Links relacionados

- [[RELEASE-CONTENT-GATE]]
- [[CORRECOES-AO-RELATORIO-ANTERIOR]]
