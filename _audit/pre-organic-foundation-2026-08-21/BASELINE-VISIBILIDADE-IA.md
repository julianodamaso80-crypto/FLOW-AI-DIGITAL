---
data: 2026-08-21
projeto: FlowAI Digital
tags: [geo, medicao, baseline, visibilidade]
tipo: aprendizado
---

# Linha de base de visibilidade em IA — antes da publicação

## Por que foi medida antes, e não depois

Esta é a única medição desta lista que **não se recupera**. Depois que a
fundação entra no ar, o "antes" deixa de existir. Foi rodada minutos antes do
deploy, de propósito.

## Método

24 sondagens: 8 perguntas de comprador × 3 modelos **com acesso a busca**.
Modelo sem busca responderia da memória de treino e mediria outra coisa — se a
marca estava no corpus, não se ela é encontrável hoje.

Modelos: `perplexity/sonar`, `openai/gpt-5.6-terra:online`,
`anthropic/claude-sonnet-5:online`. IDs conferidos contra o catálogo do
OpenRouter.

Nenhuma pergunta cita "FlowAI" — perguntar pela marca mediria memorização, não
descoberta. Há teste na suíte que reprova pergunta que entregue a resposta no
enunciado.

## Resultado

**0/100. 24 medidas, 0 falhas. Zero menções, zero citações.**

Custo: US$ 0,048.

Amostra de resposta real (`perplexity/sonar`, "agência de inteligência
artificial no Rio de Janeiro para empresas", 1.164 caracteres): o modelo cita
**Convertai**, **Aegis AI** e **ToGrow Agência**. A FlowAI não aparece.

## O que este número NÃO é

Não é "0/100 porque não consegui medir". Essa distinção existe no código por
uma razão concreta: na primeira execução o OpenRouter devolveu **HTTP 402 (sem
créditos)** em 24 de 24 sondagens, o módulo leu falha como resposta vazia e o
relatório disse "0/100, ausente em tudo". Falha de cobrança apresentada como
diagnóstico de marca.

Agora `score` é `null` quando nada foi medido, e o CLI recusa imprimir nota.
O 0/100 acima tem `measured: 24, failed: 0` — é medição, não silêncio.

## Como comparar depois

Citação em motor generativo leva semanas. Repetir com o mesmo comando:

```
node src/cli.mjs ai-visibility --max-cost-usd=0.10
```

**Nunca comparar o número absoluto de um modelo com o de outro**: as taxas de
citação variam até 46× entre plataformas (ChatGPT ~0,59%, Perplexity ~13%). O
que vale é a série de cada modelo contra ele mesmo.

## Links relacionados

- [[ESTUDO-PRONTIDAO-IA]]
- [[GA4-INVESTIGACAO]]
