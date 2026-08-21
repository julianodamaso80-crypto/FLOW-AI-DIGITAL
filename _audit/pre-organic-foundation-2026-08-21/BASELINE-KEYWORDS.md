# Baseline de keywords das 13 money pages

**Data:** 21/08/2026 · **Fonte:** DataForSEO (Google Ads search volume + search intent)
**Local:** Brasil (2076), português · **Custo real:** US$ 0,1067 · **Teto autorizado:** US$ 1,00

> Nenhuma página é descartada por volume baixo. Money page também sustenta
> arquitetura, conversão, entidade, links internos e long tail. O uso destes
> dados é otimizar title, H1 e termos secundários — não remover página.

## Resultado

| Página | Keyword atual | Volume | Intenção | Melhor alternativa | Volume alt. | Ação |
|---|---|---:|---|---|---:|---|
| agencia-de-marketing-digital | agência de marketing digital | **8.100** | comercial | — | — | MANTER |
| gestao-de-trafego-pago | gestão de tráfego pago | 1.000 | transacional | **gestor de tráfego** | **12.100** | OTIMIZAR |
| seo-e-conteudo | agência de seo | **1.300** | comercial | consultoria de seo | 880 | MANTER |
| sites-e-landing-pages | criação de sites profissionais | **1.300** | comercial | criação de landing pages | 480 | MANTER |
| tracking-e-analytics | tracking de campanhas | 0 | comercial | dashboard comercial | 320 | OTIMIZAR |
| agencia-de-inteligencia-artificial | agência de inteligência artificial | 10 | informacional | empresa de inteligência artificial | 170 | OTIMIZAR |
| automacao-de-processos-com-ia | automação de processos com ia | 70 | comercial | **automação de processos** | **1.000** | OTIMIZAR |
| agentes-de-ia-para-empresas | agentes de ia para empresas | 70 | comercial | **agente de ia** | **8.100** | OTIMIZAR |
| chatbot-com-ia-para-whatsapp | chatbot com ia para whatsapp | 140 | navegacional | **chatbot whatsapp** | **6.600** | OTIMIZAR |
| desenvolvimento-de-sistemas-personalizados | desenvolvimento de sistemas personalizados | 10 | comercial | software sob medida | 110 | OTIMIZAR |
| desenvolvimento-de-saas-e-mvp | desenvolvimento de saas | 30 | informacional | criar um saas | 50 | OTIMIZAR |
| crm-personalizado-e-automacao-de-vendas | crm personalizado | 40 | comercial | automação de vendas | 210 | OTIMIZAR |
| integracoes-de-sistemas-e-apis | integração de sistemas | **590** | informacional | — | — | MANTER |

**4 páginas MANTER · 9 páginas OTIMIZAR TÍTULO · 0 remover**

## Os quatro achados que mais valem

1. **`agente de ia` tem 8.100 de volume; `agentes de ia para empresas`, 70.**
   Diferença de 115×. O termo genérico domina — a página deve capturá-lo no
   title e no H1, mantendo o recorte empresarial no corpo.

2. **`gestor de tráfego` tem 12.100; `gestão de tráfego pago`, 1.000.**
   Ressalva importante: "gestor de tráfego" tem forte intenção de **quem
   procura emprego ou curso**, não de quem contrata agência. Usar como termo
   secundário, não como H1 — senão a página atrai o público errado.

3. **`chatbot whatsapp` tem 6.600; `chatbot com ia para whatsapp`, 140.**
   O qualificador "com IA" derruba o volume em 47×.

4. **`automação de processos` tem 1.000; com o sufixo "com ia", 70.**
   Mesmo padrão: o termo mais buscado é o mais simples.

## Divergências de intenção

Quatro páginas comerciais têm intenção detectada diferente:

- `gestão de tráfego pago` → **transacional**
- `agência de inteligência artificial` → **informacional**
- `chatbot com ia para whatsapp` → **navegacional**
- `desenvolvimento de saas` → **informacional**

Nesses casos o texto de abertura precisa responder à intenção real antes de
vender. **Não** é motivo para remover a página.

## Volume zero não é sentença

`tracking de campanhas` reportou volume 0. A página permanece: sustenta o
cluster, recebe links internos e responde long tail que o Keyword Planner não
agrega. O que muda é o title, que passa a considerar `dashboard comercial` (320).

## Nota sobre custo — erro corrigido

A estimativa inicial do Engine foi de **US$ 0,0060** e o gasto real foi
**US$ 0,1067** — 17× de erro. Causa: o modelo de custo considerava apenas o
custo fixo da task e ignorava o custo por keyword.

Corrigido em `ENDPOINT_COST`, que agora tem `base` + `perUnit`, calibrado
contra este gasto observado. A nova estimativa para a mesma execução é
US$ 0,1172 — superestima de propósito, que é o lado seguro num guard de
orçamento. Há teste que falha se a estimativa cair abaixo do custo real
observado.

## Reprodução

```bash
node organic-engine/src/cli.mjs baseline-keywords --dry-run          # custo zero
node organic-engine/src/cli.mjs baseline-keywords --max-cost-usd=1.00
```
