// Estudo de prontidão para busca generativa no mercado brasileiro.
//
// POR QUE ESTE MÓDULO EXISTE: o guia do Google (15/05/2026) diz que a única
// barra que subiu é conteúdo não-commodity de primeira mão. E ~84% das citações
// de IA vêm de fontes de terceiros, não do próprio site. As duas coisas apontam
// para o mesmo lugar: só dado próprio resolve, e dado próprio é o que atrai
// citação de terceiro.
//
// O sistema não tinha ativo assim. Este módulo produz um: mede objetivamente,
// em sites brasileiros reais, quantos bloqueiam crawler de IA, quantos devolvem
// 200 com casca vazia e quantos declaram entidade. Reprodutível — roda de novo
// em 90 dias e vira série temporal.
//
// Honestidade metodológica é requisito, não enfeite: um estudo com amostra
// obscura ou número inflado destrói mais reputação do que a citação constrói.
// Por isso a amostra é rastreável e o relatório carrega n e data.

import test from "node:test";
import assert from "node:assert/strict";
import {
	domainsFromSerp,
	classifySite,
	aggregate,
	formatFindings,
	MIN_WORDS_REAL_CONTENT,
	measureDomains,
} from "../src/research/ai-readiness-study.mjs";

// ── amostra ──────────────────────────────────────────────────────────────

test("extrai domínios únicos do SERP, sem repetir por página", () => {
	const d = domainsFromSerp([
		{ url: "https://a.com.br/servicos" },
		{ url: "https://a.com.br/blog" },
		{ url: "https://b.com.br/" },
	]);
	assert.deepEqual(d, ["a.com.br", "b.com.br"]);
});

test("www é o mesmo domínio, não um segundo", () => {
	assert.deepEqual(domainsFromSerp([{ url: "https://www.a.com.br/" }, { url: "https://a.com.br/x" }]), ["a.com.br"]);
});

test("o próprio domínio fica fora da amostra", () => {
	// medir a si mesmo dentro da amostra enviesa o resultado que vamos publicar
	const d = domainsFromSerp([{ url: "https://flowaidigital.com.br/" }, { url: "https://b.com.br/" }], {
		exclude: ["flowaidigital.com.br"],
	});
	assert.deepEqual(d, ["b.com.br"]);
});

test("URL inválida não derruba a amostragem", () => {
	assert.deepEqual(domainsFromSerp([{ url: "não é url" }, { url: "https://b.com.br/" }]), ["b.com.br"]);
});

// ── classificação de um site ─────────────────────────────────────────────

const checks = (o = {}) => ({ status: 200, words: 900, hasSchema: true, hasFaq: true, ...o });

test("403 para crawler de IA é bloqueio explícito", () => {
	assert.equal(classifySite(checks({ status: 403 })).verdict, "BLOCKED");
});

test("200 com pouquíssimo texto é casca vazia, não sucesso", () => {
	// é o estado do próprio flowaidigital.com.br hoje: 200 e 7 palavras
	const c = classifySite(checks({ status: 200, words: 7 }));
	assert.equal(c.verdict, "EMPTY_SHELL");
	assert.equal(c.reachable, true, "responder 200 não é o mesmo que entregar conteúdo");
});

test("200 com conteúdo real é o único caso bom", () => {
	assert.equal(classifySite(checks()).verdict, "OK");
});

test("erro de servidor não é confundido com bloqueio", () => {
	assert.equal(classifySite(checks({ status: 500 })).verdict, "ERROR");
});

test("o limiar de conteúdo real é declarado, não escondido no código", () => {
	assert.ok(MIN_WORDS_REAL_CONTENT >= 50);
	assert.equal(classifySite(checks({ words: MIN_WORDS_REAL_CONTENT })).verdict, "OK");
	assert.equal(classifySite(checks({ words: MIN_WORDS_REAL_CONTENT - 1 })).verdict, "EMPTY_SHELL");
});

// ── agregação ────────────────────────────────────────────────────────────

