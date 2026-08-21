// Auditoria de links a partir do HTML real.
//
// A primeira versão desta análise convertia href em markdown antes de medir
// anchor text, o que apagava o texto real. Estes testes travam o parser correto.

import test from "node:test";
import assert from "node:assert/strict";

import {
	extractLinks,
	normalizeAnchor,
	normalizePath,
	decodeEntities,
	findStructuralRanges,
	auditLinks,
} from "../src/content/link-audit.mjs";

const page = (body) => `<!doctype html><html><body>${body}</body></html>`;

// ─────────────────────────── parser ─────────────────────────────────────

test("extrai o TEXTO REAL da âncora, não o href", () => {
	const links = extractLinks(page('<a href="/destino/">texto real da âncora</a>'));
	assert.equal(links.length, 1);
	assert.equal(links[0].dest, "/destino/");
	assert.equal(links[0].anchor, "texto real da âncora");
});

test("remove tags internas e normaliza espaço na âncora", () => {
	const links = extractLinks(page('<a href="/x/">  veja <strong>isto</strong>\n  aqui </a>'));
	assert.equal(links[0].anchor, "veja isto aqui");
});

test("decodifica entidades HTML na âncora", () => {
	assert.equal(decodeEntities("automa&ccedil;&atilde;o &amp; IA").includes("&amp;"), false);
	assert.equal(normalizeAnchor("tr&aacute;fego &mdash; pago").includes("&mdash;"), false);
	assert.equal(normalizeAnchor("a &amp; b"), "a & b");
});

test("normalizePath ignora externo, âncora e mailto", () => {
	assert.equal(normalizePath("https://outrosite.com/x"), null);
	assert.equal(normalizePath("mailto:a@b.com"), null);
	assert.equal(normalizePath("#secao"), null);
	assert.equal(normalizePath("/x"), "/x/");
	assert.equal(normalizePath("/x/"), "/x/");
});

test("normalizePath trata URL absoluta do próprio site e tira query", () => {
	assert.equal(normalizePath("https://flowaidigital.com.br/x/"), "/x/");
	assert.equal(normalizePath("https://www.flowaidigital.com.br/x/"), "/x/");
	assert.equal(normalizePath("/x/?utm=1#top"), "/x/");
	assert.equal(normalizePath("https://flowaidigital.com.br/"), "/");
});

test("link só com imagem não conta como âncora de texto", () => {
	const links = extractLinks(page('<a href="/"><img src="/logo.png" alt="FlowAI"></a>'));
	assert.equal(links[0].isImageOnly, true);
	assert.equal(links[0].anchor, "");
});

// ─────────────────────────── regiões estruturais ────────────────────────

test("header, footer e nav são detectados como estruturais", () => {
	const html = page(
		'<header><a href="/a/">A</a></header><main><a href="/b/">B</a></main><footer><a href="/c/">C</a></footer>',
	);
	assert.equal(findStructuralRanges(html).length, 2);
	const links = extractLinks(html);
	const byDest = Object.fromEntries(links.map((l) => [l.dest, l.inNav]));
	assert.equal(byDest["/a/"], true, "header deveria ser estrutural");
	assert.equal(byDest["/b/"], false, "main não é estrutural");
	assert.equal(byDest["/c/"], true, "footer deveria ser estrutural");
});

test("breadcrumb conta como estrutural", () => {
	// markup real do site: o breadcrumb é um <nav class="crumbs">
	const links = extractLinks(page('<nav class="crumbs"><a href="/">Início</a></nav>'));
	assert.equal(links[0].inNav, true);
});

test("rodapé repetido NÃO vira falso positivo de anchor overuse", () => {
	// 10 páginas com rodapé idêntico: é assim que rodapé funciona
	const rodape = '<footer><a href="/servico/">Serviço</a></footer>';
	const pages = Array.from({ length: 10 }, (_, i) => ({
		path: `/p${i}/`,
		html: page(`<main><p>texto</p></main>${rodape}`),
	}));
	const known = new Set([...pages.map((p) => p.path), "/servico/"]);
	const r = auditLinks(pages, known);
	assert.equal(r.navLinks, 10);
	assert.equal(r.contextualLinks, 0);
	assert.equal(r.overuse.length, 0, "rodapé foi contado como link editorial");
});

