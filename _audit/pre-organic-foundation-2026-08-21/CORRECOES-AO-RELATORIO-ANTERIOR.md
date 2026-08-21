# Correções ao relatório de auditoria de 21/08/2026

Revalidação feita na missão de execução. Conclusões anteriores que estavam
**tecnicamente erradas**, com a evidência que as derruba.

---

## 1. "A origem do site em produção não existe no Git nem no disco" — ERRADO

**Onde está:** `FLOW AI DIGITAL/FlowAI-v5-3D-DESTRAVADO.zip` (raiz, 2,5 MB, não versionado).

**Por que a busca anterior falhou:** procurei arquivos soltos
(`find -name "flowai-enhancements*"`). O build estava **dentro de um zip**, que
`find` por nome não alcança.

**Prova de identidade com produção:**

| Arquivo | No zip | Em produção |
|---|---|---|
| `index.html` | 2.240 B | 2.240 B |
| `assets/index-C-j3JIV1.js` | 334.445 B | 334.445 B |
| `llms.txt` | 598 B | 598 B |
| `images/brand/flowai-logo.png` | 120.596 B | 120.596 B |

Os nomes com hash (`index-C-j3JIV1`, `index-BSC-maUi`) são idênticos — hash de
conteúdo do Vite não coincide por acaso.

**Ressalva honesta:** o zip é o **build**, não o código-fonte. `src/`,
`package.json` e os componentes React da SPA continuam não localizados.

---

## 2. "Hospedado no EasyPanel via Dockerfile + nginx" — ERRADO

**Produção roda em Cloudflare Pages.**

**Prova:** o build contém `_headers` e `_redirects`, convenções de Pages/Netlify.
Requisitar esses caminhos em produção devolve **2.240 bytes (o index.html)**, ou
seja, foram **consumidos pela plataforma** — um servidor estático comum os
serviria como texto.

Os três headers de `_headers` batem exatamente com os de produção:
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy: camera=(), microphone=(), geolocation=()`.

**Consequência:** o `Dockerfile`, o `site-v9/nginx.conf` e o
`.github/workflows/deploy.yml` (webhook EasyPanel) **não têm relação com o site
publicado**. O EasyPanel em `31.97.30.227` é infra separada (porta 80 → 301).

---

## 3. "Soft-404 causado pelo `try_files … /index.html` do nginx" — ERRADO

A causa raiz é a regra SPA catch-all do Cloudflare Pages:

    _redirects:
    /* /index.html 200

O `200` explícito é o que transforma toda URL inexistente em página válida.
O `nginx.conf` do repo nem está em execução.

---

## 4. "Bloqueio de bots = AI Crawl Control, Bot Fight Mode ou WAF" (genérico) — REFINADO

Sondagem de user-agent exclui WAF por substring:

| User-Agent | HTTP |
|---|---|
| UA canônico do GPTBot | 403 |
| `Mozilla/5.0 QualquerCoisa GPTBot outra coisa` | **200** |
| UA contendo "Claude" / "Perplexity" / "SearchBot" | **200** |
| Chrome normal / curl / UA vazio | 200 |
| Applebot | 200 |

Substring não dispara: o match é por **assinatura canônica de bot**, próprio do
controle gerenciado de AI bots da Cloudflare. Corpo do 403:
`"Your request was blocked."`

---

## 5. "ClaudeBot bloqueado" estava incompleto

O relatório testou só `ClaudeBot`. Reteste com os agentes corretos mostra que o
**search crawler também é bloqueado**:

    OAI-SearchBot     403        ChatGPT-User      403
    Claude-SearchBot  403        Claude-User       403
    PerplexityBot     403        Perplexity-User   403
    GPTBot            403        ClaudeBot         403
    Googlebot         200        bingbot           200

---

## 6. Afirmação sobre CSR — corrigida por orientação do dono

O relatório deu a entender que CSR impede indexação. **Google executa
JavaScript.** A formulação correta: a renderização adiciona uma etapa, pode
atrasar a descoberta, pode falhar, e **outros crawlers podem não executar JS**.
HTML completo é mais robusto — por isso o conteúdo crítico vai para SSG.

---

## 7. Google-Extended e AI Overviews — corrigida por orientação do dono

`Google-Extended` **não** é requisito para Search, AI Overviews ou AI Mode, que
usam o índice normal e os controles do Googlebot. Não será desbloqueado sob esse
argumento. `GPTBot` (treinamento) também permanece bloqueado — não é necessário
para o ChatGPT Search, que usa `OAI-SearchBot`.
