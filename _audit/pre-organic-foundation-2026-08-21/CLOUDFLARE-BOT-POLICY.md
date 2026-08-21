# Política de crawlers na borda — Cloudflare

**Zona:** `flowaidigital.com.br` · `3b4e53549651e15dd726d1231b75bbe1`
**Conta:** PROJETOS · `940f2310a6b883c45a40d2ab2bcb28d6` · plano Free Website

---

## Correção de uma conclusão anterior

Eu havia escrito que **"o controle granular não está disponível no plano Free"**.
Isso **não se sustenta** com a evidência que tenho.

O que realmente aconteceu: `PUT /zones/{id}/bot_management` devolveu **HTTP 400**
ao receber `ai_search`, `ai_user` e `ai_training`. O `GET` do mesmo endpoint
**retorna** esses campos, mas retornar num GET não significa que sejam graváveis
por ali.

A conclusão correta e mais estreita:

> Esses campos **não são um caminho de escrita suportado/documentado neste
> endpoint para esta zona**. Isso não prova nada sobre a disponibilidade do AI
> Crawl Control no plano Free.

Pelo que a documentação da Cloudflare estabelece, o AI Crawl Control existe em
todos os planos; no Free a identificação de AI crawlers é por **User-Agent**, o
dashboard permite Allow/Block por crawler, e os bloqueios se materializam como
**WAF custom rules** — que é exatamente o mecanismo que usamos aqui.

---

## Estado inicial (lido antes de qualquer escrita)

```json
{
  "enable_js": false,
  "fight_mode": false,
  "ai_bots_protection": "block",
  "content_bots_protection": "disabled",
  "crawler_protection": "disabled",
  "ai_training": "disabled",
  "ai_search": "disabled",
  "ai_user": "disabled",
  "is_robots_txt_managed": true,
  "cf_robots_variant": "off",
  "ai_bots_migration_opt_out": false,
  "using_latest_model": true
}
```

Rulesets da zona: apenas três managed — `http_request_sanitize`,
`http_request_firewall_managed`, `ddos_l7`. **Nenhuma WAF custom rule.**

**Causa do 403:** `ai_bots_protection: "block"`, que bloqueia todo AI bot sem
distinguir busca de treinamento. Não era Bot Fight Mode (`false`), não era
crawler protection (`disabled`) e não era WAF (não existia regra).

---

## Alterações aplicadas

| # | O quê | De | Para |
|---|---|---|---|
| 1 | `ai_bots_protection` | `"block"` | `"disabled"` |
| 2 | WAF custom rule | não existia | 1 regra `block` |

**Motivo da sequência:** sozinho, o passo 1 liberava **tudo**, inclusive os
crawlers de treinamento. A regra WAF do passo 2 devolve o bloqueio apenas a
eles. Foi o caso concreto em que o WAF era necessário — não substituto de
Bot Management, mas complemento.

### A regra

```
nome:  FlowAI - AI Training Crawlers Block - code managed
ação:  block
expr:  (lower(http.user_agent) contains "gptbot"
        or lower(http.user_agent) contains "claudebot"
        or lower(http.user_agent) contains "ccbot")
       and not (lower(http.user_agent) contains "claude-searchbot"
        or lower(http.user_agent) contains "claude-user"
        or lower(http.user_agent) contains "oai-searchbot"
        or lower(http.user_agent) contains "chatgpt-user")
```

**Por que a exclusão explícita existe — e por que ela não é decorativa:**

A primeira versão usava `contains "claudebot"` sem exclusão. Isso **bloqueou o
Claude-SearchBot e o Claude-User**, porque o user-agent deles carrega
`+claudebot@anthropic.com` no e-mail de contato — o `contains` casou com o
e-mail, não com o token de produto. A regressão foi detectada na matriz de
crawlers e corrigida na mesma execução.

A exclusão também torna a regra robusta sem depender da barra em `ClaudeBot/`,
que era a fragilidade da versão original.

### Avisos operacionais

- Esta regra foi criada **por código**, via API de rulesets. Alterações diretas
  de WAF **podem não aparecer refletidas** no painel do AI Crawl Control — quem
  olhar o dashboard não verá esses bloqueios listados lá.
- O nome traz `code managed` justamente para que ninguém a confunda com uma
  regra gerada pelo dashboard.
- `is_robots_txt_managed` continua `true`: a Cloudflare segue injetando o bloco
  gerenciado no `robots.txt`, que também declara `Disallow` para os crawlers de
  treinamento. Bloqueio na borda e declaração no robots convivem.

---

## Estado verificado após as alterações

| Crawler | Política | HTTP |
|---|---|---|
| Googlebot | allow | 200 |
| Bingbot | allow | 200 |
| OAI-SearchBot | allow | 200 |
| ChatGPT-User | allow | 200 |
| Claude-SearchBot | allow | 200 |
| Claude-User | allow | 200 |
| PerplexityBot | allow | 200 |
| Perplexity-User | allow | 200 |
| **GPTBot** | **deny** | **403** |
| **ClaudeBot** | **deny** | **403** |

`Google-Extended` não entra nesta tabela: é **product token de robots.txt**, não
um crawler com user-agent próprio. Continua `Disallow` no robots.

---

## Reversão

O estado anterior está registrado acima. Para voltar:

1. `PUT /zones/{zone}/bot_management` com `ai_bots_protection: "block"`.
2. Apagar a regra do ruleset `http_request_firewall_custom`.

O comando `applyPolicy` do Engine já reverte sozinho se, após aplicar, detectar
que algum crawler de treinamento escapou.
