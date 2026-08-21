# Release content gate — 13 money pages

**Data:** 21/08/2026 · **Fonte:** artefato gerado pelo GitHub Actions (run 32525976441)

Auditoria semântica do conteúdo real, não apenas HTTP 200 e contagem de palavras.

## Matriz

| PAGE | SERVICE VALID | CLAIMS | UNSUPPORTED | DUPLICATION | INTENT | CANNIBALIZATION | PT-BR | CTA | RESULT |
|---|---|---|---:|---|---|---|---|---|---|
| `agencia-de-marketing-digital` | sim | 1 falso positivo | 0 | 0 parágrafos idênticos | marketing | não | ok | coerente | **PASS** |
| `gestao-de-trafego-pago` | sim | nenhum | 0 | 0 parágrafos idênticos | marketing | não | ok | coerente | **PASS** |
| `seo-e-conteudo` | sim | nenhum | 0 | 0 parágrafos idênticos | marketing | não | ok | coerente | **PASS** |
| `sites-e-landing-pages` | sim | nenhum | 0 | 0 parágrafos idênticos | marketing | não | ok | coerente | **PASS** |
| `tracking-e-analytics` | sim | 1 falso positivo | 0 | 0 parágrafos idênticos | marketing | não | ok | coerente | **PASS** |
| `agencia-de-inteligencia-artificial` | sim | nenhum | 0 | 0 parágrafos idênticos | ia | não | ok | coerente | **PASS** |
| `automacao-de-processos-com-ia` | sim | nenhum | 0 | 0 parágrafos idênticos | ia | não | ok | coerente | **PASS** |
| `agentes-de-ia-para-empresas` | sim | nenhum | 0 | 0 parágrafos idênticos | ia | não | ok | coerente | **PASS** |
| `chatbot-com-ia-para-whatsapp` | sim | nenhum | 0 | 0 parágrafos idênticos | ia | não | ok | coerente | **PASS** |
| `desenvolvimento-de-sistemas-personalizados` | sim | 2 falsos positivos | 0 | 0 parágrafos idênticos | sistemas | não | ok | coerente | **PASS** |
| `desenvolvimento-de-saas-e-mvp` | sim | nenhum | 0 | 0 parágrafos idênticos | sistemas | não | ok | coerente | **PASS** |
| `crm-personalizado-e-automacao-de-vendas` | sim | nenhum | 0 | 0 parágrafos idênticos | sistemas | não | ok | coerente | **PASS** |
| `integracoes-de-sistemas-e-apis` | sim | nenhum | 0 | 0 parágrafos idênticos | sistemas | não | ok | coerente | **PASS** |

**13/13 PASS. Nenhum HOLD. Nenhuma correção foi necessária.**

## Claims — classificação

Quatro trechos dispararam os detectores. Todos inspecionados manualmente e
classificados como **SAFE_GENERIC** — são, na verdade, exemplos de honestidade
editorial:

| Página | Trecho | Contexto real | Classificação |
|---|---|---|---|
| agencia-de-marketing-digital | "Garantimos" | *"Não prometemos números garantidos — desconfie de quem promete. Garantimos **método**, transparência nos dados e ajustes contínuos"* | SAFE_GENERIC |
| tracking-e-analytics | "100%" | *"É possível atribuir 100% das vendas? **Não**, e desconfie de quem promete isso"* — a página **nega** o claim | SAFE_GENERIC |
| desenvolvimento-de-sistemas-personalizados | "90%" | *"Se um software pronto resolve 90% do seu processo…"* — critério hipotético de decisão, não estatística de resultado | SAFE_GENERIC |
| desenvolvimento-de-sistemas-personalizados | "o melhor" | *"…provavelmente é o melhor caminho"* — referindo-se a usar software pronto, ou seja, recomendando **não** contratar a FlowAI | SAFE_GENERIC |

**Zero UNSUPPORTED.** Nenhum número de resultado, nenhum valor financeiro,
nenhum prazo garantido, nenhum depoimento, nenhum case, nenhum nome de cliente,
nenhuma estatística sem fonte, nenhuma comparação absoluta em favor da FlowAI.

Isso não é acaso: o `CONTEUDO-PENDENTE.md` do redesign registra a remoção
deliberada de "129 agentes", "resposta em 5 minutos", "80% dos leads morrem",
CPAs simulados e **4 depoimentos fictícios com fotos de randomuser.me**. A
política sobreviveu ao porte.

## Duplicação — body-to-body

Comparação do corpo editorial (H1, hero, problemas, entregáveis, processo, FAQ),
ignorando nav, rodapé, CTA padrão e breadcrumbs:

- **Parágrafos idênticos entre páginas: 0**
- **Similaridade máxima: 13%** — entre `agencia-de-marketing-digital` e
  `gestao-de-trafego-pago`, que são pilar-mãe e filha do mesmo cluster
- Nenhuma página é "a mesma com a keyword trocada"

## Canibalização

Sem nova chamada ao DataForSEO. Usando os dados já adquiridos e o conteúdo:

- **H1 duplicados: 0**
- **metaTitle duplicados: 0**
- Cada página responde uma intenção distinta
- O risco registrado no `MAPA-SEO.md` entre `/agencia-de-inteligencia-artificial/`
  e `/agentes-de-ia-para-empresas/` segue mitigado: a primeira é institucional
  do pilar, a segunda é página de produto

**Nenhum HOLD por sobreposição.**

## Structured data

- **Organization: 1 variante em 15 páginas** — mesmo `@id`, mesmo nome, mesmo
  logo, mesmo telefone. `sameAs` **ausente**, porque nenhum perfil social foi
  confirmado pelo dono (o Instagram segue `confirmed: false` em `site/lib/site.mjs`).
- **WebSite: 1 variante em 15 páginas**, com `publisher` apontando para o `@id`
  da Organization.
- **FAQPage: 13/13** com pergunta **e** resposta batendo com o conteúdo visível.
  Nenhuma FAQ inventada. Nenhum rich result é prometido — o valor aqui é semântico.

## Keywords candidatas — NÃO alteradas

As três trocas SAME_INTENT (`automação de processos`, `agente de ia`,
`chatbot whatsapp`) permanecem apenas candidatas. Nenhum H1 ou title foi
alterado nesta rodada.
