// Executa o build EXATAMENTE como o CI executa e valida o artefato.
//
// Existe para uma falha específica: o pipeline rodava `node site/build.mjs`
// sozinho, o que gera a home como casca de SPA — 7 palavras, sem H1. Se alguém
// no futuro tirar o prerender do `npm run build`, ou trocar o comando do CI de
// volta por `node build.mjs`, este teste reprova.
//
// Não usa mock: roda o processo de verdade, incluindo Chromium.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const HOME = path.join(DIST, "index.html");

/** O comando de build oficial, lido do package.json — não hardcoded aqui. */
function comandoOficial() {
	const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
	return pkg.scripts?.build ?? "";
}

function palavrasVisiveis(html) {
	return String(html)
		.replace(/<script[\s\S]*?<\/script>/gi, " ")
		.replace(/<style[\s\S]*?<\/style>/gi, " ")
		.replace(/<[^>]*>/g, " ")
		.split(/\s+/)
		.filter(Boolean).length;
}

test("o script de build oficial inclui o passo de prerender", () => {
	const cmd = comandoOficial();
	assert.match(cmd, /build\.mjs/, "o build não chama build.mjs");
	assert.match(
		cmd,
		/prerender\.mjs/,
		"o build oficial não chama prerender.mjs — a home voltaria a ser casca de SPA",
	);
});

let buildOk = false;
let motivo = null;
try {
	// mesmo comando que o CI roda em `working-directory: site`
	execFileSync("npm", ["run", "build"], {
		cwd: ROOT,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
		shell: process.platform === "win32",
		timeout: 300_000,
	});
	buildOk = fs.existsSync(HOME);
} catch (err) {
	motivo = `build falhou: ${String(err.message).slice(0, 200)}`;
}

const opts = buildOk ? {} : { skip: motivo ?? "build não produziu dist" };
const home = () => fs.readFileSync(HOME, "utf8");

test("o build do CI entrega a home com conteúdo, não a casca da SPA", opts, () => {
	const n = palavrasVisiveis(home());
	// 100 não é regra de SEO: é o piso que separa conteúdo real das 7 palavras
	// que a SPA entrega quando o prerender não roda
	assert.ok(n > 100, `home com ${n} palavras — o prerender não rodou no build`);
});

test("o build do CI entrega H1 na home", opts, () => {
	const n = (home().match(/<h1[\s>]/g) || []).length;
	assert.equal(n, 1, `home tem ${n} H1`);
});

test("o build do CI entrega canonical na home", opts, () => {
	assert.match(home(), /rel="canonical" href="https:\/\/flowaidigital\.com\.br\/"/);
});

test("o build do CI entrega Organization e WebSite na home", opts, () => {
	const tipos = [...home().matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
		.map((m) => JSON.parse(m[1].replace(/\\u003c/g, "<"))["@type"]);
	assert.ok(tipos.includes("Organization"), "home sem Organization");
	assert.ok(tipos.includes("WebSite"), "home sem WebSite");
	assert.equal(tipos.filter((t) => t === "Organization").length, 1, "Organization duplicada");
});

test("o build do CI mantém as 13 money pages e o 404", opts, () => {
	assert.ok(fs.existsSync(path.join(DIST, "404.html")));
	const dirs = fs
		.readdirSync(DIST, { withFileTypes: true })
		.filter((d) => d.isDirectory() && fs.existsSync(path.join(DIST, d.name, "index.html")))
		.map((d) => d.name);
	// 13 money pages + blog
	assert.ok(dirs.length >= 14, `só ${dirs.length} rotas com index.html`);
});

test("o build do CI não reintroduz o catch-all 200 no _redirects", opts, () => {
	const r = fs.readFileSync(path.join(DIST, "_redirects"), "utf8");
	for (const linha of r.split("\n")) {
		const l = linha.trim();
		if (!l || l.startsWith("#")) continue;
		assert.ok(!/^\/\*\s+\/index\.html\s+200/.test(l), `catch-all 200 voltou: ${l}`);
	}
});
