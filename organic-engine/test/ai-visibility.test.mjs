// Medição de visibilidade em motores generativos.
//
// Era a dimensão mais fraca do sistema: nenhum módulo media se a FlowAI é
// citada por ChatGPT, Claude, Gemini ou Perplexity. Sem isso, todo o resto —
// tabela, estatística, frescor — é fé.
//
// Duas distinções que o módulo precisa fazer e que ferramentas ingênuas erram:
//
// 1. MENÇÃO ≠ CITAÇÃO. Ser nomeado no texto é fraco; ser linkado como fonte é
//    o que traz tráfego e o que os estudos contam como citação.
// 2. SUBSTRING ≠ MARCA. "flow" casa dentro de "workflow", "fluxo de trabalho" e
//    dezenas de palavras comuns. Contar isso infla o número e mente para o dono.

import test from "node:test";
import assert from "node:assert/strict";
import {
	detectMentions,
	visibilityScore,
	shareOfVoice,
	runProbe,
	estimateProbeCost,
} from "../src/measure/ai-visibility.mjs";

const ALVO = { brand: "FlowAI", domain: "flowaidigital.com.br" };

// ── detecção ─────────────────────────────────────────────────────────────

test("marca nomeada no texto conta como menção", () => {
	const r = detectMentions("A FlowAI monta ecossistemas de agentes.", ALVO);
	assert.equal(r.mentioned, true);
	assert.equal(r.cited, false, "menção sem link não é citação");
});

test("domínio linkado conta como citação, o sinal forte", () => {
	const r = detectMentions("Veja https://flowaidigital.com.br/agentes para detalhes.", ALVO);
	assert.equal(r.cited, true);
	assert.equal(r.mentioned, true, "citação implica menção");
});

test("substring dentro de outra palavra NÃO conta", () => {
	// o erro clássico: "flow" casa em "workflow" e o painel vira ficção
	const r = detectMentions("Automatize seu workflow com ferramentas de fluxo.", ALVO);
	assert.equal(r.mentioned, false);
});

test("variações de escrita da marca contam", () => {
	for (const t of ["A Flow AI Digital resolve isso.", "flowai digital é uma opção.", "FLOWAI atua no Rio."]) {
		assert.equal(detectMentions(t, ALVO).mentioned, true, `não reconheceu: ${t}`);
	}
});

test("posição da primeira menção é registrada", () => {
	// aparecer no começo da resposta vale mais que no rodapé
	const cedo = detectMentions("A FlowAI é uma opção. " + "Texto. ".repeat(50), ALVO);
	const tarde = detectMentions("Texto. ".repeat(50) + "A FlowAI é uma opção.", ALVO);
	assert.ok(cedo.position < tarde.position);
	assert.equal(detectMentions("Nada aqui.", ALVO).position, null);
});

test("concorrentes citados são identificados", () => {
	const r = detectMentions("Considere a Agência Alpha ou a Beta Digital.", {
		...ALVO,
		competitors: ["Agência Alpha", "Beta Digital", "Gamma"],
	});
	assert.deepEqual(r.competitors.sort(), ["Agência Alpha", "Beta Digital"]);
});

// ── score ────────────────────────────────────────────────────────────────

test("citação vale mais que menção, e menção mais que ausência", () => {
	const nada = visibilityScore([{ mentioned: false, cited: false, position: null }]);
	const menc = visibilityScore([{ mentioned: true, cited: false, position: 0.5 }]);
	const cit = visibilityScore([{ mentioned: true, cited: true, position: 0.5 }]);
	assert.equal(nada, 0);
	assert.ok(cit > menc, "citação não pesa mais que menção");
	assert.ok(menc > nada);
	assert.ok(cit <= 100);
});

test("aparecer cedo na resposta vale mais que no fim", () => {
	const cedo = visibilityScore([{ mentioned: true, cited: true, position: 0.05 }]);
	const tarde = visibilityScore([{ mentioned: true, cited: true, position: 0.95 }]);
	assert.ok(cedo > tarde);
});

test("score é a média das sondagens, não a soma", () => {
	const s = visibilityScore([
		{ mentioned: true, cited: true, position: 0.1 },
		{ mentioned: false, cited: false, position: null },
	]);
	assert.ok(s > 0 && s < 100, `score fora da faixa: ${s}`);
});

test("sem sondagem nenhuma o score é zero, não NaN", () => {
	assert.equal(visibilityScore([]), 0);
});

test("share of voice compara com quem mais aparece", () => {
	const sov = shareOfVoice([
		{ mentioned: true, competitors: ["Alpha"] },
		{ mentioned: false, competitors: ["Alpha", "Beta"] },
	], "FlowAI");
	assert.equal(sov.FlowAI, 1);
	assert.equal(sov.Alpha, 2);
	assert.equal(sov.Beta, 1);
});

// ── custo e execução ─────────────────────────────────────────────────────

