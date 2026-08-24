#!/usr/bin/env node
// Prerender da home.
//
// PROBLEMA: a home é uma SPA Vite/React. O HTML servido tem só
// `<div id="root"></div>` — 7 palavras. Crawlers que não executam JavaScript
// (a maioria dos crawlers de IA) não encontram conteúdo nenhum.
//
// SOLUÇÃO: renderizar a home num Chromium de verdade em tempo de BUILD e
// gravar o DOM resultante dentro do `#root` do index.html.
//
// POR QUE ISTO NÃO É CLOAKING:
//   - o HTML gravado é EXATAMENTE o DOM que o navegador de um visitante produz;
//   - nada é escondido: sem display:none, sem off-screen, sem texto invisível;
//   - bot e visitante recebem o MESMO documento — não há detecção de user-agent;
//   - o bundle continua no lugar, e o React remonta a app por cima.
//
// SOBRE O REACT: o bundle usa `createRoot`, não `hydrateRoot`. Ou seja, ao
// montar ele SUBSTITUI o conteúdo do #root. Não há erro de hidratação nem
// duplicação — o markup estático é só o que fica visível até o JS assumir.
//
// SOBRE O flowai-enhancements.js: ele injeta elementos DEPOIS do React (item
// do nav, glow do logo). Durante a captura ele é bloqueado, senão o markup
// estático já viria com essas injeções e o script as aplicaria de novo no
// navegador, duplicando. No browser real ele roda normalmente, uma vez.

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, "dist");

const MIME = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".webp": "image/webp",
	".mp4": "video/mp4",
	".woff2": "font/woff2",
	".xml": "application/xml; charset=utf-8",
	".txt": "text/plain; charset=utf-8",
};

/** Servidor estático mínimo, só para o Chromium carregar o build. */
export function serveDist(dir = DIST, port = 0) {
	return new Promise((resolve) => {
		const server = http.createServer((req, res) => {
			const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
			let file = path.join(dir, url);
			if (url.endsWith("/")) file = path.join(file, "index.html");
			if (!file.startsWith(dir)) {
				res.writeHead(403).end("forbidden");
				return;
			}
			fs.readFile(file, (err, data) => {
				if (err) {
					res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
					res.end(fs.existsSync(path.join(dir, "404.html")) ? fs.readFileSync(path.join(dir, "404.html")) : "404");
					return;
				}
				res.writeHead(200, { "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream" });
				res.end(data);
			});
		});
		server.listen(port, "127.0.0.1", () => resolve({ server, port: server.address().port }));
	});
}

/** Conta palavras de texto visível, ignorando script e style. */
export function visibleWordCount(html) {
	return String(html ?? "")
		.replace(/<script[\s\S]*?<\/script>/gi, " ")
		.replace(/<style[\s\S]*?<\/style>/gi, " ")
		.replace(/<[^>]*>/g, " ")
		.split(/\s+/)
		.filter(Boolean).length;
}

export const MARK_START = "<!--prerender:start-->";
export const MARK_END = "<!--prerender:end-->";

/**
 * Substitui o conteúdo de <div id="root"> preservando todo o resto.
 *
 * IDEMPOTENTE por marcadores. Duas armadilhas motivaram este desenho:
 *
 * 1. Um regex `(<div id="root">)([\s\S]*?)(</div>)` parece resolver, mas o
 *    conteúdo prerenderizado tem divs aninhadas — o não-guloso casa até o
 *    PRIMEIRO `</div>` e deixa o resto órfão.
 * 2. Rodar o prerender duas vezes sobre o mesmo arquivo duplicava tudo:
 *    2 H1, ids repetidos. Aconteceu de verdade na suíte de testes.
 *
 * Com os marcadores, uma segunda passada substitui a região anterior em vez
 * de acumular.
 */
export function injectIntoRoot(html, inner) {
	const bloco = `${MARK_START}\n${inner}\n${MARK_END}`;

	// já prerenderizado: troca o miolo entre os marcadores
	const iStart = html.indexOf(MARK_START);
	const iEnd = html.indexOf(MARK_END);
	if (iStart !== -1 && iEnd !== -1 && iEnd > iStart) {
		return html.slice(0, iStart) + bloco + html.slice(iEnd + MARK_END.length);
	}

	// primeira passada: o #root da SPA vem vazio
	const vazio = /<div id="root"([^>]*)>\s*<\/div>/;
	if (vazio.test(html)) {
		return html.replace(vazio, (_m, attrs) => `<div id="root"${attrs}>\n${bloco}\n</div>`);
	}

	// #root com conteúdo mas sem marcador: recusa em vez de duplicar às cegas
	if (/<div id="root"/.test(html)) {
		throw new Error(
			'<div id="root"> já tem conteúdo sem marcador de prerender — recuso sobrescrever às cegas',
		);
	}
	throw new Error('não encontrei <div id="root"> no index.html');
}

/**
 * Remove blocos JSON-LD de tipos que vamos reinjetar.
 *
 * O index.html da SPA já traz um `Organization` inline, sem `@id` e mais pobre
 * que o nosso. Injetar o nosso sem tirar aquele deixaria DUAS entidades
 * Organization no mesmo documento — ambiguidade no grafo, exatamente o que o
 * `@id` existe para evitar.
 */