// ─────────────────────────── auditoria ──────────────────────────────────

test("detecta página órfã", () => {
	const pages = [
		{ path: "/a/", html: page('<main><a href="/b/">B</a></main>') },
		{ path: "/b/", html: page('<main><a href="/a/">A</a></main>') },
		{ path: "/orfa/", html: page("<main>ninguém me linka</main>") },
	];
	const r = auditLinks(pages, new Set(["/a/", "/b/", "/orfa/"]));
	assert.deepEqual(r.orphans, ["/orfa/"]);
	assert.equal(r.passed, false);
});

test("detecta link quebrado", () => {
	const pages = [{ path: "/a/", html: page('<main><a href="/nao-existe/">X</a></main>') }];
	const r = auditLinks(pages, new Set(["/a/"]));
	assert.deepEqual(r.broken, ["/nao-existe/"]);
	assert.equal(r.passed, false);
});

test("a home não é considerada órfã", () => {
	const pages = [{ path: "/", html: page("<main>home</main>") }];
	const r = auditLinks(pages, new Set(["/"]));
	assert.deepEqual(r.orphans, []);
});

test("âncora descritiva repetida vira AVISO, não reprovação", () => {
	// Corpus realista: 5 páginas repetem a âncora do serviço, mas o site tem
	// muitos outros links contextuais — como no site real (5 de 39).
	const outros = Array.from({ length: 8 }, (_, j) => `<a href="/o${j}/">assunto ${j}</a>`).join("");
	const pages = Array.from({ length: 5 }, (_, i) => ({
		path: `/p${i}/`,
		// um rodapé liga todas entre si, como num site real — senão elas seriam órfãs
		html: page(
			`<main><a href="/tracking/">tracking e analytics</a>${outros}</main>` +
				`<footer>${Array.from({ length: 5 }, (_, j) => `<a href="/p${j}/">P${j}</a>`).join("")}</footer>`,
		),
	}));
	const known = new Set([
		...pages.map((p) => p.path),
		"/tracking/",
		...Array.from({ length: 8 }, (_, j) => `/o${j}/`),
	]);
	const r = auditLinks(pages, known);
	assert.ok(r.overuse.length >= 1, "deveria avisar sobre a repetição");
	assert.equal(
		r.concentrated.length,
		0,
		`5 links de ${r.contextualLinks} não é concentração do corpus`,
	);
	assert.equal(r.passed, true, "aviso de estilo não pode reprovar o gate");
});

test("concentração real de exact-match REPROVA", () => {
	// um único par destino+âncora domina o link interno contextual do site
	const pages = Array.from({ length: 12 }, (_, i) => ({
		path: `/p${i}/`,
		html: page('<main><a href="/alvo/">comprar agora barato</a></main>'),
	}));
	const known = new Set([...pages.map((p) => p.path), "/alvo/"]);
	const r = auditLinks(pages, known);
	assert.ok(r.concentrated.length >= 1, "deveria acusar concentração");
	assert.equal(r.passed, false);
});

test("relatório traz os números pedidos", () => {
	const pages = [
		{ path: "/a/", html: page('<main><a href="/b/">B</a><a href="/c/">C</a></main>') },
		{ path: "/b/", html: page('<main><a href="/a/">A</a></main>') },
		{ path: "/c/", html: page('<main><a href="/a/">início</a></main>') },
	];
	const r = auditLinks(pages, new Set(["/a/", "/b/", "/c/"]));
	assert.equal(r.totalLinks, 4);
	assert.equal(r.totalDestinations, 3);
	assert.equal(r.orphans.length, 0);
	assert.equal(r.broken.length, 0);
	assert.ok(Array.isArray(r.repetitions));
});
