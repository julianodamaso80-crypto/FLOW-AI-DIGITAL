#!/usr/bin/env node
// Gerador do site canônico da FlowAI Digital.
//
// Entrada:  site/public (build da SPA, intocado) + site/content
// Saída:    site/dist   (pronto para deploy no Cloudflare Pages)
//
// Princípios:
//   - a SPA 3D da home é copiada byte a byte, nunca regerada;
//   - money pages e blog são HTML completo, sem depender de JavaScript;
//   - sitemap sai das rotas REALMENTE geradas, nunca de uma lista à mão;
//   - _redirects não tem catch-all 200 — URL inexistente devolve 404 de verdade.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { SERVICES } from "./content/services.mjs";
import { SITE_URL, indexNowKeyFile } from "./lib/site.mjs";
import {
	localBusinessSchema,
	personSchema,
	websiteSchema,
	serviceSchema,
	breadcrumbSchema,
	faqSchema,
	articleSchema,
	jsonLd,
} from "./lib/schema.mjs";
import {
	renderService,
	renderBlogIndex,
	renderArticle,
	renderNotFound,
} from "./lib/render.mjs";
import { renderMarkdown } from "./lib/markdown.mjs";
import { loadPosts, publishedPosts, validatePost } from "./lib/content.mjs";
import { ga4Snippet } from "./lib/analytics.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, "public");
const DIST = path.join(ROOT, "dist");
const BLOG_DIR = path.join(ROOT, "content", "blog");

/** Data do último commit que tocou o arquivo — lastmod que reflete mudança real. */
function gitLastModified(file) {
	try {
		const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", file], {
			cwd: ROOT,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
		if (/^\d{4}-\d{2}-\d{2}$/.test(out)) return out;
	} catch {
		/* fora de git ou arquivo novo — cai no fallback */
	}
	try {
		return fs.statSync(file).mtime.toISOString().slice(0, 10);
	} catch {
		return null;
	}
}

function copyDir(src, dest) {
	fs.mkdirSync(dest, { recursive: true });
	for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
		const s = path.join(src, entry.name);
		const d = path.join(dest, entry.name);
		if (entry.isDirectory()) copyDir(s, d);
		else fs.copyFileSync(s, d);
	}
}

/** Concatena blocos de JSON-LD já serializados, um por linha. */
function joinLd(...blocos) {
	return blocos.filter(Boolean).join("\n");
}

function writePage(routePath, html) {
	// "/x/" -> dist/x/index.html   |   "/404.html" -> dist/404.html
	const rel = routePath.endsWith("/")
		? path.join(routePath.slice(1), "index.html")
		: routePath.slice(1);
	const full = path.join(DIST, rel);
	fs.mkdirSync(path.dirname(full), { recursive: true });
	fs.writeFileSync(full, html, "utf8");
}

