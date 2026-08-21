// Auditor do acervo de 51 posts antigos (site-v6-video, no HEAD do repo externo).
//
// Regra do requisito 20: o acervo NÃO é fila de publicação. Nenhum post entra
// em produção automaticamente. Este auditor classifica cada um e o resultado
// vira lista de decisão para o dono — não ação.
//
// Veredito por post: KEEP | UPDATE | MERGE | REDIRECT | ARCHIVE

/** Posicionamento atual: IA, automação, sistemas, marketing, tracking. */
export const CURRENT_POSITIONING = [
	"inteligência artificial",
	"ia",
	"agente",
	"automação",
	"automacao",
	"sistema",
	"software",
	"crm",
	"integração",
	"integracao",
	"api",
	"tracking",
	"analytics",
	"marketing digital",
	"tráfego",
	"trafego",
	"seo",
	"processo comercial",
	"whatsapp",
	"chatbot",
];

/** Nichos que o site-v6 atacava e que hoje estão fora do posicionamento. */
export const OFF_POSITIONING_NICHES = [
	"odontolog",
	"dentista",
	"estética",
	"estetica",
	"imobiliár",
	"imobiliar",
	"corretor",
	"clínica",
	"clinica",
	"paciente",
];

const norm = (s) =>
	String(s ?? "")
		.toLowerCase()
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "");

/** Extrai o essencial de um post HTML estático do site-v6. */
export function parseLegacyPost(html, slug) {
	const t = String(html ?? "");
	const grab = (re) => {
		const m = t.match(re);
		return m ? m[1].replace(/<[^>]*>/g, "").trim() : null;
	};
	const visible = t
		.replace(/<script[\s\S]*?<\/script>/gi, "")
		.replace(/<style[\s\S]*?<\/style>/gi, "")
		.replace(/<[^>]*>/g, " ");
	return {
		slug,
		title: grab(/<title[^>]*>([\s\S]*?)<\/title>/i),
		metaDescription: grab(/name="description" content="([^"]*)"/i),
		h1: grab(/<h1[^>]*>([\s\S]*?)<\/h1>/i),
		canonical: (t.match(/rel="canonical" href="([^"]*)"/i) ?? [])[1] ?? null,
		hasSchema: /application\/ld\+json/.test(t),
		hasArticleSchema: /"@type"\s*:\s*"Article"/.test(t),
		internalLinks: [...t.matchAll(/href="(\/[a-z0-9/-]*)"/g)].map((m) => m[1]),
		wordCount: visible.split(/\s+/).filter(Boolean).length,
		hasSources: /fonte|refer[êe]ncia|segundo\s+(a|o)\s+/i.test(visible),
		// "Por Fulano" costuma abrir a linha de crédito, então o P vem maiúsculo:
		// a checagem precisa ser insensível a caixa.
		hasAuthor: /\bpor\s+[A-ZÁÉÍÓÚ][a-zà-ÿ]+/i.test(visible),
	};
}

/** Sinaliza se o tema pertence a um nicho abandonado. */
export function detectNiche(post) {
	const hay = norm(`${post.title} ${post.h1} ${post.metaDescription} ${post.slug}`);
	const hits = OFF_POSITIONING_NICHES.filter((n) => hay.includes(norm(n)));
	return { offPositioning: hits.length > 0, matches: [...new Set(hits)] };
}

export function detectAlignment(post) {
	const hay = norm(`${post.title} ${post.h1} ${post.metaDescription} ${post.slug}`);
	const hits = CURRENT_POSITIONING.filter((k) => hay.includes(norm(k)));
	return { aligned: hits.length > 0, matches: [...new Set(hits)] };
}

/** Agrupa por tema para achar sobreposição dentro do próprio acervo. */
export function findDuplicates(posts, { threshold = 0.6 } = {}) {
	const groups = [];
	const tokens = (p) =>
		new Set(
			norm(p.title ?? p.slug)
				.split(/[\s-]+/)
				.filter((w) => w.length > 3),
		);
	const seen = new Set();
	for (const a of posts) {
		if (seen.has(a.slug)) continue;
		const ta = tokens(a);
		const group = [a.slug];
		for (const b of posts) {
			if (b.slug === a.slug || seen.has(b.slug)) continue;
			const tb = tokens(b);
			let inter = 0;
			for (const w of ta) if (tb.has(w)) inter++;
			const sim = inter / Math.max(1, Math.min(ta.size, tb.size));
			if (sim >= threshold) {
				group.push(b.slug);
				seen.add(b.slug);
			}
		}
		if (group.length > 1) {
			groups.push(group);
			seen.add(a.slug);
		}
	}
	return groups;
}

