// Quality score (0–100), calculado DEPOIS que todos os hard gates passaram.
//
// Política de corte (requisito 39):
//   >= 92  publicar
//   85–91  retrabalhar automaticamente (máx. 3 ciclos)
//   <  85  HOLD
//
// Não existe 4º ciclo: sem isso o Engine entra em loop caro e infinito.

export const MAX_REWORK_CYCLES = 3;
export const PUBLISH_THRESHOLD = 92;
export const REWORK_THRESHOLD = 85;

/** Peso de cada dimensão. Soma = 100. */
export const DIMENSIONS = [
	{ key: "searchIntent", label: "Search intent", weight: 12 },
	{ key: "demandEvidence", label: "Demand evidence", weight: 10 },
	{ key: "originalContribution", label: "Original contribution", weight: 12 },
	{ key: "sourceQuality", label: "Source quality", weight: 10 },
	{ key: "factualConfidence", label: "Factual confidence", weight: 10 },
	{ key: "semanticCoverage", label: "Semantic coverage", weight: 8 },
	{ key: "readability", label: "Readability", weight: 6 },
	{ key: "internalLinking", label: "Internal linking", weight: 8 },
	{ key: "onPageSeo", label: "On-page SEO", weight: 8 },
	{ key: "geoAnswerability", label: "GEO answerability", weight: 8 },
	{ key: "brandRelevance", label: "Brand relevance", weight: 4 },
	{ key: "conversionRelevance", label: "Conversion relevance", weight: 4 },
];

const clamp = (n) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));

