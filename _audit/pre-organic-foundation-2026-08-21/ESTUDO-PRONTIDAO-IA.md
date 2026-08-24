---
data: 2026-08-21
projeto: FlowAI Digital
tags: [geo, estudo, dado-proprio, crawler, originalidade]
tipo: aprendizado
---

# Prontidão para busca generativa — primeira medição

## Por que este estudo existe

O guia oficial do Google (15/05/2026) afirma que a única barra que subiu para
IA generativa é conteúdo **não-commodity, de primeira mão**. E cerca de **84%
das citações de IA vêm de fontes de terceiros**, não do próprio site.

As duas coisas apontam para o mesmo lugar: dado próprio resolve originalidade
E é o que atrai citação de terceiro. A FlowAI não tinha ativo assim. Este é o
primeiro.

## Método

- **Amostra**: domínios com resultado orgânico no Google Brasil (`location_code`
  2076, `language_code` pt, desktop, profundidade 20) para duas queries:
  "agencia de inteligencia artificial" e "automacao comercial com inteligencia
  artificial". Fonte: DataForSEO SERP live advanced, 2026-08-21.
- **Exclusão**: `flowaidigital.com.br` foi retirado da amostra. Medir a si mesmo
  enviesa o número que se pretende publicar.
- **Medição**: requisição à home de cada domínio com o user-agent
  `OAI-SearchBot` — o crawler de **resposta** da OpenAI, que alimenta citação,
  e não o `GPTBot` de treino. Medir com user-agent de navegador não
  responderia à pergunta.
- **Classificação**: `BLOCKED` (401/403), `EMPTY_SHELL` (2xx com menos de 100
  palavras visíveis), `OK` (2xx com conteúdo), `ERROR` (5xx, timeout, recusa de
  conexão).
- **Denominador**: sites em `ERROR` saem do cálculo. Contá-los como bloqueio
  inventaria um bloqueio que não existe.

n = 33 medidos, 1 excluído por erro (`totvs.com`).

## Resultado

| Categoria | % da amostra |
|---|---|
| Entregam conteúdo real ao crawler de IA | **81,8%** |
| Bloqueiam o crawler por completo | **12,1%** |
| Respondem 200 com casca vazia (< 100 palavras) | **6,1%** |
| Declaram entidade em JSON-LD | **81,8%** |
| Publicam FAQ estruturado | **24,2%** |

Bloqueiam: `lenovo.com`, `agenciamural.org.br`, `ibm.com`, `v4company.com`.
Casca vazia: `brabaflow.ai`, `youtube.com`.

## Leitura honesta

O resultado **não** é o que seria conveniente. A narrativa fácil seria "o
mercado inteiro está quebrado"; a medição diz que 4 em cada 5 sites entregam
conteúdo normalmente e que schema já é maioria. Publicar o número conveniente em
vez do medido é o que destrói a credibilidade que o estudo existe para
construir.

O achado com valor real é outro, e é mais específico: **quase um quarto dos
sites que rankeiam nessas queries está invisível para busca generativa** —
12,1% por bloqueio explícito e 6,1% por entregar aplicação sem conteúdo
renderizado. E `FAQPage`, que a literatura associa a cerca de 3× mais citações,
está em apenas 24,2% deles.

## Nota de auto-inclusão

Na data desta medição, `flowaidigital.com.br` **pertenceria à categoria
`EMPTY_SHELL`**: responde HTTP 200 e entrega 7 palavras ao `OAI-SearchBot`. Foi
excluído da amostra por ser o objeto do estudo, não por conveniência — e o fato
está registrado aqui de propósito.

## Reprodução

```
node src/cli.mjs study        # quando o comando for exposto
```

Dados brutos por domínio: `estudo-prontidao-ia-2026-08-21.json`.

Rodar de novo em 90 dias transforma isto em série temporal, que é o que dá a um
estudo valor de citação recorrente.

## Links relacionados

- [[GA4-INVESTIGACAO]]
- [[CLOUDFLARE-BOT-POLICY]]

---

## Adendo — a FlowAI saiu da categoria `EMPTY_SHELL`

Medida de novo pelo critério deste estudo, logo após a publicação da fundação:

| | Antes | Depois |
|---|---|---|
| Veredito | `EMPTY_SHELL` | **`OK`** |
| Palavras entregues ao `OAI-SearchBot` | 7 | **1.035** |
| JSON-LD próprio | não | **sim** (`ProfessionalService` + `WebSite`, com `@id`) |
| URLs no sitemap | 2 | **15** |
| Caminho inexistente | HTTP 200 (soft-404 universal) | **HTTP 404** |

Isso a coloca nos 81,8% que entregam conteúdo real, e fora dos 6,1% de casca
vazia. A home ainda não publica `FAQPage` — as money pages publicam.
