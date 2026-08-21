# Auditoria de afirmações — conteúdo publicado

Varredura do que está efetivamente no ar (`site/public/index.html` +
`assets/index-C-j3JIV1.js`, o build idêntico ao de produção).

## Resultado: aprovado, sem afirmação inventada

| Padrão procurado | Ocorrências | Veredito |
|---|---|---|
| "129 agentes" | 0 | limpo |
| "12 squads" | 0 | limpo |
| Percentuais em texto | 0 | limpo |
| Valores em R$ | 0 | limpo |
| ROAS / CPA / CAC | 0 | limpo |
| "Nx mais/maior/melhor" | 0 | limpo |
| "garantimos" / "garantia" | 0 | limpo |
| "em N minutos" | 0 | limpo |
| Depoimentos / nomes de pessoa | 0 | limpo |
| "100%" | 6 | **falso positivo** — todas em CSS (`width:100%`, `bottom:100%`) do GSAP e de layout |

## Por que está limpo

O `CONTEUDO-PENDENTE.md` do redesign registra a remoção deliberada de
"129 agentes / 12 squads", "resposta em 5 minutos", "7 follow-ups",
"80% dos leads morrem sem segunda resposta", "atribuição de 100%", chats
simulados com CPA e faturamento, e **4 depoimentos fictícios com fotos de
randomuser.me**. A varredura confirma que essas remoções sobreviveram até o
build em produção.

## Logos de clientes — verificados

`images/clients/` traz 6 logos. Todos correspondem a projetos reais,
comprovados pela existência dos repositórios em `~/Documents/PROJETOS`:

| Logo | Projeto correspondente |
|---|---|
| `21go.png` | `21 GO/` |
| `abraseg.png` | `ABRASEG/` |
| `analise-web.png` | `ANALISIE WEB/` |
| `meu-caixa.png` | `CONTROLE FINANCEIRO/` (MeuCaixa) |
| `my-iphone.png` | `MY IPHONE/` |
| `zen-fiscal.png` | `zen-*/` |

**Ressalva:** existir o projeto comprova a relação de trabalho, **não** a
autorização de uso da marca no site. Confirmar autorização por escrito de cada
cliente antes de tratar isso como prova social permanente.

## Money pages portadas — política preservada

As 13 páginas de `services.mjs` vêm do `site-v8`, que já havia passado por essa
limpeza. Verificações do conteúdo portado:

- Nenhuma promessa de posição no Google.
- A página de tráfego afirma explicitamente que **não** garante resultado
  ("Não prometemos números garantidos — desconfie de quem promete").
- Nenhum número de performance, nenhum case com valor, nenhum depoimento.
- O schema não emite `AggregateRating`, `review`, `Offer`, `priceRange` nem
  `address` — coberto por teste automatizado.

## Pendências que continuam bloqueadas por falta de evidência

Herdadas do `CONTEUDO-PENDENTE.md`, ainda sem dado do dono:

1. CNPJ e razão social
2. Endereço físico (sem ele, nada de `LocalBusiness`)
3. Confirmação do handle do Instagram — por isso `sameAs` está **vazio** e o
   perfil está marcado `confirmed: false` em `site/lib/site.mjs`
4. E-mail público
5. Cases reais com autorização por escrito
6. Depoimentos reais com autorização de nome e foto
7. História da empresa (fundação, equipe, tempo de mercado)
