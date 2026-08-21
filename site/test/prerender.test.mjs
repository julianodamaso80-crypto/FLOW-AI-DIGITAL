// Testes do prerender da home.
//
// Os testes que dependem do Chromium só rodam quando o dist já foi
// prerenderizado (`npm run build`). Os unitários rodam sempre.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	injectIntoRoot,
	injectIntoHead,
	visibleWordCount,
	stripJsonLdTypes,
} from "../prerender.mjs";
import { organizationSchema, websiteSchema } from "../lib/schema.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOME = path.join(ROOT, "dist", "index.html");

// ─────────────────────────── unitários ──────────────────────────────────

test("visibleWordCount ignora script e style", () => {
	const html = `<html><head><style>body{color:red}</style></head>
    <body><p>uma duas três</p><script>var a=1,b=2,c=3,d=4,e=5;</script></body></html>`;
	assert.ok(visibleWordCount(html) < 8, `contou script/style: ${visibleWordCount(html)}`);
});

test("injectIntoRoot substitui o conteúdo do #root preservando o resto", () => {
	const html = `<html><head><title>T</title></head><body><div id="root"></div><script src="/a.js"></script></body></html>`;
	const out = injectIntoRoot(html, "<main><h1>Oi</h1></main>");
	assert.match(out, /<h1>Oi<\/h1>/);
	assert.match(out, /<script src="\/a\.js">/, "os scripts têm que continuar");
	assert.match(out, /<div id="root"/, "o #root precisa continuar existindo");
	assert.equal((out.match(/id="root"/g) || []).length, 1, "duplicou o #root");
});

test("injectIntoRoot falha alto se não achar o #root", () => {
	assert.throws(() => injectIntoRoot("<html><body></body></html>", "x"), /root/);
});

test("injectIntoHead insere antes de fechar o head", () => {
	const out = injectIntoHead("<html><head><title>T</title></head><body></body></html>", "<script>x</script>");
	assert.match(out, /<script>x<\/script>\s*<\/head>/);
});

test("injectIntoHead sem snippet devolve o html intacto", () => {
	const html = "<html><head></head></html>";
	assert.equal(injectIntoHead(html, ""), html);
});

// ─────────────────────────── dist prerenderizado ────────────────────────
//
// O teste roda o prerender no SEU PRÓPRIO dist, copiado para um diretório
// temporário. Sem isso haveria corrida com build.test.mjs, que regenera
// site/dist e apagaria a home prerenderizada no meio da suíte.

const TMP = path.join(ROOT, ".tmp-prerender-test");

function copyDir(src, dest) {
	fs.mkdirSync(dest, { recursive: true });
	for (const e of fs.readdirSync(src, { withFileTypes: true })) {
		const s = path.join(src, e.name);
		const d = path.join(dest, e.name);
		if (e.isDirectory()) copyDir(s, d);
		else fs.copyFileSync(s, d);
	}
}

let homeHtml = null;
let motivoSkip = null;

try {
	if (!fs.existsSync(HOME)) {
		const { build } = await import("../build.mjs");
		build({ quiet: true });
	}
	fs.rmSync(TMP, { recursive: true, force: true });
	copyDir(path.join(ROOT, "dist"), TMP);

	const { prerenderHome } = await import("../prerender.mjs");
	const { organizationSchema, websiteSchema } = await import("../lib/schema.mjs");
	const { jsonLd } = await import("../lib/schema.mjs");
	await prerenderHome({
		dist: TMP,
		headSnippet: jsonLd(organizationSchema(), websiteSchema()),
		log: () => {},
	});
	homeHtml = fs.readFileSync(path.join(TMP, "index.html"), "utf8");
} catch (err) {
	motivoSkip = `prerender indisponível: ${err.message}`;
} finally {
	fs.rmSync(TMP, { recursive: true, force: true });
}

const opts = homeHtml ? {} : { skip: motivoSkip ?? "prerender não executado" };
const home = () => homeHtml;

