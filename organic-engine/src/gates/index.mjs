// Hard gates: se qualquer um reprovar, o artigo NÃO publica.
//
// Cada gate é uma função pura (artigo, contexto) -> {id, passed, reason, detail}.
// Puras de propósito: são a regra de negócio mais importante do Engine e
// precisam ser testáveis sem banco, sem rede e sem LLM.

/** Padrões que indicam número/afirmação sem fonte. */
const QUANT_PATTERNS = [
	/\b\d{1,3}\s?%/, // percentual
	/\bR\$\s?[\d.,]+/, // valor
	/\b\d+x\s+(mais|maior|melhor|rápido)/i, // multiplicador
	/\b\d{2,}\s+(clientes|empresas|leads|vendas|agentes)/i,
	/\b(aumenta|reduz|cresce|economiza)\s+(em\s+)?\d+/i,
];

/** Linguagem que promete o que não se pode garantir. */
const OVERPROMISE = [
	/garant(imos|ido|ia)\s+(de\s+)?(resultado|primeira posição|primeiro lugar|vendas)/i,
	/\b100%\s+(garantido|de conversão|de atribuição|eficaz)/i,
	/primeira\s+posição\s+no\s+google/i,
	/resultado\s+garantido/i,
];

/** Serviços que a FlowAI realmente oferece — base do Brand Gate. */
export const BRAND_SCOPE = [
	"marketing",
	"tráfego",
	"seo",
	"conteúdo",
	"landing",
	"site",
	"tracking",
	"analytics",
	"inteligência artificial",
	"ia",
	"agente",
	"automação",
	"chatbot",
	"whatsapp",
	"sistema",
	"software",
	"saas",
	"mvp",
	"crm",
	"integração",
	"api",
	"dados",
	"processo",
	"comercial",
	"vendas",
];

const pass = (id, detail = {}) => ({ id, passed: true, reason: null, detail });
const fail = (id, reason, detail = {}) => ({ id, passed: false, reason, detail });

// ── 1. Demanda ──────────────────────────────────────────────────────────
export function demandGate(article, ctx = {}) {
	const ev = article.demandEvidence ?? ctx.demandEvidence;
	if (!ev) return fail("demand", "sem evidência de demanda nem justificativa estratégica");

	const volume = Number(ev.searchVolume ?? 0);
	const impressions = Number(ev.gscImpressions ?? 0);
	const strategic = Boolean(ev.strategicJustification);

	if (strategic) {
		return pass("demand", { basis: "justificativa estratégica", note: ev.strategicJustification });
	}
	if (volume >= (ctx.minSearchVolume ?? 30)) {
		return pass("demand", { basis: "volume de busca", volume });
	}
	if (impressions >= (ctx.minImpressions ?? 50)) {
		return pass("demand", { basis: "impressões no Search Console", impressions });
	}
	return fail(
		"demand",
		`demanda insuficiente (volume ${volume}, impressões ${impressions}) e sem justificativa estratégica`,
		{ volume, impressions },
	);
}

// ── 2. Intenção ─────────────────────────────────────────────────────────
const VALID_INTENT = ["informacional", "comercial", "transacional", "navegacional", "comparativo"];

export function intentGate(article) {
	if (!article.intent) return fail("intent", "intenção da query não declarada");
	if (!VALID_INTENT.includes(article.intent)) {
		return fail("intent", `intenção inválida: "${article.intent}"`);
	}
	if (!article.primaryKeyword) return fail("intent", "keyword principal ausente");
	return pass("intent", { intent: article.intent });
}

// ── 3. Canibalização ────────────────────────────────────────────────────
export function cannibalizationGate(article, ctx = {}) {
	const corpus = ctx.corpus ?? [];
	const kw = norm(article.primaryKeyword);
	if (!kw) return fail("cannibalization", "sem keyword principal para comparar");

	const conflito = corpus.find(
		(p) =>
			p.slug !== article.slug &&
			norm(p.primaryKeyword) === kw &&
			p.intent === article.intent,
	);
	if (conflito) {
		return fail(
			"cannibalization",
			`"${conflito.slug}" já responde a mesma keyword com a mesma intenção`,
			{ conflictWith: conflito.slug, decision: "UPDATE_EXISTING" },
		);
	}

	// título quase idêntico também é canibalização na prática
	const similar = corpus.find(
		(p) => p.slug !== article.slug && titleSimilarity(p.title, article.title) >= (ctx.titleSimilarityLimit ?? 0.85),
	);
	if (similar) {
		return fail("cannibalization", `título quase idêntico ao de "${similar.slug}"`, {
			conflictWith: similar.slug,
			decision: "MERGE",
		});
	}
	return pass("cannibalization");
}

