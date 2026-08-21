// Suíte do site canônico. Roda com: node --test site/test/
//
// O foco é o que quebra SEO em silêncio: canonical errado, título duplicado,
// URL no sitemap que não existe, catch-all 200 voltando, HTML sem conteúdo,
// e Markdown de LLM injetando HTML.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build, buildRobots, buildSitemap, buildRedirects } from "../build.mjs";
import { SERVICES } from "../content/services.mjs";
import { SITE_URL, canonicalFor, confirmedProfiles } from "../lib/site.mjs";
import { organizationSchema, faqSchema } from "../lib/schema.mjs";
import { renderMarkdown, safeHref, wordCount } from "../lib/markdown.mjs";
import { parseFrontMatter, validatePost, contentHash } from "../lib/content.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");

// Gera uma vez para toda a suíte.
const result = build({ quiet: true });

const read = (p) => fs.readFileSync(path.join(DIST, p), "utf8");
const exists = (p) => fs.existsSync(path.join(DIST, p));
const pageOf = (route) => read(path.join(route.slice(1), "index.html"));
const tagText = (html, tag) => {
	const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
	return m ? m[1].trim() : null;
};
const attr = (html, re) => {
	const m = html.match(re);
	return m ? m[1] : null;
};

// ─────────────────────────── rotas e arquivos ───────────────────────────

test("gera uma página para cada money page", () => {
	for (const s of SERVICES) {
		assert.ok(exists(path.join(s.slug, "index.html")), `faltou ${s.slug}`);
	}
	assert.equal(SERVICES.length, 13);
});

test("preserva a SPA da home byte a byte", () => {
	const src = fs.readFileSync(path.join(ROOT, "public", "index.html"));
	const out = fs.readFileSync(path.join(DIST, "index.html"));
	assert.deepEqual(out, src, "a home foi alterada — o visual aprovado deve ficar intacto");
});

test("preserva os assets da SPA", () => {
	assert.ok(exists("assets/index-C-j3JIV1.js"));
	assert.ok(exists("images/brand/flowai-logo.png"));
	const js = fs.statSync(path.join(DIST, "assets/index-C-j3JIV1.js"));
	assert.equal(js.size, 334445, "bundle da SPA mudou de tamanho");
});

test("gera 404.html com noindex", () => {
	assert.ok(exists("404.html"));
	const html = read("404.html");
	assert.match(html, /name="robots" content="noindex,follow"/);
	assert.ok(tagText(html, "h1"));
});

// ─────────────────────────── canonical e metadata ───────────────────────

test("canonicalFor normaliza barra final", () => {
	assert.equal(canonicalFor("/x"), `${SITE_URL}/x/`);
	assert.equal(canonicalFor("x/"), `${SITE_URL}/x/`);
	assert.equal(canonicalFor("/"), `${SITE_URL}/`);
});

test("toda money page tem canonical self-referente e absoluto", () => {
	for (const s of SERVICES) {
		const html = pageOf(`/${s.slug}/`);
		const c = attr(html, /rel="canonical" href="([^"]*)"/);
		assert.equal(c, `${SITE_URL}/${s.slug}/`, `canonical errado em ${s.slug}`);
	}
});

test("títulos são únicos entre todas as páginas geradas", () => {
	const titles = SERVICES.map((s) => tagText(pageOf(`/${s.slug}/`), "title"));
	titles.push(tagText(read("blog/index.html"), "title"));
	const dupes = titles.filter((t, i) => titles.indexOf(t) !== i);
	assert.deepEqual(dupes, [], `títulos duplicados: ${dupes.join(", ")}`);
});

test("meta descriptions são únicas", () => {
	const descs = SERVICES.map((s) =>
		attr(pageOf(`/${s.slug}/`), /name="description" content="([^"]*)"/),
	);
	const dupes = descs.filter((d, i) => descs.indexOf(d) !== i);
	assert.deepEqual(dupes, [], "meta description duplicada");
});

test("cada página tem exatamente um H1", () => {
	for (const s of SERVICES) {
		const n = (pageOf(`/${s.slug}/`).match(/<h1[\s>]/g) || []).length;
		assert.equal(n, 1, `${s.slug} tem ${n} H1`);
	}
});

test("nenhuma money page é noindex por acidente", () => {
	for (const s of SERVICES) {
		const r = attr(pageOf(`/${s.slug}/`), /name="robots" content="([^"]*)"/);
		assert.doesNotMatch(r ?? "", /noindex/, `${s.slug} está noindex`);
	}
});

// ─────────────────────────── conteúdo sem JS ────────────────────────────