export function build({ quiet = false } = {}) {
	const log = (...a) => !quiet && console.log(...a);

	// Sem GA4_MEASUREMENT_ID o snippet sai vazio — nunca inventamos ID.
	const GA4_ID = process.env.GA4_MEASUREMENT_ID ?? "";
	const analytics = (pageType, slug) => ga4Snippet(GA4_ID, { pageType, pageSlug: slug });
	if (GA4_ID) log("GA4 ativo"); else log("GA4 inativo (GA4_MEASUREMENT_ID ausente)");

	fs.rmSync(DIST, { recursive: true, force: true });
	fs.mkdirSync(DIST, { recursive: true });

	// 1. SPA + assets, byte a byte. O visual aprovado não é tocado.
	copyDir(PUBLIC, DIST);
	log(`SPA e assets copiados de public/`);

	/** Rotas indexáveis, alimentam o sitemap. */
	const routes = [];

	// 2. Home — é a SPA. Entra no sitemap, mas o HTML não é regerado.
	routes.push({
		path: "/",
		lastmod: gitLastModified(path.join(PUBLIC, "index.html")),
		priority: "1.0",
		changefreq: "weekly",
	});

	// Grafo de entidade: vai em toda página gerada, não só na home.
	// ProfessionalService no lugar de Organization: subtipo mais especifico, mesmo
	// @id — a FlowAI atende do Rio e o guia do Google trata negocio local a parte.
	const entityLd = jsonLd(localBusinessSchema(), websiteSchema());

	// 3. Money pages
	const servicesLastmod = gitLastModified(path.join(ROOT, "content", "services.mjs"));
	for (const svc of SERVICES) {
		const route = `/${svc.slug}/`;
		const ld = joinLd(entityLd, jsonLd(
			serviceSchema({
				name: svc.breadcrumbLabel,
				description: svc.metaDescription,
				path: route,
			}),
			breadcrumbSchema([
				{ name: "Início", path: "/" },
				{ name: svc.breadcrumbLabel, path: route },
			]),
			// mesma lista que é renderizada na página — schema e conteúdo casam
			faqSchema(svc.faq),
		));
		writePage(route, renderService(svc, SERVICES, ld, analytics("money", svc.slug)));
		routes.push({
			path: route,
			lastmod: servicesLastmod,
			priority: "0.8",
			changefreq: "monthly",
		});
	}
	log(`${SERVICES.length} money pages geradas`);

	// 4. Blog
	const all = loadPosts(BLOG_DIR);
	const invalid = [];
	for (const p of all) {
		const errs = validatePost(p, all);
		if (errs.length) invalid.push({ slug: p.slug, errs });
	}
	if (invalid.length) {
		for (const i of invalid) {
			console.error(`ARTIGO INVÁLIDO ${i.slug}: ${i.errs.join(" | ")}`);
		}
		throw new Error(
			`${invalid.length} artigo(s) reprovado(s) na validação estrutural — build abortado.`,
		);
	}

	const published = publishedPosts(all);
	for (const post of published) {
		const route = `/blog/${post.slug}/`;
		const ld = joinLd(entityLd, jsonLd(
			...(post.author ? [personSchema({ name: post.author })] : []),
			articleSchema({
				headline: post.title,
				description: post.metaDescription,
				path: route,
				datePublished: post.publishedAt,
				dateModified: post.updatedAt,
				authorName: post.author,
				image: post.image,
			}),
			breadcrumbSchema([
				{ name: "Início", path: "/" },
				{ name: "Blog", path: "/blog/" },
				{ name: post.title, path: route },
			]),
		));
		writePage(route, renderArticle(post, renderMarkdown(post.body), SERVICES, ld, analytics("blog_post", post.slug)));
		routes.push({
			path: route,
			lastmod: (post.updatedAt || post.publishedAt || "").slice(0, 10) || null,
			priority: "0.7",
			changefreq: "monthly",
		});
	}

	const blogLd = joinLd(entityLd, jsonLd(breadcrumbSchema([
		{ name: "Início", path: "/" },
		{ name: "Blog", path: "/blog/" },
	])));
	writePage("/blog/", renderBlogIndex(published, SERVICES, blogLd, analytics("blog_index", "blog")));
	routes.push({
		path: "/blog/",
		// index do blog muda quando o artigo mais recente muda
		lastmod: published[0]?.updatedAt || published[0]?.publishedAt || servicesLastmod,
		priority: "0.6",
		changefreq: "weekly",
	});
	log(`blog: ${published.length} publicado(s), ${all.length - published.length} não publicado(s)`);

	// 5. 404 real
	writePage("/404.html", renderNotFound(SERVICES));

	// 6. robots.txt — política de busca vs. treinamento
	fs.writeFileSync(path.join(DIST, "robots.txt"), buildRobots(), "utf8");

	// 7. sitemap.xml — só o que foi realmente gerado
	fs.writeFileSync(path.join(DIST, "sitemap.xml"), buildSitemap(routes), "utf8");

	// 8. _redirects — SEM catch-all 200 (era a causa raiz do soft-404)
	fs.writeFileSync(path.join(DIST, "_redirects"), buildRedirects(), "utf8");

	// 9. _headers
	fs.writeFileSync(path.join(DIST, "_headers"), buildHeaders(), "utf8");

	// Verificação do IndexNow. Sem chave, nada é escrito — o protocolo recusa
	// submissão de host que não serve /{chave}.txt, e chave inventada seria pior
	// que chave nenhuma.
	const indexNow = indexNowKeyFile(process.env.INDEXNOW_KEY);
	if (indexNow) {
		fs.writeFileSync(path.join(DIST, indexNow.name), indexNow.content, "utf8");
		log(`IndexNow ativo (${indexNow.name})`);
	} else {
		log("IndexNow inativo (INDEXNOW_KEY ausente)");
	}

	log(`sitemap com ${routes.length} URLs`);
	return { routes, published, all };
}

export function buildRobots() {
	// Busca e citação: permitido. Treinamento de modelo: bloqueado.
	// GPTBot e ClaudeBot NÃO são necessários para ChatGPT Search / Claude Search.
	// Google-Extended segue bloqueado — não tem relação com AI Overviews.
	return `# Buscadores tradicionais
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

# Buscadores generativos — descoberta e citação
User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: Claude-User
Allow: /

# Coleta para treinamento de modelo — não autorizada
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: meta-externalagent
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: Amazonbot
Disallow: /

# Demais crawlers
User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

export function buildSitemap(routes) {
	const urls = routes
		.map((r) => {
			const lastmod = r.lastmod ? `\n    <lastmod>${r.lastmod}</lastmod>` : "";
			return `  <url>
    <loc>${SITE_URL}${r.path}</loc>${lastmod}
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`;
		})
		.join("\n");
	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function buildRedirects() {
	// Sem "/* /index.html 200". Arquivo inexistente cai no 404.html do Pages.
	return `# Host canônico: apex. Preserva path e query via :splat.
https://www.flowaidigital.com.br/*  https://flowaidigital.com.br/:splat  301!

# ATENÇÃO: não reintroduzir "/* /index.html 200".
# Essa regra fazia TODA URL inexistente responder 200 com a home (soft-404),
# criando espaço de URL infinito e duplicação em massa.
`;
}

export function buildHeaders() {
	return `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/images/*
  Cache-Control: public, max-age=31536000, immutable

/media/*
  Cache-Control: public, max-age=604800

/*.html
  Cache-Control: public, max-age=0, must-revalidate
`;
}

// Execução direta
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
	try {
		const r = build();
		console.log(`\nBuild concluído em site/dist — ${r.routes.length} rotas.`);
	} catch (e) {
		console.error(`\nBuild FALHOU: ${e.message}`);
		process.exit(1);
	}
}