export function stripJsonLdTypes(html, tipos = ["Organization", "WebSite"]) {
	return String(html ?? "").replace(
		/<script type="application\/ld\+json">([\s\S]*?)<\/script>\s*/gi,
		(bloco, corpo) => {
			try {
				const json = JSON.parse(corpo.replace(/\\u003c/g, "<"));
				const t = Array.isArray(json) ? json.map((x) => x["@type"]) : [json["@type"]];
				return t.some((x) => tipos.includes(x)) ? "" : bloco;
			} catch {
				return bloco; // não é JSON válido: não mexe
			}
		},
	);
}

/** Insere blocos no <head>, logo antes do fechamento. */
export function injectIntoHead(html, snippet) {
	if (!snippet) return html;
	return html.replace("</head>", `${snippet}\n</head>`);
}

/**
 * Põe os stylesheets ANTES do primeiro `<script type="module">`.
 *
 * Diagnóstico que motivou isto: o LCP da home é o próprio H1, com render delay
 * de 0ms — ou seja, o texto pinta assim que o CSS chega. O gargalo era a
 * entrega do CSS, e o bundle de 112KB estava declarado ANTES dele. Módulos ES
 * disputam prioridade de rede com o stylesheet, que é render-blocking.
 *
 * A mudança é só de ORDEM no <head>: nenhum recurso é removido, adiado ou
 * alterado, e o resultado visual é idêntico — verificado por regressão de
 * pixel.
 */
export function cssBeforeModules(html) {
	const head = html.match(/<head>([\s\S]*?)<\/head>/i);
	if (!head) return html;

	const original = head[1];
	const primeiroModulo = original.search(/<script[^>]*type="module"/i);
	if (primeiroModulo === -1) return html;

	const links = [...original.matchAll(/[ \t]*<link[^>]*rel="stylesheet"[^>]*>\n?/gi)];
	// só reordena os stylesheets que hoje aparecem depois do primeiro módulo
	const atrasados = links.filter((m) => m.index > primeiroModulo);
	if (atrasados.length === 0) return html;

	let novo = original;
	for (const m of atrasados) novo = novo.replace(m[0], "");
	const css = atrasados.map((m) => m[0].trim()).join("\n    ");
	novo = novo.replace(/(<script[^>]*type="module"[^>]*>)/i, `${css}\n    $1`);

	return html.replace(original, novo);
}

export async function prerenderHome({
	dist = DIST,
	headSnippet = "",
	minWords = 100,
	timeoutMs = 60_000,
	log = console.log,
} = {}) {
	let chromium;
	try {
		({ chromium } = await import("playwright"));
	} catch {
		throw new Error(
			"playwright não instalado no site/ — rode `npm i -D playwright && npx playwright install chromium`",
		);
	}

	const indexPath = path.join(dist, "index.html");
	const original = fs.readFileSync(indexPath, "utf8");
	const antes = visibleWordCount(original);
	log(`home antes do prerender: ${antes} palavras visíveis no HTML`);

	const { server, port } = await serveDist(dist);
	const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-gpu"] });
	try {
		const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

		// bloqueia só o enhancement, para o markup capturado não trazer as
		// injeções que o próprio script refará no navegador do visitante
		await page.route("**/flowai-enhancements.js", (route) => route.abort());

		await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle", timeout: timeoutMs });

		// espera o React de fato pintar algo dentro do #root
		await page.waitForFunction(
			() => {
				const r = document.getElementById("root");
				return r && r.children.length > 0 && r.innerText.trim().split(/\s+/).length > 50;
			},
			{ timeout: timeoutMs },
		);

		const inner = await page.evaluate(() => document.getElementById("root").innerHTML);
		const texto = await page.evaluate(() => document.getElementById("root").innerText);
		const palavrasReais = texto.trim().split(/\s+/).filter(Boolean).length;

		let out = injectIntoRoot(original, inner);
		// CSS antes do bundle: o LCP e o H1 e o render delay e zero, entao o
		// que manda e a chegada do stylesheet
		out = cssBeforeModules(out);
		if (headSnippet) {
			// tira o Organization inline da SPA antes de pôr o nosso, com @id
			out = stripJsonLdTypes(out);
			out = injectIntoHead(out, headSnippet);
		}

		const depois = visibleWordCount(out);
		if (depois < minWords) {
			throw new Error(`prerender resultou em ${depois} palavras, abaixo do mínimo ${minWords}`);
		}

		fs.writeFileSync(indexPath, out, "utf8");
		log(`home depois do prerender: ${depois} palavras visíveis no HTML`);
		log(`texto real renderizado pelo React: ${palavrasReais} palavras`);
		return { antes, depois, palavrasReais, bytes: out.length };
	} finally {
		await browser.close().catch(() => {});
		server.close();
	}
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
	const { localBusinessSchema, websiteSchema, jsonLd } = await import("./lib/schema.mjs");
	prerenderHome({ headSnippet: jsonLd(localBusinessSchema(), websiteSchema()) })
		.then((r) => console.log(`\nPrerender concluído: ${r.antes} -> ${r.depois} palavras.`))
		.catch((e) => {
			console.error(`\nPrerender FALHOU: ${e.message}`);
			process.exit(1);
		});
}