test("conteúdo essencial aparece no HTML sem executar JavaScript", () => {
	for (const s of SERVICES) {
		const html = pageOf(`/${s.slug}/`);
		const visible = html
			.replace(/<script[\s\S]*?<\/script>/g, "")
			.replace(/<style[\s\S]*?<\/style>/g, "")
			.replace(/<[^>]*>/g, " ");
		const words = visible.split(/\s+/).filter(Boolean).length;
		assert.ok(words > 250, `${s.slug} só tem ${words} palavras no HTML`);
		assert.ok(html.includes(s.h1), `${s.slug}: H1 não está no HTML`);
		assert.ok(html.includes(s.problems[0].slice(0, 40)), `${s.slug}: conteúdo faltando`);
	}
});

// ─────────────────────────── structured data ────────────────────────────

test("cada money page tem Service, BreadcrumbList e FAQPage", () => {
	for (const s of SERVICES) {
		const html = pageOf(`/${s.slug}/`);
		const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
			.map((m) => JSON.parse(m[1].replace(/\\u003c/g, "<")));
		const types = blocks.map((b) => b["@type"]);
		assert.ok(types.includes("Service"), `${s.slug} sem Service`);
		assert.ok(types.includes("BreadcrumbList"), `${s.slug} sem BreadcrumbList`);
		assert.ok(types.includes("FAQPage"), `${s.slug} sem FAQPage`);
	}
});

test("FAQPage do schema corresponde exatamente ao FAQ visível", () => {
	for (const s of SERVICES) {
		const html = pageOf(`/${s.slug}/`);
		const block = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
			.map((m) => JSON.parse(m[1].replace(/\\u003c/g, "<")))
			.find((b) => b["@type"] === "FAQPage");
		assert.equal(block.mainEntity.length, s.faq.length);
		for (const q of s.faq) {
			assert.ok(html.includes(q.q), `${s.slug}: pergunta do schema não está visível: ${q.q}`);
		}
	}
});

test("Organization não emite sameAs sem perfil confirmado", () => {
	const org = organizationSchema();
	if (confirmedProfiles().length === 0) {
		assert.equal(org.sameAs, undefined, "sameAs não pode existir vazio ou com perfil não confirmado");
	}
});

test("Organization não inventa endereço, nota ou preço", () => {
	const org = JSON.stringify(organizationSchema());
	for (const proibido of ["aggregateRating", "review", "priceRange", "address", "Offer"]) {
		assert.ok(!org.includes(proibido), `Organization contém ${proibido} sem dado confirmado`);
	}
});

test("JSON-LD escapa < para não fechar o script", () => {
	const html = pageOf(`/${SERVICES[0].slug}/`);
	const inside = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
	assert.ok(!inside.includes("</"), "JSON-LD com </ literal pode fechar a tag antes da hora");
});

// ─────────────────────────── sitemap ────────────────────────────────────

test("toda URL do sitemap corresponde a um arquivo gerado", () => {
	const xml = read("sitemap.xml");
	const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
	assert.ok(locs.length > 0);
	for (const loc of locs) {
		const route = loc.replace(SITE_URL, "");
		const file = route === "/" ? "index.html" : path.join(route.slice(1), "index.html");
		assert.ok(exists(file), `sitemap aponta para ${route} que não existe`);
	}
});

test("sitemap não inclui 404 nem placeholder", () => {
	const xml = read("sitemap.xml");
	assert.ok(!xml.includes("404"), "404 no sitemap");
});

test("sitemap não inclui artigo não publicado", () => {
	const xml = read("sitemap.xml");
	const naoPublicados = result.all.filter((p) => p.status !== "published");
	for (const p of naoPublicados) {
		assert.ok(!xml.includes(`/blog/${p.slug}/`), `${p.slug} está no sitemap sem estar publicado`);
	}
});

test("lastmod é data real, nunca no futuro", () => {
	const xml = read("sitemap.xml");
	const hoje = new Date().toISOString().slice(0, 10);
	for (const m of xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)) {
		assert.match(m[1], /^\d{4}-\d{2}-\d{2}$/);
		assert.ok(m[1] <= hoje, `lastmod no futuro: ${m[1]}`);
	}
});

test("buildSitemap omite lastmod quando não há data conhecida", () => {
	const xml = buildSitemap([{ path: "/x/", lastmod: null, priority: "0.5", changefreq: "weekly" }]);
	assert.ok(!xml.includes("<lastmod>"), "não deve inventar lastmod");
});

// ─────────────────────────── redirects e robots ─────────────────────────

test("_redirects NÃO tem catch-all 200 (causa raiz do soft-404)", () => {
	const r = buildRedirects();
	const regras = r.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
	for (const linha of regras) {
		assert.ok(
			!/^\/\*\s+\/index\.html\s+200/.test(linha.trim()),
			`catch-all 200 voltou: ${linha}`,
		);
	}
});

