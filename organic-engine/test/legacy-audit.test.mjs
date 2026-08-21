import test from "node:test";
import assert from "node:assert/strict";

import {
	parseLegacyPost,
	classifyPost,
	detectNiche,
	detectAlignment,
	findDuplicates,
	auditAll,
} from "../src/audit/legacy-posts.mjs";

const html = (title, body, extra = {}) => `<!doctype html><html><head>
<title>${title}</title>
<meta name="description" content="${extra.desc ?? "desc"}">
<link rel="canonical" href="https://flowaidigital.com.br/blog/x/">
${extra.schema === false ? "" : '<script type="application/ld+json">{"@type":"Article"}</script>'}
</head><body><h1>${title}</h1><p>${body}</p>
${(extra.links ?? []).map((l) => `<a href="${l}">l</a>`).join("")}
</body></html>`;

test("parseLegacyPost extrai metadata e conta palavras sem script", () => {
	const p = parseLegacyPost(html("Título X", "uma duas três quatro"), "slug-x");
	assert.equal(p.slug, "slug-x");
	assert.equal(p.title, "Título X");
	assert.equal(p.h1, "Título X");
	assert.equal(p.hasArticleSchema, true);
	assert.ok(p.wordCount > 0 && p.wordCount < 30);
});

test("detecta nicho abandonado", () => {
	const p = parseLegacyPost(html("CRM para clínica odontológica", "texto"), "crm-clinica");
	const n = detectNiche(p);
	assert.equal(n.offPositioning, true);
	assert.ok(n.matches.length > 0);
});

test("detecta alinhamento com o posicionamento atual", () => {
	const p = parseLegacyPost(html("Agentes de IA e automação de processos", "texto"), "agentes-ia");
	assert.equal(detectAlignment(p).aligned, true);
});

test("nicho abandonado sem tema atual vira ARCHIVE", () => {
	const p = parseLegacyPost(html("Como vender procedimentos estéticos", "texto"), "estetica");
	assert.equal(classifyPost(p).verdict, "ARCHIVE");
});

test("nicho abandonado com tema atual vira UPDATE — reescrever sem o nicho", () => {
	const p = parseLegacyPost(html("Agente de IA para clínica odontológica", "texto"), "agente-clinica");
	const r = classifyPost(p);
	assert.equal(r.verdict, "UPDATE");
	assert.match(r.reasons[0], /nicho abandonado/);
});

test("sobreposição no acervo vira MERGE", () => {
	const posts = [
		parseLegacyPost(html("Taxa de conversão comercial", "t"), "taxa-conversao-a"),
		parseLegacyPost(html("Taxa de conversão comercial em vendas", "t"), "taxa-conversao-b"),
	];
	const groups = findDuplicates(posts);
	assert.ok(groups.length >= 1, "não agrupou títulos quase iguais");
	const r = classifyPost(posts[0], { duplicateGroups: groups });
	assert.equal(r.verdict, "MERGE");
});

test("post alinhado mas raso e sem fontes vira UPDATE", () => {
	const p = parseLegacyPost(html("Automação de processos com IA", "curto"), "automacao");
	const r = classifyPost(p);
	assert.equal(r.verdict, "UPDATE");
	// extensão entra como dívida entre outras, nunca como reprovação isolada
	assert.ok(r.debts.some((d) => d.includes("extensão abaixo da referência")));
	assert.ok(r.debts.length >= 2, "UPDATE exige mais de uma dívida, não só extensão");
});

test("extensão sozinha não decide — referência é configurável e é só um sinal", () => {
	const corpo = `${"palavra ".repeat(430)} segundo a documentação oficial. Por Juliano Damaso.`;
	const p = parseLegacyPost(html("Automação de processos com IA", corpo, { links: ["/a/", "/b/"] }), "auto-450");
	// com referência 500, a extensão vira dívida, mas é a única -> KEEP
	const comReferenciaAlta = classifyPost(p, { lengthReference: 500 });
	assert.equal(comReferenciaAlta.verdict, "KEEP", JSON.stringify(comReferenciaAlta.debts));
	// com referência menor, nem dívida existe
	const comReferenciaBaixa = classifyPost(p, { lengthReference: 300 });
	assert.equal(comReferenciaBaixa.debts.length, 0);
});

test("post alinhado, longo, com fontes e links vira KEEP", () => {
	const corpo = `${"palavra ".repeat(900)} segundo a documentação oficial. Por Juliano Damaso.`;
	const p = parseLegacyPost(
		html("Automação de processos com IA para empresas", corpo, { links: ["/a/", "/b/", "/c/"] }),
		"automacao-ia",
	);
	const r = classifyPost(p);
	assert.equal(r.verdict, "KEEP", JSON.stringify(r.reasons));
});

test("auditAll nunca marca nada como publicável automaticamente", () => {
	const posts = [
		parseLegacyPost(html("Automação de processos com IA", "x"), "a"),
		parseLegacyPost(html("Como vender procedimentos estéticos", "x"), "b"),
	];
	const r = auditAll(posts);
	assert.deepEqual(r.autoPublishable, [], "acervo não pode virar fila de publicação");
	assert.equal(r.total, 2);
	assert.match(r.note, /decisão explícita do dono/);
});

test("soma dos vereditos bate com o total", () => {
	const posts = ["a", "b", "c"].map((s, i) =>
		parseLegacyPost(html(`Título ${i} automação de processos`, "x"), s),
	);
	const r = auditAll(posts);
	const soma = Object.values(r.summary).reduce((x, y) => x + y, 0);
	assert.equal(soma, r.total);
});