// ── 4. Fontes ───────────────────────────────────────────────────────────
export function sourceGate(article, ctx = {}) {
	const body = article.body ?? "";
	const sources = article.sources ?? [];
	const claims = extractQuantClaims(body);

	if (claims.length === 0) return pass("source", { quantClaims: 0 });
	if (sources.length === 0) {
		return fail("source", `${claims.length} afirmação(ões) quantitativa(s) sem nenhuma fonte`, {
			claims: claims.slice(0, 5),
		});
	}
	const minTier = ctx.minSourceTier ?? 6;
	const boas = sources.filter((s) => s.url && Number(s.sourceTier ?? 9) <= minTier);
	if (boas.length === 0) {
		return fail("source", "nenhuma fonte de qualidade aceitável (só blogs genéricos)", {
			sources: sources.length,
		});
	}
	return pass("source", { quantClaims: claims.length, qualifiedSources: boas.length });
}

// ── 5. Alucinação ───────────────────────────────────────────────────────
export function hallucinationGate(article, ctx = {}) {
	const body = article.body ?? "";
	const problemas = [];

	// número comparado a fonte declarada
	const claims = extractQuantClaims(body);
	const evidencia = (article.sources ?? []).map((s) => String(s.evidence ?? "")).join(" ");
	for (const c of claims) {
		const numeros = c.match(/[\d.,]+/g) ?? [];
		const ancorado = numeros.some((n) => evidencia.includes(n));
		if (!ancorado && numeros.length) problemas.push(`número sem lastro na evidência: "${c.trim()}"`);
	}
	// cliente/case citado sem estar na lista autorizada
	const autorizados = (ctx.authorizedClients ?? []).map(norm);
	for (const m of body.matchAll(/(?:cliente|case)\s+([A-ZÁÉÍÓÚ][\wÀ-ÿ]+(?:\s+[A-ZÁÉÍÓÚ][\wÀ-ÿ]+)?)/g)) {
		if (!autorizados.includes(norm(m[1]))) {
			problemas.push(`cliente/case não autorizado: "${m[1]}"`);
		}
	}
	if (problemas.length) {
		return fail("hallucination", `${problemas.length} indício(s) de informação sem lastro`, {
			problemas: problemas.slice(0, 5),
		});
	}
	return pass("hallucination");
}

// ── 6. Originalidade ────────────────────────────────────────────────────
export function originalityGate(article, ctx = {}) {
	const contribs = article.originalContribution ?? [];
	if (!Array.isArray(contribs) || contribs.length === 0) {
		return fail(
			"originality",
			"não declara contribuição original — reescrever os top 10 não basta",
		);
	}
	const validas = contribs.filter((c) => typeof c === "string" && c.trim().length >= 20);
	if (validas.length === 0) {
		return fail("originality", "contribuição original declarada é vaga demais");
	}
	// sobreposição alta com os concorrentes analisados
	const overlap = Number(ctx.serpOverlapRatio ?? 0);
	if (overlap > (ctx.maxOverlap ?? 0.8)) {
		return fail("originality", `sobreposição de ${(overlap * 100).toFixed(0)}% com os resultados existentes`);
	}
	return pass("originality", { contributions: validas.length });
}

// ── 7. Marca ────────────────────────────────────────────────────────────
export function brandGate(article) {
	const texto = norm(`${article.title} ${article.metaDescription} ${article.body ?? ""}`);
	const dentro = BRAND_SCOPE.some((t) => texto.includes(norm(t)));
	if (!dentro) {
		return fail("brand", "assunto fora do que a FlowAI realmente oferece");
	}
	for (const re of OVERPROMISE) {
		const m = (article.body ?? "").match(re);
		if (m) return fail("brand", `promessa que não podemos garantir: "${m[0]}"`);
	}
	if (!article.targetMoneyPage) {
		return fail("brand", "artigo não aponta para nenhuma money page — conteúdo sem função comercial");
	}
	return pass("brand");
}