test("o custo é estimado antes de gastar", () => {
	const c = estimateProbeCost({ queries: 10, models: 3 });
	assert.ok(c > 0, "estimativa zerada esconde gasto real");
	assert.ok(estimateProbeCost({ queries: 20, models: 3 }) > c, "não escala com o volume");
});

test("dry-run não chama a rede", async () => {
	let chamou = false;
	const r = await runProbe({
		queries: ["quem faz automação com IA no Rio"],
		models: ["m1"],
		target: ALVO,
		dryRun: true,
		fetchImpl: async () => { chamou = true; },
	});
	assert.equal(chamou, false, "dry-run chamou a rede");
	assert.equal(r.dryRun, true);
	assert.ok(r.estimatedCostUsd > 0);
});

test("a sondagem aborta antes de estourar o teto de custo", async () => {
	let chamadas = 0;
	const r = await runProbe({
		queries: Array.from({ length: 50 }, (_, i) => `q${i}`),
		models: ["m1"],
		target: ALVO,
		maxCostUsd: 0.0001,
		fetchImpl: async () => {
			chamadas++;
			return { ok: true, json: async () => ({ choices: [{ message: { content: "nada" } }] }) };
		},
	});
	assert.equal(r.aborted, true);
	assert.ok(chamadas < 50, `gastou ${chamadas} chamadas apesar do teto`);
});

test("resposta de modelo é medida de verdade, não simulada", async () => {
	const r = await runProbe({
		queries: ["quem faz automação com IA"],
		models: ["m1"],
		target: ALVO,
		maxCostUsd: 1,
		fetchImpl: async () => ({
			ok: true,
			json: async () => ({
				choices: [{ message: { content: "A FlowAI (https://flowaidigital.com.br) faz isso." } }],
			}),
		}),
	});
	assert.equal(r.results.length, 1);
	assert.equal(r.results[0].cited, true);
	assert.ok(r.score > 0);
});

test("HTTP não-ok vira erro, NUNCA ausência", async () => {
	// Aconteceu de verdade: OpenRouter devolveu 402 (sem créditos) em 24 de 24
	// sondagens, o código leu `choices` inexistente como resposta vazia, e o
	// relatório disse "0/100 — ausente em tudo". Ou seja: falha de cobrança
	// virou conclusão de negócio. "Não medi" e "medi e não apareci" são coisas
	// opostas e o módulo tem que distinguir as duas.
	const r = await runProbe({
		queries: ["q"],
		models: ["m1"],
		target: ALVO,
		maxCostUsd: 1,
		fetchImpl: async () => ({
			ok: false,
			status: 402,
			json: async () => ({ error: { message: "Insufficient credits", code: 402 } }),
		}),
	});
	assert.ok(r.results[0].error, "402 passou como resposta válida");
	assert.match(r.results[0].error, /402/);
	assert.equal(r.measured, 0, "sondagem que falhou entrou na conta");
	assert.equal(r.score, null, "score numérico apesar de nada ter sido medido");
});

test("score é null quando nenhuma sondagem foi medida", async () => {
	const r = await runProbe({
		queries: ["q"],
		models: ["m1"],
		target: ALVO,
		maxCostUsd: 1,
		fetchImpl: async () => { throw new Error("rede caiu"); },
	});
	assert.equal(r.score, null);
	assert.equal(r.measured, 0);
});

test("score só conta as sondagens que realmente responderam", async () => {
	let n = 0;
	const r = await runProbe({
		queries: ["a", "b"],
		models: ["m1"],
		target: ALVO,
		maxCostUsd: 1,
		fetchImpl: async () => {
			n++;
			if (n === 1) return { ok: false, status: 429, json: async () => ({}) };
			return { ok: true, json: async () => ({ choices: [{ message: { content: "A FlowAI faz isso." } }] }) };
		},
	});
	assert.equal(r.measured, 1, "denominador incluiu a sondagem que falhou");
	assert.ok(r.score > 0);
});

test("resposta vazia sem erro também não conta como medida", async () => {
	// 200 com corpo sem conteúdo não é "não apareci" — é sondagem inválida
	const r = await runProbe({
		queries: ["q"],
		models: ["m1"],
		target: ALVO,
		maxCostUsd: 1,
		fetchImpl: async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: "" } }] }) }),
	});
	assert.equal(r.measured, 0);
	assert.equal(r.score, null);
});

test("modelo que falha não derruba a rodada inteira", async () => {
	const r = await runProbe({
		queries: ["a", "b"],
		models: ["m1"],
		target: ALVO,
		maxCostUsd: 1,
		fetchImpl: async (_u, o) => {
			if (JSON.parse(o.body).messages[0].content === "a") throw new Error("timeout");
			return { ok: true, json: async () => ({ choices: [{ message: { content: "FlowAI" } }] }) };
		},
	});
	assert.equal(r.results.length, 2);
	assert.equal(r.results[0].error, "timeout");
	assert.equal(r.results[1].mentioned, true);
});
