# Diagnóstico de LCP da home — e a otimização aplicada

**Data:** 21/08/2026 · **Alvo:** preview do site com prerender

## Medição

Playwright com throttling (CPU 4×, rede ~1,6 Mbps, 150 ms de latência):

```
LCP:                  4.744 ms
elemento LCP:         <h1>  — "Sua empresa não precisa de mais ferramentas…"
recurso do LCP:       nenhum (é elemento de texto)
TTFB:                 3.377 ms
FCP:                  4.744 ms
render delay (LCP-FCP):   0 ms
```

## O que os números dizem

**O LCP é o próprio H1 — e o render delay é ZERO.** Ou seja: o texto pinta no
instante em que o CSS chega. Não há espera por imagem, por WebGL nem por
JavaScript de animação.

Isso muda o diagnóstico por completo. O 3D **não** é o gargalo do LCP: o Three.js
pinta no `<canvas>`, que não é o elemento maior. O que manda é a **entrega do
stylesheet render-blocking**.

Recursos que terminam depois do LCP (portanto não o afetam):

```
scene-02-tunnel-v4.webp    9.074 ms   365 KB
flowai-logo.png            8.549 ms   118 KB
fundador-flowai.mp4        8.098 ms
scene-01-engine-v5.webp    6.925 ms   131 KB
index-C-j3JIV1.js          6.652 ms   112 KB
index-BSC-maUi.css         4.215 ms    11 KB  ← este é o que trava o LCP
```

## Causa encontrada

No `<head>` original, o bundle vinha **antes** do CSS:

```html
<script type="module" src="/assets/index-C-j3JIV1.js"></script>   <!-- 112 KB -->
<link rel="stylesheet" href="/assets/index-BSC-maUi.css">
<link rel="stylesheet" href="/assets/flowai-enhancements.css">
```

Módulos ES disputam prioridade de rede com o stylesheet. Como o stylesheet é
render-blocking e define quando o H1 aparece, declarar 112 KB de JS antes dele
atrasa exatamente o elemento do LCP.

## Otimização aplicada

Apenas **ordem no `<head>`** — os stylesheets passam a preceder os módulos:

```html
<link rel="stylesheet" href="/assets/index-BSC-maUi.css">
<link rel="stylesheet" href="/assets/flowai-enhancements.css">
<script type="module" src="/assets/index-C-j3JIV1.js"></script>
```

Nenhum recurso foi removido, adiado, substituído ou minificado. O 3D continua
idêntico. Implementado em `cssBeforeModules()` (`site/prerender.mjs`), com
quatro testes, incluindo no-op quando o CSS já vem antes.

## Resultado

| Métrica (home mobile) | Antes | Depois |
|---|---|---|
| FCP | 2,0 s | **1,5 s** |
| LCP | 6,2 s | **5,5 s** |
| Performance | 76 | 76 |
| CLS | 0 | 0 |

**Regressão visual: 0,000% em desktop e mobile**, contra controle de 0,000%.
A ordem mudou; o pixel não.

## O que NÃO foi feito, e por quê

- **Não removemos o 3D.** Ele não é o gargalo do LCP e é parte da identidade.
- **Não mexemos nas imagens das cenas.** Elas são renderizadas pelo React dentro
  do bundle; adicionar `loading="lazy"` exigiria tocar no código-fonte da SPA,
  que não temos.
- **Não trocamos a fonte nem o CSS.** Seria redesign.

Um ganho maior exigiria acesso ao código-fonte da SPA para dividir o bundle e
adiar a inicialização do WebGL. Fica registrado, não executado nesta rodada.

## Ressalva importante

Estes números são de **laboratório** (Lighthouse). Não são Core Web Vitals de
campo. Sem `GOOGLE_API_KEY`, a consulta ao CrUX não foi feita:

**FIELD_DATA = UNAVAILABLE**

Só o dado de campo dirá como usuários reais experimentam a página.