test("_redirects manda www para o apex com 301 preservando path", () => {
	const r = buildRedirects();
	assert.match(r, /www\.flowaidigital\.com\.br\/\*/);
	assert.match(r, /:splat/);
	assert.match(r, /301/);
});

test("robots permite crawlers de busca generativa", () => {
	const r = buildRobots();
	for (const bot of [
		"OAI-SearchBot",
		"ChatGPT-User",
		"PerplexityBot",
		"Perplexity-User",
		"Claude-SearchBot",
		"Claude-User",
		"Googlebot",
		"Bingbot",
	]) {
		const bloco = r.match(new RegExp(`User-agent: ${bot}\\n(Allow|Disallow): /`));
		assert.ok(bloco, `${bot} ausente do robots`);
		assert.equal(bloco[1], "Allow", `${bot} deveria ser Allow`);
	}
});

test("robots bloqueia crawlers de treinamento", () => {
	const r = buildRobots();
	for (const bot of ["GPTBot", "ClaudeBot", "CCBot", "Google-Extended", "Bytespider"]) {
		const bloco = r.match(new RegExp(`User-agent: ${bot}\\n(Allow|Disallow): /`));
		assert.ok(bloco, `${bot} ausente do robots`);
		assert.equal(bloco[1], "Disallow", `${bot} deveria ser Disallow`);
	}
});

test("robots declara o sitemap", () => {
	assert.match(buildRobots(), new RegExp(`Sitemap: ${SITE_URL}/sitemap\\.xml`));
});

// ─────────────────────────── internal linking ───────────────────────────

test("nenhuma money page é órfã — o rodapé linka todas", () => {
	const html = pageOf(`/${SERVICES[0].slug}/`);
    for (const s of SERVICES) {
		assert.ok(html.includes(`href="/${s.slug}/"`), `${s.slug} não é linkada pelo rodapé`);
	}
});

test("links internos apontam para rotas que existem", () => {
	const rotas = new Set(result.routes.map((r) => r.path));
	for (const s of SERVICES) {
		const html = pageOf(`/${s.slug}/`);
		const hrefs = [...html.matchAll(/href="(\/[a-z0-9/-]*\/)"/g)].map((m) => m[1]);
		for (const h of new Set(hrefs)) {
			assert.ok(rotas.has(h), `${s.slug} linka para ${h}, que não existe`);
		}
	}
});

test("cada money page tem breadcrumb navegável", () => {
	for (const s of SERVICES) {
		const html = pageOf(`/${s.slug}/`);
		assert.match(html, /class="crumbs"/, `${s.slug} sem breadcrumb`);
		assert.match(html, /aria-current="page"/, `${s.slug} sem marcação da página atual`);
	}
});

// ─────────────────────────── markdown seguro ────────────────────────────

test("markdown escapa HTML bruto — LLM não injeta tag", () => {
	const html = renderMarkdown('Texto <script>alert("x")</script> e <img src=x onerror=y>');
	assert.ok(!html.includes("<script"), "script passou");
	assert.ok(!html.includes("<img"), "img passou");
	assert.ok(html.includes("&lt;script&gt;"));
});

test("markdown bloqueia href perigoso", () => {
	assert.equal(safeHref("javascript:alert(1)"), null);
	assert.equal(safeHref("data:text/html;base64,PHN2Zz4="), null);
	assert.equal(safeHref("//evil.com"), null);
	assert.equal(safeHref("https://ok.com"), "https://ok.com");
	assert.equal(safeHref("/interna/"), "/interna/");
});

test("link com esquema perigoso vira texto puro", () => {
	const html = renderMarkdown("[clique](javascript:alert(1))");
	assert.ok(!html.includes("javascript:"), "javascript: sobreviveu");
	assert.ok(html.includes("clique"));
});

test("markdown converte estruturas básicas", () => {
	assert.match(renderMarkdown("## Título"), /<h3>Título<\/h3>/);
	assert.match(renderMarkdown("- a\n- b"), /<ul><li>a<\/li><li>b<\/li><\/ul>/);
	assert.match(renderMarkdown("1. a\n2. b"), /<ol>/);
	assert.match(renderMarkdown("**forte**"), /<strong>forte<\/strong>/);
	assert.match(renderMarkdown("[x](https://a.com)"), /rel="nofollow noopener"/);
});

test("H1 do markdown vira H2 — o H1 da página é o título", () => {
	assert.match(renderMarkdown("# Um"), /<h2>Um<\/h2>/);
	assert.ok(!renderMarkdown("# Um").includes("<h1>"));
});