/**
 * Classifica um post. Ordem das regras importa: primeiro o que descarta,
 * depois o que exige trabalho, por último o que se aproveita.
 */
export function classifyPost(post, { duplicateGroups = [], lengthReference = 500 } = {}) {
	const niche = detectNiche(post);
	const align = detectAlignment(post);
	const reasons = [];

	const inDuplicateGroup = duplicateGroups.find((g) => g.includes(post.slug));

	// 1. Nicho abandonado sem aderência ao posicionamento atual
	if (niche.offPositioning && !align.aligned) {
		reasons.push(`nicho fora do posicionamento (${niche.matches.join(", ")}) e sem tema atual`);
		return { slug: post.slug, verdict: "ARCHIVE", reasons, niche, align };
	}

	// 2. Nicho abandonado, mas com tema aproveitável -> reescrever sem o nicho
	if (niche.offPositioning && align.aligned) {
		reasons.push(
			`tema aproveitável (${align.matches.slice(0, 3).join(", ")}) mas ancorado em nicho abandonado (${niche.matches.join(", ")})`,
		);
		return { slug: post.slug, verdict: "UPDATE", reasons, niche, align };
	}

	// 3. Sobreposição dentro do acervo
	if (inDuplicateGroup) {
		reasons.push(`sobrepõe com: ${inDuplicateGroup.filter((s) => s !== post.slug).join(", ")}`);
		return { slug: post.slug, verdict: "MERGE", reasons, niche, align, mergeWith: inDuplicateGroup };
	}

	// 4. Fora do posicionamento e sem nicho identificado
	if (!align.aligned) {
		reasons.push("nenhum tema do posicionamento atual identificado");
		return { slug: post.slug, verdict: "ARCHIVE", reasons, niche, align };
	}

	// 5. Alinhado, mas com dívida de qualidade
	// Extensão é SINAL, não regra. O Google não publica mínimo universal de
	// palavras; a referência abaixo é heurística interna contra thin content.
	const debts = [];
	if ((post.wordCount ?? 0) < lengthReference) {
		debts.push(`extensão abaixo da referência (${post.wordCount} palavras, referência ${lengthReference})`);
	}
	if (!post.hasSources) debts.push("sem fontes");
	if (!post.hasAuthor) debts.push("sem autor identificado");
	if (!post.hasArticleSchema) debts.push("sem schema Article");
	if ((post.internalLinks ?? []).length < 2) debts.push("poucos links internos");

	if (debts.length >= 2) {
		reasons.push(`alinhado, mas com dívida: ${debts.join("; ")}`);
		return { slug: post.slug, verdict: "UPDATE", reasons, niche, align, debts };
	}

	reasons.push(`alinhado ao posicionamento (${align.matches.slice(0, 3).join(", ")})`);
	if (debts.length) reasons.push(`ajustes menores: ${debts.join("; ")}`);
	return { slug: post.slug, verdict: "KEEP", reasons, niche, align, debts };
}

export function auditAll(posts, opts = {}) {
	const duplicateGroups = findDuplicates(posts);
	const results = posts.map((p) => classifyPost(p, { ...opts, duplicateGroups }));
	const byVerdict = {};
	for (const r of results) {
		(byVerdict[r.verdict] ??= []).push(r.slug);
	}
	return {
		total: posts.length,
		duplicateGroups,
		results,
		summary: {
			KEEP: byVerdict.KEEP?.length ?? 0,
			UPDATE: byVerdict.UPDATE?.length ?? 0,
			MERGE: byVerdict.MERGE?.length ?? 0,
			REDIRECT: byVerdict.REDIRECT?.length ?? 0,
			ARCHIVE: byVerdict.ARCHIVE?.length ?? 0,
		},
		byVerdict,
		// A regra que não pode ser burlada: nada publica sozinho.
		autoPublishable: [],
		note: "Acervo, não fila. Nenhum post entra em produção sem decisão explícita do dono.",
	};
}

export function formatAudit(report) {
	const lines = [`Acervo de posts antigos — ${report.total} analisados`, ""];
	for (const [v, n] of Object.entries(report.summary)) {
		lines.push(`  ${v.padEnd(9)} ${n}`);
	}
	lines.push("");
	if (report.duplicateGroups.length) {
		lines.push(`Grupos com sobreposição: ${report.duplicateGroups.length}`);
		for (const g of report.duplicateGroups.slice(0, 8)) lines.push(`  - ${g.join(" | ")}`);
		lines.push("");
	}
	lines.push(report.note);
	return lines.join("\n");
}
