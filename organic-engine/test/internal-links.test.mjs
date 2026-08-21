import test from "node:test";
import assert from "node:assert/strict";

import {
	suggestInternalLinks,
	findOrphans,
	buildLinkGraph,
	detectAnchorOveruse,
} from "../src/content/internal-links.mjs";

const corpus = [
	{ slug: "agencia-de-inteligencia-artificial", cluster: "ia", type: "pillar", targetKeyword: "agência de inteligência artificial", title: "IA aplicada ao negócio" },
	{ slug: "agentes-de-ia-para-empresas", cluster: "ia", type: "cluster", targetKeyword: "agente de ia", title: "Agentes de IA" },
	{ slug: "automacao-de-processos-com-ia", cluster: "ia", type: "cluster", targetKeyword: "automação de processos", title: "Automação de processos" },
	{ slug: "chatbot-com-ia-para-whatsapp", cluster: "ia", type: "cluster", targetKeyword: "chatbot whatsapp", title: "Chatbot no WhatsApp" },
	{ slug: "agencia-de-marketing-digital", cluster: "marketing", type: "pillar", targetKeyword: "agência de marketing digital", title: "Marketing digital" },
	{ slug: "desenvolvimento-de-sistemas-personalizados", cluster: "sistemas", type: "pillar", targetKeyword: "software sob medida", title: "Sistemas sob medida" },
];

const artigo = { slug: "guia-automacao", cluster: "ia", type: "blog", title: "Guia de automação" };

test("liga o artigo à página-mãe do cluster", () => {
	const links = suggestInternalLinks(artigo, corpus);
	assert.ok(
		links.some((l) => l.slug === "agencia-de-inteligencia-artificial"),
		"não linkou o pillar do cluster",
	);
});

test("inclui irmãos do mesmo cluster", () => {
	const links = suggestInternalLinks(artigo, corpus);
	const irmaos = links.filter((l) => l.reason === "mesmo cluster");
	assert.ok(irmaos.length >= 1 && irmaos.length <= 3, `veio ${irmaos.length} irmãos`);
});

test("cria ponte para outro cluster", () => {
	const links = suggestInternalLinks(artigo, corpus);
	assert.ok(links.some((l) => l.reason === "ponte entre clusters"));
});

test("respeita o teto de links", () => {
	assert.ok(suggestInternalLinks(artigo, corpus, { maxLinks: 3 }).length <= 3);
	assert.ok(suggestInternalLinks(artigo, corpus).length <= 6);
});

test("nunca sugere link para a própria página", () => {
	const self = { slug: "agentes-de-ia-para-empresas", cluster: "ia", type: "cluster" };
	const links = suggestInternalLinks(self, corpus);
	assert.ok(!links.some((l) => l.slug === self.slug), "sugeriu link para si mesma");
});

test("não repete o mesmo destino", () => {
	const links = suggestInternalLinks(artigo, corpus);
	const slugs = links.map((l) => l.slug);
	assert.equal(new Set(slugs).size, slugs.length, "destino duplicado");
});

test("money page vem primeiro — é a função comercial do artigo", () => {
	const links = suggestInternalLinks(artigo, corpus, {
		moneyPage: "/automacao-de-processos-com-ia/",
	});
	assert.equal(links[0].reason, "money page de destino");
});

test("money page fora do corpus ainda é linkada", () => {
	const links = suggestInternalLinks(artigo, corpus, { moneyPage: "/pagina-nova/" });
	assert.equal(links[0].url, "/pagina-nova/");
});

test("âncoras variam — não repete a keyword exata em todo link", () => {
	const links = suggestInternalLinks(artigo, corpus);
	const anchors = links.map((l) => l.anchor);
	assert.equal(new Set(anchors).size, anchors.length, "âncoras repetidas geram padrão artificial");
});

test("buildLinkGraph extrai os destinos do corpo", () => {
	const g = buildLinkGraph([
		{ slug: "a", body: "veja [x](/b/) e [y](/c/) e de novo [z](/b/)" },
		{ slug: "b", body: "sem links" },
	]);
	assert.deepEqual(g.a.sort(), ["b", "c"]);
	assert.deepEqual(g.b, []);
});

test("findOrphans acha quem ninguém linka", () => {
	const paginas = [{ slug: "a" }, { slug: "b" }, { slug: "orfa" }];
	const grafo = { a: ["b"], b: ["a"] };
	assert.deepEqual(findOrphans(paginas, grafo), ["orfa"]);
});

test("findOrphans ignora barras nas pontas", () => {
	const paginas = [{ slug: "b" }];
	assert.deepEqual(findOrphans(paginas, { a: ["/b/"] }), []);
});

test("detectAnchorOveruse acusa âncora repetida para o mesmo destino", () => {
	const paginas = Array.from({ length: 5 }, (_, i) => ({
		slug: `p${i}`,
		body: "veja [agente de ia](/agentes-de-ia-para-empresas/) aqui",
	}));
	const excesso = detectAnchorOveruse(paginas, { limit: 3 });
	assert.equal(excesso.length, 1);
	assert.equal(excesso[0].ocorrencias, 5);
	assert.equal(excesso[0].anchor, "agente de ia");
});

test("detectAnchorOveruse não acusa uso normal", () => {
	const paginas = [
		{ slug: "a", body: "[agente de ia](/x/)" },
		{ slug: "b", body: "[outro texto](/x/)" },
	];
	assert.deepEqual(detectAnchorOveruse(paginas, { limit: 3 }), []);
});