test("wordCount ignora marcação", () => {
	assert.equal(wordCount("**uma** duas [três](http://x)"), 3);
});

// ─────────────────────────── validação de artigo ────────────────────────

const postValido = {
	id: "a1",
	slug: "meu-artigo",
	title: "Um título",
	metaDescription: "Uma descrição.",
	primaryKeyword: "kw",
	intent: "informacional",
	cluster: "ia",
	author: "Juliano Damaso",
	status: "draft",
	createdAt: "2026-08-01",
};

test("artigo válido passa", () => {
	assert.deepEqual(validatePost({ ...postValido }), []);
});

test("campo obrigatório ausente é reprovado", () => {
	const errs = validatePost({ ...postValido, author: "" });
	assert.ok(errs.some((e) => e.includes("author")));
});

test("slug inválido é reprovado", () => {
	assert.ok(validatePost({ ...postValido, slug: "Com Espaço" }).some((e) => e.includes("slug")));
	assert.ok(validatePost({ ...postValido, slug: "MAIUSCULA" }).some((e) => e.includes("slug")));
});

test("slug duplicado é reprovado", () => {
	const a = { ...postValido };
	const b = { ...postValido, id: "a2" };
	assert.ok(validatePost(a, [a, b]).some((e) => e.includes("duplicado")));
});

test("published sem publishedAt é reprovado", () => {
	const errs = validatePost({ ...postValido, status: "published" });
	assert.ok(errs.some((e) => e.includes("publishedAt")));
});

test("data no futuro é reprovada — não simular cronograma", () => {
	const errs = validatePost({ ...postValido, createdAt: "2099-01-01" });
	assert.ok(errs.some((e) => e.includes("futuro")));
});

test("status e intent fora do vocabulário são reprovados", () => {
	assert.ok(validatePost({ ...postValido, status: "qualquer" }).some((e) => e.includes("status")));
	assert.ok(validatePost({ ...postValido, intent: "qualquer" }).some((e) => e.includes("intent")));
});

test("front matter lê escalares, listas e objetos inline", () => {
	const { data, body } = parseFrontMatter(
		`---\ntitle: "Oi"\nstatus: published\nwordCountAlvo: 900\nsecondaryKeywords: [a, b]\nsources:\n  - {url: https://x.com, title: Fonte X}\n---\nCorpo aqui.`,
	);
	assert.equal(data.title, "Oi");
	assert.equal(data.status, "published");
	assert.equal(data.wordCountAlvo, 900);
	assert.deepEqual(data.secondaryKeywords, ["a", "b"]);
	assert.equal(data.sources[0].url, "https://x.com");
	assert.equal(body.trim(), "Corpo aqui.");
});

// ─────────────────────────── idempotência ───────────────────────────────

test("hash de conteúdo é estável e sensível a mudança", () => {
	const d = { title: "t", metaDescription: "d" };
	assert.equal(contentHash("corpo", d), contentHash("corpo", d));
	assert.notEqual(contentHash("corpo", d), contentHash("corpo!", d));
});

test("build é determinístico — rodar duas vezes dá o mesmo HTML", () => {
	const antes = read("agentes-de-ia-para-empresas/index.html");
	build({ quiet: true });
	const depois = read("agentes-de-ia-para-empresas/index.html");
	assert.equal(antes, depois, "build não é determinístico");
});

test("toda money page carrega o grafo de entidade (Organization + WebSite)", () => {
	for (const s of SERVICES) {
		const html = pageOf(`/${s.slug}/`);
		const tipos = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
			.map((m) => JSON.parse(m[1].replace(/\u003c/g, "<"))["@type"]);
		assert.ok(tipos.includes("Organization"), `${s.slug} sem Organization`);
		assert.ok(tipos.includes("WebSite"), `${s.slug} sem WebSite`);
	}
});

test("o blog index também carrega o grafo de entidade", () => {
	const tipos = [...read("blog/index.html").matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
		.map((m) => JSON.parse(m[1].replace(/\u003c/g, "<"))["@type"]);
	assert.ok(tipos.includes("Organization"));
	assert.ok(tipos.includes("WebSite"));
});

test("WebSite referencia a Organization pelo mesmo @id", () => {
	const html = pageOf(`/${SERVICES[0].slug}/`);
	const blocos = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
		.map((m) => JSON.parse(m[1].replace(/\u003c/g, "<")));
	const org = blocos.find((b) => b["@type"] === "Organization");
	const site = blocos.find((b) => b["@type"] === "WebSite");
	assert.equal(site.publisher["@id"], org["@id"], "WebSite aponta para outro @id");
});
