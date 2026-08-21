// Valida as keywords-alvo das money pages já existentes.
//
// NÃO reconstrói página nenhuma e NÃO descarta página por volume baixo:
// money page também existe para arquitetura, conversão, entidade, links
// internos e long tail. O resultado é insumo para otimizar title, H1 e termos
// secundários — não sentença de vida ou morte.
//
// Teto de custo é HARD CAP: a execução aborta antes de estourar.

import { DataForSeoProvider, estimateEndpointCost } from "../providers/dataforseo.mjs";
import { CostLedger, BudgetGuard } from "../providers/base.mjs";

/** Estima o custo total antes de gastar qualquer centavo. */
export function planCalls(keywords, { withIntent = true } = {}) {
	const calls = [];
	// search_volume aceita lote — uma chamada resolve todas
	calls.push({
		endpoint: "/v3/keywords_data/google_ads/search_volume/live",
		description: `volume de ${keywords.length} keywords`,
		cost: estimateEndpointCost("/v3/keywords_data/google_ads/search_volume/live", { units: keywords.length }),
	});
	if (withIntent) {
		calls.push({
			endpoint: "/v3/dataforseo_labs/google/search_intent/live",
			description: `intenção de ${keywords.length} keywords`,
			cost: estimateEndpointCost("/v3/dataforseo_labs/google/search_intent/live", { units: keywords.length }),
		});
	}
	const total = calls.reduce((s, c) => s + c.cost, 0);
	return { calls, estimatedUsd: Number(total.toFixed(6)) };
}

/** Reduz o escopo até caber no teto, em vez de estourar. */
export function fitToBudget(keywords, maxCostUsd) {
	let withIntent = true;
    let plan = planCalls(keywords, { withIntent });
	if (plan.estimatedUsd <= maxCostUsd) return { keywords, withIntent, plan };

	withIntent = false;
	plan = planCalls(keywords, { withIntent });
	if (plan.estimatedUsd <= maxCostUsd) return { keywords, withIntent, plan };

	return { keywords: [], withIntent: false, plan, aborted: true };
}

/**
 * Compara a keyword-alvo com alternativas e devolve recomendação.
 * `alternatives` são sinônimos plausíveis para a mesma intenção.
 */
export function recommend({ target, volumes, intents, alternatives = [] }) {
	const byKw = new Map(volumes.map((v) => [norm(v.keyword), v]));
	const intentByKw = new Map((intents ?? []).map((i) => [norm(i.keyword), i]));

	const alvo = byKw.get(norm(target)) ?? { keyword: target, searchVolume: null };
	const alvoIntent = intentByKw.get(norm(target))?.intent ?? null;

	const alts = alternatives
		.map((a) => byKw.get(norm(a)))
		.filter(Boolean)
		.sort((x, y) => (y.searchVolume ?? 0) - (x.searchVolume ?? 0));

	const melhor = alts[0];
	const ganho =
		melhor && alvo.searchVolume !== null && melhor.searchVolume > (alvo.searchVolume ?? 0)
			? melhor
			: null;

	const notas = [];
	if (alvo.searchVolume === null) notas.push("sem dado de volume para a keyword-alvo");
	else if (alvo.searchVolume === 0) {
		notas.push(
			"volume reportado zero — manter a página pela arquitetura e conversão, e trabalhar long tail no corpo",
		);
	}
	if (ganho) {
		notas.push(
			`"${ganho.keyword}" tem mais volume (${ganho.searchVolume}) que "${target}" (${alvo.searchVolume ?? "n/d"}) — considerar no title e no H1`,
		);
	}
	if (alvoIntent && alvoIntent !== "comercial") {
		notas.push(
			`intenção detectada "${alvoIntent}" difere de comercial — revisar o texto de abertura, não remover a página`,
		);
	}

	return {
		target,
		targetVolume: alvo.searchVolume,
		targetIntent: alvoIntent,
		alternatives: alts.map((a) => ({ keyword: a.keyword, volume: a.searchVolume })),
		suggestion: ganho ? ganho.keyword : null,
		// nunca "remover": a decisão de arquitetura não sai de volume
		action: ganho ? "OTIMIZAR_TITULO" : alvo.searchVolume ? "MANTER" : "MANTER_E_OBSERVAR",
		notes: notas,
	};
}

function norm(s) {
	return String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

/**
 * Executa o baseline. `dryRun` calcula custo e não chama nada.
 */
export async function runBaseline({
	targets,
	maxCostUsd = 1.0,
	env = process.env,
	dryRun = false,
	provider = null,
	log = console.log,
}) {
	const todas = [...new Set(targets.flatMap((t) => [t.keyword, ...(t.alternatives ?? [])]))];
	const fit = fitToBudget(todas, maxCostUsd);

	log(`keywords a consultar: ${todas.length}`);
	log(`custo estimado: US$ ${fit.plan.estimatedUsd.toFixed(4)} (teto US$ ${maxCostUsd.toFixed(2)})`);
	for (const c of fit.plan.calls) log(`  ${c.description} — US$ ${c.cost.toFixed(4)}`);

	if (fit.aborted) {
		log("ABORTADO: nem a versão reduzida cabe no teto.");
		return { aborted: true, estimatedUsd: fit.plan.estimatedUsd, spentUsd: 0, results: [] };
	}
	if (!fit.withIntent) log("intenção desativada para caber no teto.");
	if (dryRun) {
		log("dry run — nenhuma chamada foi feita.");
		return { dryRun: true, estimatedUsd: fit.plan.estimatedUsd, spentUsd: 0, results: [] };
	}

	const ledger = new CostLedger();
	// o guard usa o teto da execução, não o mensal — é o cap desta rodada
	const budget = new BudgetGuard({ monthlyBudgetUsd: maxCostUsd, spentUsd: 0 });
	const dfs = provider ?? new DataForSeoProvider({ env, ledger, budget });

	const volumes = await dfs.searchVolume(todas);
	const intents = fit.withIntent ? await dfs.searchIntent(todas) : [];

	const results = targets.map((t) =>
		recommend({ target: t.keyword, volumes, intents, alternatives: t.alternatives ?? [], }),
	);

	const spent = ledger.total("dataforseo");
	log(`custo real: US$ ${spent.toFixed(4)}`);
	return { spentUsd: spent, estimatedUsd: fit.plan.estimatedUsd, results, ledger: ledger.entries };
}
