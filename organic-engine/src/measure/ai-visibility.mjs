// Visibilidade em motores generativos.
//
// Mede se a FlowAI aparece nas respostas dos modelos e como aparece. Era o
// buraco central do sistema: sem isto, tabela, estatística e frescor são fé.
//
// Duas distinções que ferramentas ingênuas erram, e que aqui são regra:
//
// 1. MENÇÃO ≠ CITAÇÃO. Ser nomeado no texto é sinal fraco. Ser linkado como
//    fonte é o que traz tráfego e o que os estudos contam como citação.
// 2. SUBSTRING ≠ MARCA. "flow" casa dentro de "workflow" e "fluxo de trabalho".
//    Contar isso infla o número e mente para o dono do negócio.
//
// Sobre a comparação entre modelos: as taxas de citação variam até 46× entre
// plataformas. Comparar o número absoluto de dois modelos não diz nada — o que
// vale é a série de cada um contra ele mesmo ao longo do tempo.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Preço médio por sondagem. Estimativa deliberadamente conservadora. */
const CUSTO_POR_SONDAGEM_USD = 0.002;

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Aceita "FlowAI", "Flow AI", "flowai digital", "FLOWAI" — recusa "workflow".
 *
 * A quebra em camelCase é o que faz "FlowAI" casar com "Flow AI": sem ela o
 * nome vira um token único e a grafia separada, que é a mais comum em texto
 * gerado por modelo, passaria batida.
 */
function brandRegex(brand) {
	const tokens = String(brand ?? "")
		.trim()
		.replace(/([\p{Ll}\d])(\p{Lu})/gu, "$1 $2")
		.split(/\s+/)
		.map(escapeRe);
	// espaço opcional entre os pedaços; bordas de palavra dos dois lados
	const corpo = tokens.join("\\s*");
	return new RegExp(`(?<![\\p{L}\\d])${corpo}(?![\\p{L}\\d])`, "iu");
}

export function detectMentions(answer, target = {}) {
	const texto = String(answer ?? "");
	const brand = target.brand ?? "";
	const domain = target.domain ?? "";

	const reBrand = brand ? brandRegex(brand) : null;
	const mBrand = reBrand ? texto.match(reBrand) : null;

	// domínio: linkado ou citado cru — os dois valem como citação
	const reDomain = domain ? new RegExp(escapeRe(domain), "i") : null;
	const mDomain = reDomain ? texto.match(reDomain) : null;

	const primeira = [mBrand?.index, mDomain?.index].filter((i) => typeof i === "number");
	const position = primeira.length && texto.length ? Math.min(...primeira) / texto.length : null;

	const competitors = (target.competitors ?? []).filter((c) => brandRegex(c).test(texto));

	return {
		mentioned: Boolean(mBrand || mDomain),
		cited: Boolean(mDomain),
		position,
		competitors,
	};
}

/** Sondagem que respondeu de verdade. Falha e resposta vazia não contam. */
export const foiMedida = (r) => !r.error && typeof r.answer === "string" && r.answer.trim().length > 0;

/**
 * 0..100. Citação pesa mais que menção, e aparecer cedo pesa mais que tarde.
 * Pesos explícitos de propósito — é métrica de negócio, não modelo estatístico.
 */
export function visibilityScore(results = []) {
	if (!results.length) return 0;
	const soma = results.reduce((acc, r) => {
		if (!r.mentioned) return acc;
		const base = r.cited ? 70 : 35;
		// posição 0 (topo) devolve o bônus cheio; 1 (rodapé) devolve zero
		const pos = typeof r.position === "number" ? 1 - r.position : 0.5;
		return acc + base + 30 * pos;
	}, 0);
	return Math.min(100, Math.round(soma / results.length));
}

/** Quantas vezes cada marca apareceu — nós e os concorrentes, lado a lado. */
export function shareOfVoice(results = [], brand = "marca") {
	const contagem = {};
	for (const r of results) {
		if (r.mentioned) contagem[brand] = (contagem[brand] ?? 0) + 1;
		for (const c of r.competitors ?? []) contagem[c] = (contagem[c] ?? 0) + 1;
	}
	return contagem;
}

export function estimateProbeCost({ queries = 0, models = 0 } = {}) {
	return queries * models * CUSTO_POR_SONDAGEM_USD;
}

/**
 * Roda as sondagens. Para no teto de custo em vez de estourar a fatura, e uma
 * falha de modelo vira registro em vez de derrubar a rodada.
 */
export async function runProbe({
	queries = [],
	models = [],
	target = {},
	maxCostUsd = 0.5,
	dryRun = false,
	env = process.env,
	fetchImpl = globalThis.fetch,
} = {}) {
	const estimatedCostUsd = estimateProbeCost({ queries: queries.length, models: models.length });
	if (dryRun) {
		return { dryRun: true, estimatedCostUsd, results: [], score: 0, aborted: false };
	}

	const results = [];
	let spentUsd = 0;
	let aborted = false;

	for (const model of models) {
		for (const q of queries) {
			if (spentUsd + CUSTO_POR_SONDAGEM_USD > maxCostUsd) {
				aborted = true;
				break;
			}
			spentUsd += CUSTO_POR_SONDAGEM_USD;
			try {
				const res = await fetchImpl(OPENROUTER_URL, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${env.OPENROUTER_API_KEY ?? ""}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ model, messages: [{ role: "user", content: q }] }),
				});
				const json = await res.json();

				// HTTP não-ok NUNCA vira ausência. Isto quebrou de verdade: 402 por
				// falta de crédito em 24 de 24 sondagens virou "0/100, ausente em
				// tudo" — falha de cobrança apresentada como conclusão de negócio.
				if (res.ok === false) {
					const msg = json?.error?.message ?? "sem detalhe";
					throw new Error(`HTTP ${res.status}: ${msg}`);
				}

				const answer = json?.choices?.[0]?.message?.content ?? "";
				if (!String(answer).trim()) {
					throw new Error("resposta vazia — sondagem inválida, não é ausência de menção");
				}
				results.push({ query: q, model, answer, ...detectMentions(answer, target) });
			} catch (err) {
				results.push({
					query: q,
					model,
					error: err.message,
					mentioned: false,
					cited: false,
					position: null,
					competitors: [],
				});
			}
		}
		if (aborted) break;
	}

	// O score sai apenas das sondagens que responderam. Sem nenhuma, é `null` —
	// não zero. Zero afirma "medi e você não aparece"; null admite "não medi".
	const medidas = results.filter(foiMedida);
	return {
		dryRun: false,
		aborted,
		estimatedCostUsd,
		spentUsd,
		results,
		measured: medidas.length,
		failed: results.length - medidas.length,
		score: medidas.length ? visibilityScore(medidas) : null,
		shareOfVoice: shareOfVoice(medidas, target.brand ?? "marca"),
	};
}