// ── 8. Técnico ──────────────────────────────────────────────────────────
export function technicalGate(article) {
	const faltas = [];
	if (!article.title) faltas.push("title");
	else if (article.title.length > 70) faltas.push(`title com ${article.title.length} caracteres`);
	if (!article.metaDescription) faltas.push("metaDescription");
	else if (article.metaDescription.length > 165) {
		faltas.push(`metaDescription com ${article.metaDescription.length} caracteres`);
	}
	if (!article.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)) faltas.push("slug válido");
	if (!article.author) faltas.push("author");
	if (!article.publishedAt) faltas.push("publishedAt");
	if (article.publishedAt && article.publishedAt.slice(0, 10) > new Date().toISOString().slice(0, 10)) {
		faltas.push("publishedAt no futuro");
	}
	if (faltas.length) return fail("technical", `metadata incompleta: ${faltas.join(", ")}`, { faltas });
	return pass("technical");
}

// ── 9. Links internos ───────────────────────────────────────────────────
export function internalLinkGate(article, ctx = {}) {
	const body = article.body ?? "";
	const links = [...body.matchAll(/\]\((\/[^)]*)\)/g)].map((m) => m[1]);
	const known = new Set(ctx.knownRoutes ?? []);

	if (!article.targetMoneyPage) {
		return fail("internal_link", "não define money page de destino");
	}
	const apontaMoney =
		links.includes(article.targetMoneyPage) || body.includes(article.targetMoneyPage);
	if (!apontaMoney) {
		return fail("internal_link", `não linka a money page ${article.targetMoneyPage}`);
	}
	const quebrados = links.filter((l) => known.size > 0 && !known.has(l));
	if (quebrados.length) {
		return fail("internal_link", `links internos para rota inexistente: ${quebrados.join(", ")}`, {
			quebrados,
		});
	}
	if (links.length > (ctx.maxInternalLinks ?? 25)) {
		return fail("internal_link", `excesso de links internos (${links.length})`);
	}
	return pass("internal_link", { links: links.length });
}

// ── 10. Spam ────────────────────────────────────────────────────────────
export function spamGate(article, ctx = {}) {
	const body = article.body ?? "";
	const words = body.split(/\s+/).filter(Boolean);
	const min = ctx.minWordCount ?? 600;
	if (words.length < min) {
		return fail("spam", `conteúdo curto demais (${words.length} palavras, mínimo ${min})`);
	}
	// densidade da keyword principal
	const kw = norm(article.primaryKeyword ?? "");
	if (kw) {
		const occurrences = (norm(body).match(new RegExp(escapeRe(kw), "g")) ?? []).length;
		const density = occurrences / Math.max(words.length, 1);
		if (density > (ctx.maxKeywordDensity ?? 0.03)) {
			return fail("spam", `keyword stuffing: densidade de ${(density * 100).toFixed(1)}%`, { density });
		}
	}
	// parágrafos repetidos
	const paras = body.split(/\n{2,}/).map((p) => norm(p)).filter((p) => p.length > 60);
	const uniq = new Set(paras);
	if (paras.length > 3 && uniq.size < paras.length * 0.8) {
		return fail("spam", "parágrafos repetidos dentro do próprio artigo");
	}
	return pass("spam", { words: words.length });
}

// ── Orquestração ────────────────────────────────────────────────────────
export const ALL_GATES = [
	demandGate,
	intentGate,
	cannibalizationGate,
	sourceGate,
	hallucinationGate,
	originalityGate,
	brandGate,
	technicalGate,
	internalLinkGate,
	spamGate,
];

/** Roda todos os gates. Nunca para no primeiro erro — o relatório é completo. */
export function runGates(article, ctx = {}) {
	const results = ALL_GATES.map((g) => {
		try {
			return g(article, ctx);
		} catch (err) {
			return fail(g.name, `gate lançou exceção: ${err.message}`);
		}
	});
	const failed = results.filter((r) => !r.passed);
	return {
		passed: failed.length === 0,
		results,
		failed,
		summary: failed.length === 0 ? "todos os gates passaram" : `${failed.length} gate(s) reprovado(s)`,
	};
}

// ── utilidades ──────────────────────────────────────────────────────────
function norm(s) {
	return String(s ?? "")
		.toLowerCase()
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.trim();
}

function escapeRe(s) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractQuantClaims(body) {
	const out = [];
	for (const sentence of String(body ?? "").split(/(?<=[.!?])\s+/)) {
		if (QUANT_PATTERNS.some((re) => re.test(sentence))) out.push(sentence.trim());
	}
	return out;
}

export function titleSimilarity(a, b) {
	const A = new Set(norm(a).split(/\s+/).filter((w) => w.length > 3));
	const B = new Set(norm(b).split(/\s+/).filter((w) => w.length > 3));
	if (A.size === 0 || B.size === 0) return 0;
	let inter = 0;
	for (const w of A) if (B.has(w)) inter++;
	return inter / Math.min(A.size, B.size);
}
