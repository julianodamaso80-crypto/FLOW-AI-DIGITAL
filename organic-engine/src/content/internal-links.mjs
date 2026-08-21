// Sugestão de links internos.
//
// Portado de seo-autopilot (`resolveInternalLinks` em
// src/server/services/contentGenerationService.ts), que resolvia isto melhor do
// que o Engine: link para a página-mãe do cluster, alguns irmãos do mesmo
// cluster e uma ponte para outro cluster, com teto total.
//
// O que foi acrescentado na adaptação:
//   - âncora variada (o original repetia sempre a keyword-alvo, o que gera
//     padrão artificial de anchor text);
//   - detecção de página órfã;
//   - nunca sugerir link para a própria página.

const MAX_LINKS_DEFAULT = 6;

/**
 * @param page   { slug, cluster, targetKeyword, title, type }
 * @param corpus array de páginas no mesmo formato
 */
export function suggestInternalLinks(page, corpus, { maxLinks = MAX_LINKS_DEFAULT, moneyPage = null } = {}) {
	const outras = corpus.filter((p) => p.slug !== page.slug);
	const links = [];
	const jaTem = new Set();

	const add = (p, motivo) => {
		if (!p || jaTem.has(p.slug) || links.length >= maxLinks) return;
		jaTem.add(p.slug);
		links.push({
			slug: p.slug,
			url: p.url ?? `/${p.slug}/`,
			anchor: pickAnchor(p, links.length),
			reason: motivo,
		});
	};

	// 1. Money page de destino vem primeiro — é a função comercial do artigo
	if (moneyPage) {
		const mp = outras.find((p) => p.slug === moneyPage || p.url === moneyPage);
		if (mp) add(mp, "money page de destino");
		else {
			links.push({
				slug: moneyPage.replace(/^\/|\/$/g, ""),
				url: moneyPage,
				anchor: "como fazemos isso na prática",
				reason: "money page de destino",
			});
			jaTem.add(moneyPage.replace(/^\/|\/$/g, ""));
		}
	}

	// 2. Página-mãe do cluster
	const pillar = outras.find((p) => p.cluster === page.cluster && p.type === "pillar");
	add(pillar, "página-mãe do cluster");

	// 3. Irmãos do mesmo cluster (até 3)
	const irmaos = outras
		.filter((p) => p.cluster === page.cluster && p.type !== "pillar")
		.slice(0, 3);
	for (const irmao of irmaos) add(irmao, "mesmo cluster");

	// 4. Ponte para outro cluster (até 2 pillars)
	const pontes = outras.filter((p) => p.cluster !== page.cluster && p.type === "pillar").slice(0, 2);
	for (const ponte of pontes) add(ponte, "ponte entre clusters");

	return links.slice(0, maxLinks);
}

/**
 * Alterna a forma da âncora. Repetir a keyword exata em todo link é padrão
 * artificial — e é o tipo de sinal que caracteriza manipulação.
 */
function pickAnchor(p, index) {
	const opcoes = [p.targetKeyword, p.title, p.shortLabel].filter(Boolean);
	if (opcoes.length === 0) return p.slug.replace(/-/g, " ");
	return opcoes[index % opcoes.length];
}

/** Páginas que ninguém linka. Órfã não recebe autoridade e some do crawl. */
export function findOrphans(corpus, linkGraph) {
	const recebem = new Set();
	for (const [, destinos] of Object.entries(linkGraph)) {
		for (const d of destinos) recebem.add(normalizeSlug(d));
	}
	return corpus
		.filter((p) => !recebem.has(normalizeSlug(p.slug)) && p.type !== "home")
		.map((p) => p.slug);
}

/** Monta o grafo a partir do corpo de cada página. */
export function buildLinkGraph(pages) {
	const graph = {};
	for (const p of pages) {
		const links = [...String(p.body ?? "").matchAll(/\]\((\/[^)]*)\)/g)].map((m) => m[1]);
		graph[p.slug] = [...new Set(links.map(normalizeSlug))];
	}
	return graph;
}

/** Anchor text repetido demais para o mesmo destino é sinal de manipulação. */
export function detectAnchorOveruse(pages, { limit = 3 } = {}) {
	const contagem = new Map();
	for (const p of pages) {
		for (const m of String(p.body ?? "").matchAll(/\[([^\]]+)\]\((\/[^)]*)\)/g)) {
			const chave = `${normalizeSlug(m[2])}|${m[1].toLowerCase().trim()}`;
			contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
		}
	}
	return [...contagem.entries()]
		.filter(([, n]) => n > limit)
		.map(([chave, n]) => {
			const [destino, anchor] = chave.split("|");
			return { destino, anchor, ocorrencias: n };
		});
}

function normalizeSlug(v) {
	return String(v ?? "").replace(/^\/+|\/+$/g, "");
}