const amostra = [
	{ domain: "a.com.br", verdict: "BLOCKED", hasSchema: false, hasFaq: false },
	{ domain: "b.com.br", verdict: "EMPTY_SHELL", hasSchema: true, hasFaq: false },
	{ domain: "c.com.br", verdict: "OK", hasSchema: true, hasFaq: true },
	{ domain: "d.com.br", verdict: "OK", hasSchema: false, hasFaq: false },
];

test("as porcentagens saem sobre a amostra medida", () => {
	const a = aggregate(amostra);
	assert.equal(a.n, 4);
	assert.equal(a.blockedPct, 25);
	assert.equal(a.emptyShellPct, 25);
	assert.equal(a.okPct, 50);
	assert.equal(a.schemaPct, 50);
	assert.equal(a.faqPct, 25);
});

test("sites com erro saem do denominador, e isso fica registrado", () => {
	// medir sobre site fora do ar inventaria bloqueio que não existe
	const a = aggregate([...amostra, { domain: "e.com.br", verdict: "ERROR" }]);
	assert.equal(a.n, 4, "site com erro entrou no denominador");
	assert.equal(a.excluded, 1);
});

test("amostra vazia devolve zero, nunca NaN", () => {
	const a = aggregate([]);
	assert.equal(a.n, 0);
	assert.equal(a.blockedPct, 0);
});

// ── relatório ────────────────────────────────────────────────────────────

test("o relatório declara n e data — sem isso não é citável", () => {
	const txt = formatFindings(aggregate(amostra), { date: "2026-08-24", query: "agência de IA" });
	assert.match(txt, /\b4\b/, "não declara o tamanho da amostra");
	assert.match(txt, /2026-08-24/, "não declara a data da medição");
	assert.match(txt, /agência de IA/, "não declara como a amostra foi formada");
});

test("o relatório não arredonda para número redondo bonito", () => {
	const a = aggregate([
		{ domain: "1", verdict: "BLOCKED" },
		{ domain: "2", verdict: "OK" },
		{ domain: "3", verdict: "OK" },
	]);
	// 1/3 = 33,3% e não "cerca de 30%"
	assert.equal(a.blockedPct, 33.3);
});

// ── execução ─────────────────────────────────────────────────────────────

test("mede cada domínio com user-agent de crawler de IA, não de navegador", async () => {
	// medir com UA de Chrome não responde a pergunta nenhuma: o que interessa é
	// o que o site entrega para OAI-SearchBot e PerplexityBot
	const vistos = [];
	await measureDomains(["a.com.br"], {
		fetchImpl: async (url, opts) => {
			vistos.push(opts.headers["User-Agent"]);
			return { status: 200, text: async () => "<h1>x</h1>" + "palavra ".repeat(300) };
		},
	});
	assert.match(vistos[0], /SearchBot|PerplexityBot|GPTBot/i);
});

test("detecta schema e FAQ no HTML medido", async () => {
	const html = `<html><script type="application/ld+json">{"@type":"FAQPage"}</script>
		<body>${"palavra ".repeat(300)}</body></html>`;
	const [r] = await measureDomains(["a.com.br"], {
		fetchImpl: async () => ({ status: 200, text: async () => html }),
	});
	assert.equal(r.hasSchema, true);
	assert.equal(r.hasFaq, true);
	assert.equal(r.verdict, "OK");
});

test("site que recusa o crawler entra como BLOCKED", async () => {
	const [r] = await measureDomains(["a.com.br"], {
		fetchImpl: async () => ({ status: 403, text: async () => "forbidden" }),
	});
	assert.equal(r.verdict, "BLOCKED");
});

test("timeout de um domínio não derruba o estudo", async () => {
	const rs = await measureDomains(["a.com.br", "b.com.br"], {
		fetchImpl: async (u) => {
			if (u.includes("a.com.br")) throw new Error("ETIMEDOUT");
			return { status: 200, text: async () => "palavra ".repeat(300) };
		},
	});
	assert.equal(rs.length, 2);
	assert.equal(rs[0].verdict, "ERROR");
	assert.equal(rs[1].verdict, "OK");
});