test("home tem conteúdo substantivo no HTML, sem JavaScript", opts, () => {
	const palavras = visibleWordCount(home());
	assert.ok(palavras > 100, `só ${palavras} palavras — o crawler sem JS não veria conteúdo`);
});

test("home tem exatamente um H1 no HTML inicial", opts, () => {
	const html = home();
	const n = (html.match(/<h1[\s>]/g) || []).length;
	assert.equal(n, 1, `home tem ${n} H1`);
	const texto = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1].replace(/<[^>]*>/g, "").trim();
	assert.ok(texto.length > 10, "H1 vazio ou curto demais");
});

test("home carrega Organization no HTML inicial", opts, () => {
	const blocos = [...home().matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
		.map((m) => JSON.parse(m[1].replace(/\\u003c/g, "<")));
	const org = blocos.find((b) => b["@type"] === "Organization");
	assert.ok(org, "home sem Organization");
	assert.equal(org["@id"], organizationSchema()["@id"], "@id diferente do resto do site");
});

test("home carrega WebSite apontando para a mesma Organization", opts, () => {
	const blocos = [...home().matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
		.map((m) => JSON.parse(m[1].replace(/\\u003c/g, "<")));
	const site = blocos.find((b) => b["@type"] === "WebSite");
	assert.ok(site, "home sem WebSite");
	assert.equal(site.publisher["@id"], websiteSchema().publisher["@id"]);
});

test("home mantém canonical do apex", opts, () => {
	assert.match(home(), /rel="canonical" href="https:\/\/flowaidigital\.com\.br\/"/);
});

test("prerender não duplicou elementos críticos no HTML", opts, () => {
	const html = home();
	assert.equal((html.match(/id="root"/g) || []).length, 1, "#root duplicado");
	// ids repetidos quebram âncora e acessibilidade
	const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
	const vistos = new Set();
	const dup = ids.filter((i) => (vistos.has(i) ? true : (vistos.add(i), false)));
	assert.deepEqual([...new Set(dup)], [], "ids duplicados no HTML");
});

test("prerender preserva os scripts da SPA — a página segue interativa", opts, () => {
	const html = home();
	assert.match(html, /src="\/assets\/index-C-j3JIV1\.js"/, "bundle principal sumiu");
	assert.match(html, /src="\/assets\/flowai-enhancements\.js"/, "enhancements sumiu");
});

test("prerender não escondeu conteúdo — nada de cloaking", opts, () => {
	const html = home();
	// texto que só o bot veria seria escondido por CSS; isso não pode existir
	for (const padrao of [/display\s*:\s*none[^"]*"[^>]*>[^<]{80,}/i, /visibility\s*:\s*hidden[^"]*"[^>]*>[^<]{80,}/i]) {
		assert.doesNotMatch(html, padrao, "há bloco de texto escondido por CSS");
	}
	assert.doesNotMatch(html, /text-indent\s*:\s*-\d{4}/i, "texto empurrado para fora da tela");
});

test("home não fica com Organization duplicada", opts, () => {
	const tipos = [...home().matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
		.map((m) => JSON.parse(m[1].replace(/\u003c/g, "<"))["@type"]);
	const org = tipos.filter((t) => t === "Organization").length;
	const site = tipos.filter((t) => t === "WebSite").length;
	assert.equal(org, 1, `home tem ${org} blocos Organization`);
	assert.equal(site, 1, `home tem ${site} blocos WebSite`);
});

test("stripJsonLdTypes remove só os tipos pedidos", () => {
	const html = `<head>
<script type="application/ld+json">{"@type":"Organization","name":"antiga"}</script>
<script type="application/ld+json">{"@type":"BreadcrumbList","x":1}</script>
</head>`;
	const out = stripJsonLdTypes(html, ["Organization"]);
	assert.ok(!out.includes("antiga"), "Organization antiga sobreviveu");
	assert.ok(out.includes("BreadcrumbList"), "removeu tipo que não devia");
});

test("stripJsonLdTypes não quebra com JSON inválido", () => {
	const html = '<script type="application/ld+json">{isso não é json}</script>';
	assert.equal(stripJsonLdTypes(html), html);
});
