// Templates HTML das páginas estáticas (money pages, blog, 404).
//
// Regra estruturante: TODO conteúdo essencial de SEO sai no HTML da resposta.
// Nada aqui depende de JavaScript. A SPA 3D continua intocada na home — estas
// páginas são documentos próprios que reusam a identidade visual do site.
//
// Paleta e cabeçalho extraídos do /blog/ que já está em produção, para que as
// novas páginas não destoem do visual aprovado.

import { SITE_NAME, SITE_URL, WHATSAPP_DISPLAY, buildWaLink } from "./site.mjs";

const esc = (s) =>
	String(s ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");

export const BASE_CSS = `
:root{
  --orange:#ff6a00; --amber:#ffb347; --cream:#fff2e2;
  --graphite:#2b313a; --deep:#0f141b; --black:#070a0f;
  --muted:rgba(255,242,226,.72); --line:rgba(255,179,71,.18);
}
*{box-sizing:border-box;}
html{scroll-behavior:smooth;}
body{margin:0;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
  color:var(--cream);background:var(--deep);-webkit-font-smoothing:antialiased;line-height:1.65;}
a{color:inherit;}
img{max-width:100%;height:auto;}
.hd{position:fixed;inset:0 0 auto 0;z-index:90;height:78px;display:flex;align-items:center;gap:18px;
  padding-inline:5vw;background:rgba(10,14,20,.82);backdrop-filter:blur(14px) saturate(140%);
  -webkit-backdrop-filter:blur(14px) saturate(140%);border-bottom:1px solid var(--line);}
.hd__brand{width:172px;height:52px;flex:none;padding:6px 12px;border-radius:12px;
  background:linear-gradient(180deg,#fffaf3 0%,#fff2e2 100%);border:1px solid rgba(255,179,71,.55);
  box-shadow:0 2px 14px rgba(255,106,0,.28),0 0 0 4px rgba(255,106,0,.07);}
.hd__brand img{width:100%;height:100%;object-fit:contain;display:block;}
.hd__nav{display:flex;gap:26px;margin-left:auto;font-size:14px;}
.hd__nav a{color:var(--muted);text-decoration:none;}
.hd__nav a:hover{color:var(--amber);}
.hd__cta{flex:none;padding:11px 20px;border-radius:999px;font-size:14px;font-weight:600;
  color:var(--cream);border:1px solid rgba(255,179,71,.55);text-decoration:none;}
.hd__cta:hover{color:var(--black);background:var(--orange);}
@media(max-width:860px){.hd__nav{display:none;}}
.wrap{max-width:1080px;margin:0 auto;padding-inline:5vw;}
.crumbs{padding-top:112px;font-size:13px;color:var(--muted);}
.crumbs a{text-decoration:none;}
.crumbs a:hover{color:var(--amber);}
.hero{padding:22px 0 54px;}
.eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);margin-bottom:14px;}
h1{font-size:clamp(1.9rem,4.4vw,3rem);line-height:1.1;margin:0 0 20px;text-wrap:balance;letter-spacing:-.02em;}
.lede{font-size:1.1rem;color:var(--muted);max-width:62ch;margin:0 0 30px;}
h2{font-size:clamp(1.35rem,2.6vw,1.85rem);margin:56px 0 18px;text-wrap:balance;letter-spacing:-.015em;}
h3{font-size:1.05rem;margin:0 0 8px;}
p{margin:0 0 14px;}
section{padding-bottom:8px;}
.list{list-style:none;padding:0;margin:0;display:grid;gap:12px;}
.list li{padding-left:26px;position:relative;color:var(--muted);}
.list li::before{content:"";position:absolute;left:0;top:.62em;width:10px;height:2px;background:var(--orange);}
.cards{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(258px,1fr));}
.card{border:1px solid var(--line);border-radius:14px;padding:20px;background:rgba(255,242,226,.03);}
.card p{color:var(--muted);margin:0;font-size:.95rem;}
.steps{display:grid;gap:14px;counter-reset:s;}
.step{border-left:2px solid rgba(255,179,71,.35);padding:2px 0 2px 18px;counter-increment:s;}
.step h3::before{content:counter(s) ". ";color:var(--amber);}
.step p{color:var(--muted);margin:0;font-size:.95rem;}
details{border-bottom:1px solid var(--line);padding:16px 0;}
summary{cursor:pointer;font-weight:600;list-style:none;}
summary::-webkit-details-marker{display:none;}
summary::after{content:"+";float:right;color:var(--amber);}
details[open] summary::after{content:"−";}
details p{color:var(--muted);margin:12px 0 0;}
.cta{margin:64px 0;padding:34px;border:1px solid var(--line);border-radius:18px;
  background:linear-gradient(180deg,rgba(255,106,0,.08),rgba(255,106,0,.02));}
.cta h2{margin-top:0;}
.btn{display:inline-block;padding:14px 26px;border-radius:999px;background:var(--orange);
  color:var(--black);font-weight:700;text-decoration:none;}
.btn:hover{background:var(--amber);}
.rel{display:flex;flex-wrap:wrap;gap:10px;}
.rel a{border:1px solid var(--line);border-radius:999px;padding:9px 16px;font-size:.9rem;
  text-decoration:none;color:var(--muted);}
.rel a:hover{color:var(--amber);border-color:rgba(255,179,71,.5);}
.ft{margin-top:70px;border-top:1px solid var(--line);padding:44px 0 60px;font-size:.9rem;color:var(--muted);}
.ft__cols{display:grid;gap:26px;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));margin-bottom:30px;}
.ft h4{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--amber);margin:0 0 12px;}
.ft ul{list-style:none;padding:0;margin:0;display:grid;gap:8px;}
.ft a{text-decoration:none;}
.ft a:hover{color:var(--amber);}
a:focus-visible,summary:focus-visible{outline:2px solid var(--amber);outline-offset:3px;}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto;}}
`.trim();

function header() {
	return `<header class="hd">
  <a class="hd__brand" href="/"><img src="/images/brand/flowai-logo.png" alt="${esc(SITE_NAME)}" width="172" height="52"></a>
  <nav class="hd__nav">
    <a href="/agencia-de-marketing-digital/">Marketing</a>
    <a href="/agencia-de-inteligencia-artificial/">Inteligência artificial</a>
    <a href="/desenvolvimento-de-sistemas-personalizados/">Sistemas</a>
    <a href="/blog/">Blog</a>
  </nav>
  <a class="hd__cta" href="${buildWaLink("default")}" rel="noopener">Falar com a FlowAI</a>
</header>`;
}

/** Rodapé linka TODAS as money pages — garante que nenhuma nasça órfã. */
function footer(services) {
	const byPillar = (p) => services.filter((s) => s.pillar === p);
	const col = (title, items) =>
		`<div><h4>${esc(title)}</h4><ul>${items
			.map((s) => `<li><a href="/${s.slug}/">${esc(s.breadcrumbLabel)}</a></li>`)
			.join("")}</ul></div>`;
	return `<footer class="ft"><div class="wrap">
  <div class="ft__cols">
    ${col("Marketing", byPillar("marketing"))}
    ${col("Inteligência artificial", byPillar("ia"))}
    ${col("Sistemas", byPillar("sistemas"))}
    <div><h4>FlowAI</h4><ul>
      <li><a href="/">Início</a></li>
      <li><a href="/blog/">Blog</a></li>
      <li><a href="${buildWaLink("default")}" rel="noopener">WhatsApp ${esc(WHATSAPP_DISPLAY)}</a></li>
    </ul></div>
  </div>
  <p>${esc(SITE_NAME)} — marketing, inteligência artificial e sistemas sob medida. Atendimento em todo o Brasil.</p>
</div></footer>`;
}

function crumbs(items) {
	const parts = items.map((it, i) =>
		i === items.length - 1
			? `<span aria-current="page">${esc(it.name)}</span>`
			: `<a href="${it.path}">${esc(it.name)}</a>`,
	);
	return `<nav class="crumbs" aria-label="Você está aqui">${parts.join(" › ")}</nav>`;
}

/** Documento base. `head` recebe o JSON-LD já serializado. */
export function layout({ title, description, canonical, bodyHtml, jsonLdHtml, robots }) {
	return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="${esc(robots || "index,follow,max-image-preview:large")}">
<meta name="theme-color" content="#0F141B">
<meta property="og:locale" content="pt_BR">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE_NAME)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${SITE_URL}/images/brand/flowai-logo.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="/images/brand/flowai-symbol.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap">
<style>${BASE_CSS}</style>
${jsonLdHtml || ""}
</head>
<body>
${header()}
${bodyHtml}
</body>
</html>`;
}

/** Money page de serviço. */
export function renderService(svc, services, jsonLdHtml) {
	const path = `/${svc.slug}/`;
	const body = `<main class="wrap">
${crumbs([{ name: "Início", path: "/" }, { name: svc.breadcrumbLabel, path }])}
<article>
  <div class="hero">
    <p class="eyebrow">${esc(pillarLabel(svc.pillar))}</p>
    <h1>${esc(svc.h1)}</h1>
    <p class="lede">${esc(svc.heroText)}</p>
    <a class="btn" href="${buildWaLink(svc.waKey)}" rel="noopener">Falar com a FlowAI</a>
  </div>

  <section>
    <h2>${esc(svc.problemTitle)}</h2>
    <ul class="list">${svc.problems.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
  </section>

  <section>
    <h2>${esc(svc.deliverablesTitle)}</h2>
    <div class="cards">${svc.deliverables
			.map((d) => `<div class="card"><h3>${esc(d.title)}</h3><p>${esc(d.desc)}</p></div>`)
			.join("")}</div>
  </section>

  <section>
    <h2>Como conduzimos</h2>
    <div class="steps">${svc.process
			.map((s) => `<div class="step"><h3>${esc(s.title)}</h3><p>${esc(s.desc)}</p></div>`)
			.join("")}</div>
  </section>

  <section>
    <h2>Perguntas frequentes</h2>
    ${svc.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("\n    ")}
  </section>

  <section class="cta">
    <h2>${esc(svc.ctaTitle)}</h2>
    <p>Conversa direta, sem compromisso — a gente entende o seu contexto antes de propor qualquer coisa.</p>
    <a class="btn" href="${buildWaLink(svc.waKey)}" rel="noopener">Falar no WhatsApp</a>
  </section>

  <section>
    <h2>Também pode interessar</h2>
    <div class="rel">${svc.related.map((r) => `<a href="${esc(r.href)}">${esc(r.title)}</a>`).join("")}</div>
  </section>
</article>
</main>
${footer(services)}`;
	return layout({
		title: svc.metaTitle,
		description: svc.metaDescription,
		canonical: `${SITE_URL}${path}`,
		bodyHtml: body,
		jsonLdHtml,
	});
}

function pillarLabel(p) {
	return { marketing: "Marketing", ia: "Inteligência artificial", sistemas: "Sistemas sob medida" }[p] || "";
}

/** Índice do blog. Recebe só artigos publicados. */
export function renderBlogIndex(posts, services, jsonLdHtml) {
	const items = posts.length
		? posts
				.map(
					(p) => `<article class="card">
      <h3><a href="/blog/${esc(p.slug)}/" style="text-decoration:none">${esc(p.title)}</a></h3>
      <p>${esc(p.metaDescription)}</p>
      <p style="margin-top:10px;font-size:.85rem;opacity:.75">
        <time datetime="${esc(p.publishedAt)}">${formatDate(p.publishedAt)}</time> · ${esc(p.author)}
      </p>
    </article>`,
				)
				.join("\n    ")
		: `<p class="lede">Os primeiros artigos estão sendo escritos. Nada aqui é publicado sem passar pelos critérios de qualidade — preferimos poucos conteúdos úteis a muitos genéricos.</p>`;

	const body = `<main class="wrap">
${crumbs([{ name: "Início", path: "/" }, { name: "Blog", path: "/blog/" }])}
<div class="hero">
  <p class="eyebrow">Blog</p>
  <h1>Conteúdo para quem decide</h1>
  <p class="lede">Marketing, inteligência artificial, automação e sistemas aplicados a operações reais — sem promessa mágica e sem número inventado.</p>
</div>
<section><div class="cards">
    ${items}
</div></section>
</main>
${footer(services)}`;
	return layout({
		title: "Blog | FlowAI Digital",
		description:
			"Artigos da FlowAI Digital sobre marketing, inteligência artificial, automação e desenvolvimento de sistemas aplicados a operações reais.",
		canonical: `${SITE_URL}/blog/`,
		bodyHtml: body,
		jsonLdHtml,
	});
}

/** Artigo. `contentHtml` já vem sanitizado pelo renderizador de Markdown. */
export function renderArticle(post, contentHtml, services, jsonLdHtml) {
	const path = `/blog/${post.slug}/`;
	const sources = post.sources?.length
		? `<section><h2>Fontes</h2><ul class="list">${post.sources
				.map(
					(s) =>
						`<li><a href="${esc(s.url)}" rel="nofollow noopener" target="_blank">${esc(s.title)}</a>${
							s.publishedAt ? ` — ${esc(s.publishedAt)}` : ""
						}</li>`,
				)
				.join("")}</ul></section>`
		: "";
	const money = post.targetMoneyPage
		? `<section class="cta">
    <h2>Quer aplicar isso na sua operação?</h2>
    <p>A FlowAI faz esse tipo de trabalho na prática. Veja como funciona em <a href="${esc(post.targetMoneyPage)}">${esc(post.targetMoneyPageLabel || "nossa página de serviço")}</a>, ou fale direto com a gente.</p>
    <a class="btn" href="${buildWaLink("default")}" rel="noopener">Falar no WhatsApp</a>
  </section>`
		: "";

	const body = `<main class="wrap">
${crumbs([
	{ name: "Início", path: "/" },
	{ name: "Blog", path: "/blog/" },
	{ name: post.title, path },
])}
<article>
  <div class="hero">
    <p class="eyebrow">${esc(post.cluster || "Artigo")}</p>
    <h1>${esc(post.title)}</h1>
    <p class="lede">${esc(post.metaDescription)}</p>
    <p style="font-size:.88rem;opacity:.75">
      Por ${esc(post.author)} ·
      <time datetime="${esc(post.publishedAt)}">${formatDate(post.publishedAt)}</time>${
				post.updatedAt && post.updatedAt !== post.publishedAt
					? ` · atualizado em <time datetime="${esc(post.updatedAt)}">${formatDate(post.updatedAt)}</time>`
					: ""
			}
    </p>
  </div>
  ${contentHtml}
  ${sources}
  ${money}
</article>
</main>
${footer(services)}`;
	return layout({
		title: `${post.title} | FlowAI Digital`,
		description: post.metaDescription,
		canonical: `${SITE_URL}${path}`,
		bodyHtml: body,
		jsonLdHtml,
	});
}

export function renderNotFound(services) {
	const body = `<main class="wrap">
<div class="hero" style="padding-top:112px">
  <p class="eyebrow">Erro 404</p>
  <h1>Esta página não existe</h1>
  <p class="lede">O endereço que você abriu não corresponde a nenhuma página do site. Pode ter sido removido ou digitado com algum erro.</p>
  <a class="btn" href="/">Voltar para o início</a>
</div>
</main>
${footer(services)}`;
	return layout({
		title: "Página não encontrada | FlowAI Digital",
		description: "O endereço acessado não corresponde a nenhuma página do site.",
		canonical: `${SITE_URL}/404.html`,
		bodyHtml: body,
		robots: "noindex,follow",
	});
}

function formatDate(iso) {
	if (!iso) return "";
	const [y, m, d] = iso.slice(0, 10).split("-");
	return `${d}/${m}/${y}`;
}

export { esc };
