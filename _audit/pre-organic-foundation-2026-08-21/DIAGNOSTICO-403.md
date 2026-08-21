# Diagnóstico do 403 nos crawlers de IA — 21/08/2026

## Sintoma
OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot,
Perplexity-User, GPTBot e ClaudeBot recebem HTTP 403.
Googlebot e bingbot recebem 200.

## Resposta do bloqueio
    HTTP/1.1 403 Forbidden
    Content-Type: text/plain   (25 bytes)
    Server: cloudflare
    Referrer-Policy: same-origin
    X-Frame-Options: SAMEORIGIN
    corpo: "Your request was blocked."

## Sondagem do critério de match (read-only)
UA canônico do GPTBot ............................ 403
"Mozilla/5.0 QualquerCoisa GPTBot outra coisa" ... 200
UA contendo "Claude" ............................. 200
UA contendo "Perplexity" ......................... 200
UA contendo "SearchBot" .......................... 200
UA vazio / curl / Chrome normal .................. 200
Applebot (search da Apple) ....................... 200

## Conclusão
NÃO é WAF custom rule por substring de user-agent — substring não dispara.
O match ocorre pela ASSINATURA CANÔNICA do bot, comportamento característico
do Cloudflare AI Crawl Control / "Block AI bots" (managed).

Reforça a conclusão: o robots.txt servido contém um bloco
"BEGIN Cloudflare Managed content" listando exatamente esses agentes, com
Content-Signal: search=yes, ai-train=no, use=reference.

## Correção ao relatório de auditoria anterior
O relatório inferiu genericamente "AI Crawl Control, Bot Fight Mode ou WAF rule".
A sondagem exclui WAF por user-agent e aponta especificamente para o
controle gerenciado de AI bots da zona.

## Ação necessária
Ajustar no painel/API do Cloudflare para permitir os crawlers de BUSCA:
  OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User,
  PerplexityBot, Perplexity-User
mantendo bloqueados os de TREINAMENTO:
  GPTBot, ClaudeBot, CCBot, Bytespider, Google-Extended, meta-externalagent