/** Cada scorer devolve 0..1. Heurísticas explícitas, auditáveis. */
const SCORERS = {
	searchIntent(a) {
		if (!a.intent) return 0;
		let s = 0.6;
		const t = (a.title ?? "").toLowerCase();
		const kw = (a.primaryKeyword ?? "").toLowerCase();
		if (kw && t.includes(kw)) s += 0.25;
		if (a.intent === "comparativo" && /\bvs\b|versus|ou\b|compara/i.test(a.title ?? "")) s += 0.15;
		if (a.intent === "informacional" && /^(o que|como|por que|quando|quanto)/i.test(a.title ?? "")) s += 0.15;
		return clamp(s);
	},
	demandEvidence(a) {
		const ev = a.demandEvidence ?? {};
		const vol = Number(ev.searchVolume ?? 0);
		const imp = Number(ev.gscImpressions ?? 0);
		if (vol >= 500 || imp >= 1000) return 1;
		if (vol >= 100 || imp >= 200) return 0.8;
		if (vol >= 30 || imp >= 50) return 0.6;
		if (ev.strategicJustification) return 0.5;
		return 0.2;
	},
	originalContribution(a) {
		const c = (a.originalContribution ?? []).filter((x) => String(x).trim().length >= 20);
		if (c.length >= 3) return 1;
		if (c.length === 2) return 0.8;
		if (c.length === 1) return 0.55;
		return 0;
	},
	sourceQuality(a) {
		const src = a.sources ?? [];
		if (src.length === 0) return 0.3; // sem afirmação quantitativa ainda é aceitável
		const tiers = src.map((s) => Number(s.sourceTier ?? 9));
		const best = Math.min(...tiers);
		const qualificadas = tiers.filter((t) => t <= 4).length;
		let s = best <= 2 ? 1 : best <= 4 ? 0.8 : best <= 6 ? 0.55 : 0.3;
		if (qualificadas >= 3) s = Math.min(1, s + 0.1);
		return clamp(s);
	},
	factualConfidence(a) {
		const src = a.sources ?? [];
		if (src.length === 0) return 0.5;
		const map = { high: 1, medium: 0.65, low: 0.3 };
		const vals = src.map((s) => map[s.confidence] ?? 0.5);
		return clamp(vals.reduce((x, y) => x + y, 0) / vals.length);
	},
	semanticCoverage(a) {
		const body = (a.body ?? "").toLowerCase();
		const sec = a.secondaryKeywords ?? [];
		if (sec.length === 0) return 0.5;
		const cobertas = sec.filter((k) => body.includes(String(k).toLowerCase())).length;
		return clamp(cobertas / sec.length);
	},
	readability(a) {
		const body = a.body ?? "";
		const sentences = body.split(/[.!?]+\s/).filter((s) => s.trim().length > 0);
		if (sentences.length === 0) return 0;
		const avg = sentences.reduce((s, x) => s + x.split(/\s+/).length, 0) / sentences.length;
		// 12–22 palavras por frase é a faixa confortável
		let s = avg >= 12 && avg <= 22 ? 1 : avg < 12 ? 0.7 : avg <= 28 ? 0.7 : 0.4;
		const headings = (body.match(/^#{2,4}\s/gm) ?? []).length;
		if (headings >= 3) s = Math.min(1, s + 0.1);
		else if (headings === 0) s = Math.max(0, s - 0.3);
		return clamp(s);
	},
	internalLinking(a) {
		const links = [...(a.body ?? "").matchAll(/\]\((\/[^)]*)\)/g)].map((m) => m[1]);
		const uniq = new Set(links);
		const apontaMoney = a.targetMoneyPage && (uniq.has(a.targetMoneyPage) || (a.body ?? "").includes(a.targetMoneyPage));
		if (!apontaMoney) return 0.2;
		if (uniq.size >= 4) return 1;
		if (uniq.size === 3) return 0.9;
		if (uniq.size === 2) return 0.75;
		return 0.55;
	},
	onPageSeo(a) {
		let s = 0;
		if (a.title && a.title.length <= 70) s += 0.3;
		if (a.metaDescription && a.metaDescription.length >= 90 && a.metaDescription.length <= 165) s += 0.3;
		if (a.slug && /^[a-z0-9-]+$/.test(a.slug)) s += 0.2;
		const kw = (a.primaryKeyword ?? "").toLowerCase();
		if (kw && (a.slug ?? "").includes(kw.replace(/\s+/g, "-"))) s += 0.2;
		return clamp(s);
	},
	/** GEO: o artigo responde perguntas de forma direta e extraível? */
	geoAnswerability(a) {
		const body = a.body ?? "";
		let s = 0;
		const perguntas = (body.match(/^#{2,4}\s+.*\?/gm) ?? []).length;
		if (perguntas >= 3) s += 0.4;
		else if (perguntas >= 1) s += 0.25;
		// resposta curta logo após o heading é o que os motores generativos citam
		const respostaDireta = /\?\s*\n+[^\n#]{40,300}\n/.test(body);
		if (respostaDireta) s += 0.25;
		const listas = (body.match(/^[-*]\s/gm) ?? []).length;
		if (listas >= 5) s += 0.2;
		if ((a.sources ?? []).length >= 2) s += 0.15;
		return clamp(s);
	},
	brandRelevance(a) {
		return a.targetMoneyPage ? 1 : 0.3;
	},
	conversionRelevance(a) {
		const body = (a.body ?? "").toLowerCase();
		let s = a.targetMoneyPage ? 0.6 : 0.2;
		if (/whatsapp|falar com|diagn[óo]stico|conversar/.test(body)) s += 0.4;
		return clamp(s);
	},
};

export function scoreArticle(article) {
	const breakdown = DIMENSIONS.map((d) => {
		const raw = clamp(SCORERS[d.key](article));
		return {
			key: d.key,
			label: d.label,
			weight: d.weight,
			raw: Number(raw.toFixed(3)),
			points: Number((raw * d.weight).toFixed(2)),
		};
	});
	const total = Math.round(breakdown.reduce((s, d) => s + d.points, 0));
	return { total, breakdown, decision: decide(total) };
}

export function decide(total, reworkCount = 0) {
	if (total >= PUBLISH_THRESHOLD) return "PUBLISH";
	if (total >= REWORK_THRESHOLD) {
		return reworkCount >= MAX_REWORK_CYCLES ? "HOLD" : "REWORK";
	}
	return "HOLD";
}

/** Dimensões mais fracas — vira instrução de retrabalho. */
export function weakestDimensions(scored, n = 3) {
	return [...scored.breakdown]
		.map((d) => ({ ...d, lost: Number((d.weight - d.points).toFixed(2)) }))
		.sort((a, b) => b.lost - a.lost)
		.slice(0, n);
}
