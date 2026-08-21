// Auditoria de links internos a partir do HTML REAL.
//
// A versão anterior desta análise convertia `href="/destino/"` em `[x](/destino/)`
// antes de medir anchor text — o que apagava o texto real e tornava o resultado
// de "anchor overuse" sem valor. Aqui o anchor é extraído do próprio <a>.
//
// Os limites abaixo são heurística INTERNA para achar padrão artificial. Não são
// regra do Google, e o objetivo não é bater um número: é enxergar se um mesmo
// destino recebe sempre a mesma âncora exata em muitas páginas.

const ENTITIES = {
	"&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'",
	"&apos;": "'", "&nbsp;": " ", "&mdash;": "—", "&ndash;": "–", "&hellip;": "…",
};

export function decodeEntities(s) {
	return String(s ?? "")
		.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
		.replace(/&[a-z]+;|&#\d+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

/** Texto de âncora limpo: sem tags internas, sem entidade, espaço normalizado. */
export function normalizeAnchor(inner) {
	return decodeEntities(String(inner ?? "").replace(/<[^>]*>/g, " "))
		.replace(/\s+/g, " ")
		.trim();
}

export function normalizePath(href) {
	let h = String(href ?? "").trim();
	h = h.replace(/^https?:\/\/(www\.)?flowaidigital\.com\.br/i, "");
	if (!h.startsWith("/")) return null; // externo, âncora ou mailto
	h = h.split("#")[0].split("?")[0];
	if (h === "") return "/";
	return h.endsWith("/") ? h : `${h}/`;
}

/**
 * Regiões ESTRUTURAIS: cabeçalho, rodapé, nav e breadcrumb.
 *
 * Repetição de âncora aqui é esperada e correta — um rodapé serve justamente
 * para repetir os mesmos links em todas as páginas. Misturar essas ocorrências
 * com os links editoriais do corpo produz falso positivo de "anchor overuse":
 * foi o que aconteceu na primeira medição, que acusou 28/28 quando na verdade
 * eram 13 rodapés idênticos.
 */
export function findStructuralRanges(html) {
	const ranges = [];
	const padroes = [
		/<header\b[\s\S]*?<\/header>/gi,
		/<footer\b[\s\S]*?<\/footer>/gi,
		/<nav\b[\s\S]*?<\/nav>/gi,
	];
	for (const re of padroes) {
		for (const m of String(html ?? "").matchAll(re)) {
			ranges.push([m.index, m.index + m[0].length]);
		}
	}
	return ranges;
}

const inRange = (pos, ranges) => ranges.some(([a, b]) => pos >= a && pos < b);

/** Extrai (destino, âncora) de todo <a> interno, marcando o que é estrutural. */
export function extractLinks(html) {
	const src = String(html ?? "");
	const structural = findStructuralRanges(src);
	const out = [];
	for (const m of src.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
		const attrs = m[1];
		const hrefMatch = attrs.match(/\bhref\s*=\s*["']([^"']*)["']/i);
		if (!hrefMatch) continue;
		const dest = normalizePath(hrefMatch[1]);
		if (!dest) continue;
		const anchor = normalizeAnchor(m[2]);
		// link de imagem sem texto não conta como âncora de texto
		const isImageOnly = anchor === "" && /<img\b/i.test(m[2]);
		out.push({
			dest,
			anchor,
			isImageOnly,
			inNav: inRange(m.index, structural) || /class\s*=\s*["'][^"']*(hd__|crumbs)/i.test(attrs),
		});
	}
	return out;
}

/**
 * @param pages [{ path, html }]
 * @param knownRoutes Set de rotas que existem
 */
export function auditLinks(pages, knownRoutes, { exactMatchLimit = 0.9, minPagesForPattern = 5 } = {}) {
	const edges = [];
	for (const p of pages) {
		for (const l of extractLinks(p.html)) {
			edges.push({ from: p.path, to: l.dest, anchor: l.anchor, isImageOnly: l.isImageOnly, inNav: l.inNav });
		}
	}

	const destinations = new Set(edges.map((e) => e.to));
	const broken = [...new Set(edges.filter((e) => !knownRoutes.has(e.to)).map((e) => e.to))];

	// órfã: rota conhecida que ninguém aponta (a home é a raiz, não conta)
	const recebem = new Set(edges.map((e) => e.to));
	const orphans = [...knownRoutes].filter((r) => r !== "/" && !recebem.has(r));

	// repetição de âncora exata por destino, ignorando nav e rodapé (que
	// repetem de propósito e não são sinal de manipulação)
	const contextual = edges.filter((e) => !e.inNav && !e.isImageOnly && e.anchor);
	const porDestino = new Map();
	for (const e of contextual) {
		if (!porDestino.has(e.to)) porDestino.set(e.to, []);
		porDestino.get(e.to).push(e.anchor.toLowerCase());
	}

	const repetitions = [];
	for (const [dest, anchors] of porDestino) {
		const contagem = new Map();
		for (const a of anchors) contagem.set(a, (contagem.get(a) ?? 0) + 1);
		const [topAnchor, topN] = [...contagem.entries()].sort(([, a], [, b]) => b - a)[0] ?? [];
		const ratio = anchors.length ? topN / anchors.length : 0;
		repetitions.push({
			dest,
			totalAnchors: anchors.length,
			distinctAnchors: contagem.size,
			topAnchor,
			topCount: topN,
			exactMatchRatio: Number(ratio.toFixed(2)),
		});
	}

	// alerta só quando há repetição exata em MUITAS páginas — um destino com
	// 2 links iguais não é padrão, é coincidência
	const overuse = repetitions.filter(
		(r) => r.totalAnchors >= minPagesForPattern && r.exactMatchRatio >= exactMatchLimit,
	);

	// Concentração: um par (destino, âncora) que sozinho domina boa parte de
	// TODO o link interno contextual do site é o sinal forte de padrão gerado.
	// Repetir o nome do serviço em 5 de 39 links não é isso.
	const concentrationLimit = 0.15;
	const concentrated = overuse.filter(
		(r) => contextual.length > 0 && r.topCount / contextual.length >= concentrationLimit,
	);

	return {
		totalLinks: edges.length,
		contextualLinks: contextual.length,
		navLinks: edges.filter((e) => e.inNav).length,
		totalDestinations: destinations.size,
		orphans,
		broken,
		repetitions: repetitions.sort((a, b) => b.totalAnchors - a.totalAnchors),
		/** Observação de estilo: âncora descritiva repetida, sem concentração. */
		overuse,
		/** Defeito: a mesma âncora concentra parte grande do link interno. */
		concentrated,
		/**
		 * O gate reprova só por defeito OBJETIVO — órfã, link quebrado ou
		 * concentração. `overuse` sozinho fica como aviso: num corpus pequeno,
		 * usar o nome do serviço como âncora é descritivo, não manipulação.
		 */
		passed: orphans.length === 0 && broken.length === 0 && concentrated.length === 0,
		warnings: overuse.length,
	};
}

export function formatLinkAudit(r) {
	const l = [];
	l.push(`total de links internos:  ${r.totalLinks}`);
	l.push(`  contextuais (fora do nav): ${r.contextualLinks}`);
	l.push(`  no nav/rodapé:             ${r.navLinks}`);
	l.push(`destinos distintos:       ${r.totalDestinations}`);
	l.push(`páginas órfãs:            ${r.orphans.length ? r.orphans.join(", ") : "nenhuma"}`);
	l.push(`links quebrados:          ${r.broken.length ? r.broken.join(", ") : "nenhum"}`);
	l.push(`alertas de anchor overuse: ${r.overuse.length}`);
	if (r.overuse.length) {
		for (const o of r.overuse) {
			l.push(`  ${o.dest}: "${o.topAnchor}" em ${o.topCount}/${o.totalAnchors} links`);
		}
	}
	l.push("");
	l.push("distribuição por destino (contextual):");
	for (const rep of r.repetitions.slice(0, 15)) {
		l.push(
			`  ${rep.dest.padEnd(46)} ${String(rep.totalAnchors).padStart(3)} links · ${rep.distinctAnchors} âncoras distintas · exact ${(rep.exactMatchRatio * 100).toFixed(0)}%`,
		);
	}
	return l.join("\n");
}
