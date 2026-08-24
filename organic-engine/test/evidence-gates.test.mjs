// Alavancas de citação em motores generativos.
//
// O estudo do Princeton/Georgia Tech/IIT Delhi (KDD '24) testou 9 táticas em
// 10.000 queries. As três maiores foram adicionar estatística (+41%), aspas de
// fonte nomeada (+28%) e citar fontes. E 44,2% das citações saem do primeiro
// terço da página.
//
// O sistema tinha a trava sem o motor: `sourceGate` PROÍBE estatística sem
// fonte, mas nada EXIGE que exista estatística com fonte. O resultado é um
// texto impecavelmente honesto e nunca citado.
//
// Cuidado de desenho que motivou a divisão em dois gates: exigir "estatística"
// sozinha incentivaria inventar número — proibido pelas regras da FlowAI.
// `evidenceGate` exige que a evidência EXISTA; `sourceGate`, que já existe,
// continua exigindo que ela seja FUNDAMENTADA. Um não passa sem o outro.

import test from "node:test";
import assert from "node:assert/strict";
import { evidenceGate, frontLoadGate, namedQuotations, firstThird } from "../src/gates/index.mjs";

const COM_EVIDENCIA = `Agências tradicionais respondem um lead em 2 horas na média do setor.

Segundo o relatório da HubSpot, "o tempo de resposta é o maior previsor isolado de conversão em vendas B2B".

## Por que o tempo importa

Leads respondidos em 5 minutos convertem 21 vezes mais que os respondidos em 30 minutos.`;

// ── evidenceGate ─────────────────────────────────────────────────────────

test("artigo informacional sem nenhuma estatística é reprovado", () => {
	const r = evidenceGate({
		intent: "informacional",
		body: "Atendimento rápido é importante. Empresas devem responder logo. Isso ajuda muito.",
	});
	assert.equal(r.passed, false);
	assert.match(r.reason, /estat/i);
});

test("artigo informacional sem aspas de fonte nomeada é reprovado", () => {
	const r = evidenceGate({
		intent: "informacional",
		body: "Leads respondidos em 5 minutos convertem 21 vezes mais. A média do setor é de 2 horas.",
	});
	assert.equal(r.passed, false);
	assert.match(r.reason, /aspas|cita/i);
});

test("artigo com estatística e aspas atribuídas passa", () => {
	const r = evidenceGate({ intent: "informacional", body: COM_EVIDENCIA });
	assert.equal(r.passed, true, r.reason);
	assert.ok(r.detail.stats >= 2, `contou ${r.detail.stats} estatísticas`);
	assert.ok(r.detail.quotes >= 1);
});

test("money page transacional não é obrigada a carregar estatística", () => {
	// exigir 3 números numa página de serviço empurraria para inventar dado
	const r = evidenceGate({
		intent: "transacional",
		body: "A FlowAI desenha a operação comercial da sua empresa com agentes de IA.",
	});
	assert.equal(r.passed, true, r.reason);
	assert.equal(r.detail.exempt, true);
});

test("comparativo exige mais evidência que informacional", () => {
	const poucas = { intent: "comparativo", body: COM_EVIDENCIA };
	const r = evidenceGate(poucas, { minStats: { comparativo: 99 } });
	assert.equal(r.passed, false, "o mínimo por intenção não foi respeitado");
});

// ── extração de aspas ────────────────────────────────────────────────────

test("aspas sem fonte atribuída não contam", () => {
	// citação flutuante não é sinal de autoridade — é enfeite
	assert.equal(namedQuotations('Ele disse "algo importante" e saiu.').length, 0);
});

test("aspas com atribuição contam", () => {
	const q = namedQuotations('Segundo a McKinsey, "a adoção de IA dobrou em 2025".');
	assert.equal(q.length, 1);
	assert.match(q[0].source, /McKinsey/);
});

test("reconhece atribuição depois da citação", () => {
	const q = namedQuotations('"O tempo de resposta define a venda", afirma o relatório da Salesforce.');
	assert.equal(q.length, 1);
	assert.match(q[0].source, /Salesforce/);
});

// ── frontLoadGate ────────────────────────────────────────────────────────

test("artigo que enrola antes de responder é reprovado", () => {
	const enrolado = `${"Antes de falar sobre isso, vale um contexto histórico longo. ".repeat(30)}

## A resposta

Leads respondidos em 5 minutos convertem 21 vezes mais.`;
	const r = frontLoadGate({ body: enrolado, primaryKeyword: "tempo de resposta" });
	assert.equal(r.passed, false);
	assert.match(r.reason, /primeiro terço|front/i);
});

test("artigo que responde de cara passa", () => {
	const r = frontLoadGate({ body: COM_EVIDENCIA, primaryKeyword: "tempo de resposta" });
	assert.equal(r.passed, true, r.reason);
});

test("firstThird devolve o primeiro terço do texto, não do markup", () => {
	const t = firstThird("um dois tres quatro cinco seis sete oito nove");
	assert.equal(t.split(/\s+/).filter(Boolean).length, 3);
});

test("a palavra-alvo tem que aparecer no primeiro terço", () => {
	const r = frontLoadGate({ body: COM_EVIDENCIA, primaryKeyword: "remarketing de carrinho" });
	assert.equal(r.passed, false);
	assert.match(r.reason, /palavra-alvo|keyword/i);
});
