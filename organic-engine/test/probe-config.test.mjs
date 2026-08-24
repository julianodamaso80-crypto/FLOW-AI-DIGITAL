// Configuração das sondagens.
//
// Dois erros reais motivaram cada teste aqui:
//
// 1. MODELO INEXISTENTE. A primeira lista trazia `openai/gpt-4o-search-preview`
//    e `anthropic/claude-3.5-sonnet`. Nenhum dos dois existe no OpenRouter, e
//    as chamadas voltavam 404 — que o código de então lia como "a marca não
//    apareceu". Medição fantasma.
// 2. PERGUNTA QUE CONTÉM A RESPOSTA. Perguntar "o que é a FlowAI" mede
//    memorização, não descoberta: o nome já está no prompt.

import test from "node:test";
import assert from "node:assert/strict";
import { PROBE_QUERIES, PROBE_MODELS, TARGET } from "../src/measure/probe-config.mjs";

test("nenhuma pergunta cita a própria marca", () => {
	for (const q of PROBE_QUERIES) {
		assert.ok(
			!/flow\s*ai/i.test(q),
			`"${q}" entrega a resposta no enunciado — mede memorização, não descoberta`,
		);
	}
});

test("as perguntas são de comprador, não institucionais", () => {
	// quem busca descreve o problema; quem já conhece busca a marca
	assert.ok(PROBE_QUERIES.length >= 5, "amostra pequena demais para série temporal");
	for (const q of PROBE_QUERIES) {
		assert.ok(q.length > 25, `pergunta curta demais para ter intenção clara: "${q}"`);
	}
});

test("todo modelo declarado tem acesso a busca", () => {
	// modelo sem busca responde da memória de treino e mede outra coisa
	for (const m of PROBE_MODELS) {
		assert.ok(
			/sonar|:online/.test(m),
			`"${m}" não tem acesso a busca — mediria o corpus de treino, não a web`,
		);
	}
});

test("os IDs de modelo têm o formato do OpenRouter", () => {
	for (const m of PROBE_MODELS) {
		assert.match(m, /^[a-z0-9-]+\/[a-z0-9.\-]+(:online)?$/, `ID fora do formato provedor/modelo: "${m}"`);
	}
});

test("o alvo declara marca e domínio", () => {
	assert.equal(TARGET.brand, "FlowAI");
	assert.equal(TARGET.domain, "flowaidigital.com.br");
});

test("lista de concorrentes não é inventada", () => {
	// share of voice contra concorrente fictício produz gráfico bonito e falso
	assert.ok(Array.isArray(TARGET.competitors));
	for (const c of TARGET.competitors) {
		assert.ok(String(c).trim().length > 2, "concorrente vazio na lista");
	}
});
