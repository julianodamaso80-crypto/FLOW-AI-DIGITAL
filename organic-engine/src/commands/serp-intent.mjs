// Validação de intenção pela SERP real.
//
// Volume alto não significa que a keyword serve. "gestor de tráfego" tem muito
// volume, mas boa parte de quem busca quer CURSO ou EMPREGO — trocar o H1 por
// esse termo traria o público errado.
//
// Aqui a SERP real é lida e classificada. A decisão sai do PERFIL dos
// resultados, não do número de buscas.

import { DataForSeoProvider, BRAZIL, estimateEndpointCost } from "../providers/dataforseo.mjs";
import { CostLedger, BudgetGuard } from "../providers/base.mjs";

const SERP_ENDPOINT = "/v3/serp/google/organic/live/advanced";

/** Sinais que revelam o que o buscador realmente quer. */
const SIGNALS = {
	emprego: [
		"vaga", "vagas", "salário", "salario", "quanto ganha", "carreira",
		"profissão", "profissao", "como ser", "como se tornar", "trabalhar como",
		"indeed", "catho", "glassdoor", "vagas.com", "linkedin.com/jobs", "gupy",
	],
	curso: [
		"curso", "cursos", "aprenda", "aprender", "formação", "formacao",
		"treinamento", "certificação", "certificacao", "aula", "mentoria",
		"hotmart", "udemy", "alura", "ebook", "gratuito", "do zero",
	],
	saas: [
		"software", "plataforma", "ferramenta", "app", "aplicativo", "sistema online",
		"teste grátis", "teste gratis", "trial", "planos e preços", "pricing",
	],
	servico: [
		"agência", "agencia", "consultoria", "contratar", "empresa de",
		"serviço de", "servico de", "orçamento", "orcamento", "para empresas",
		"terceirizar",
	],
	informacional: [
		"o que é", "o que e", "como funciona", "guia", "significa",
		"tudo sobre", "para que serve", "vale a pena", "diferença", "diferenca",
	],
};

const DIRECTORIES = ["indeed.", "catho.", "glassdoor.", "vagas.com", "gupy.io", "infojobs.", "trabalhabrasil."];
const LEARNING = ["udemy.", "alura.", "hotmart.", "coursera.", "ev.org.br", "sebrae."];

const norm = (s) =>
	String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Classifica um resultado individual pelo título, snippet e domínio. */
export function classifyResult(item) {
	const texto = norm(`${item.title ?? ""} ${item.description ?? ""}`);
	const dominio = norm(item.domain ?? "");
	const marcas = [];

	for (const [tipo, termos] of Object.entries(SIGNALS)) {
		if (termos.some((t) => texto.includes(norm(t)))) marcas.push(tipo);
	}
	if (DIRECTORIES.some((d) => dominio.includes(d))) marcas.push("emprego");
	if (LEARNING.some((d) => dominio.includes(d))) marcas.push("curso");

	return { domain: item.domain, title: item.title, marks: [...new Set(marcas)] };
}

/** Perfil agregado dos top N. */
export function profileSerp(items, { top = 10 } = {}) {
	const classificados = items.slice(0, top).map(classifyResult);
	const contagem = {};
	for (const c of classificados) {
		for (const m of c.marks) contagem[m] = (contagem[m] ?? 0) + 1;
	}
	const total = classificados.length || 1;
	const share = Object.fromEntries(
		Object.entries(contagem).map(([k, v]) => [k, Number((v / total).toFixed(2))]),
	);
	// o perfil dominante é o mais frequente com pelo menos 30% dos resultados
	const dominante =
		Object.entries(share)
			.filter(([, v]) => v >= 0.3)
			.sort(([, a], [, b]) => b - a)[0]?.[0] ?? "misto";
	return { results: classificados, counts: contagem, share, dominant: dominante, sampled: classificados.length };
}

/** Compara dois perfis: mesma intenção, mista ou diferente? */
export function compareIntent(atual, candidato, { limiarRuido = 0.3 } = {}) {
	const ruidoCandidato = (candidato.share.emprego ?? 0) + (candidato.share.curso ?? 0);
    const ruidoAtual = (atual.share.emprego ?? 0) + (atual.share.curso ?? 0);

	if (ruidoCandidato >= limiarRuido && ruidoAtual < limiarRuido) {
		return {
			verdict: "DIFFERENT_INTENT",
			decision: "MANTER_KEYWORD_ATUAL",
			reason: `a SERP do candidato tem ${(ruidoCandidato * 100).toFixed(0)}% de resultados de emprego/curso — público diferente de quem contrata`,
		};
	}
	if (atual.dominant === candidato.dominant) {
		return {
			verdict: "SAME_INTENT",
			decision: "PODE_TROCAR",
			reason: `ambas as SERPs são dominadas por "${atual.dominant}"`,
		};
	}
	return {
		verdict: "MIXED_INTENT",
		decision: "USAR_COMO_SECUNDARIA",
		reason: `perfis diferentes: atual "${atual.dominant}" vs candidato "${candidato.dominant}" — usar o candidato como termo secundário, não como H1`,
	};
}

export function planSerpCalls(keywords) {
	const cost = keywords.reduce(
		(s, k) => s + estimateEndpointCost(SERP_ENDPOINT, { tasks: 1, units: 10 }),
		0,
	);
	return { queries: keywords.length, estimatedUsd: Number(cost.toFixed(4)) };
}

export async function runSerpValidation({
	pairs,
	maxCostUsd = 0.5,
	env = process.env,
	dryRun = false,
	provider = null,
	log = console.log,
}) {
	const keywords = [...new Set(pairs.flatMap((p) => [p.current, p.candidate]))];
	const plan = planSerpCalls(keywords);

	log(`SERPs a consultar: ${plan.queries}`);
	log(`custo estimado: US$ ${plan.estimatedUsd.toFixed(4)} (teto US$ ${maxCostUsd.toFixed(2)})`);

	if (plan.estimatedUsd > maxCostUsd) {
		log("ABORTADO: estimativa acima do teto.");
		return { aborted: true, estimatedUsd: plan.estimatedUsd, spentUsd: 0, results: [] };
	}
	if (dryRun) {
		log("dry run — nenhuma chamada foi feita.");
		return { dryRun: true, estimatedUsd: plan.estimatedUsd, spentUsd: 0, results: [] };
	}

	const ledger = new CostLedger();
	const budget = new BudgetGuard({ monthlyBudgetUsd: maxCostUsd, spentUsd: 0 });
	const dfs = provider ?? new DataForSeoProvider({ env, ledger, budget });

	const perfis = new Map();
	for (const kw of keywords) {
		const data = await dfs.call(SERP_ENDPOINT, [
			{
				keyword: kw,
				language_name: BRAZIL.language_name,
				location_code: BRAZIL.location_code,
				depth: 10,
			},
		]);
		const items = (data.tasks?.[0]?.result?.[0]?.items ?? []).filter((i) => i.type === "organic");
		perfis.set(kw, profileSerp(items));
		log(`  ${kw} — top ${perfis.get(kw).sampled}, perfil "${perfis.get(kw).dominant}"`);
	}

	const results = pairs.map((p) => {
		const atual = perfis.get(p.current);
		const cand = perfis.get(p.candidate);
		const cmp = compareIntent(atual, cand);
		return {
			page: p.page,
			current: p.current,
			currentVolume: p.currentVolume ?? null,
			currentProfile: atual.dominant,
			currentShare: atual.share,
			candidate: p.candidate,
			candidateVolume: p.candidateVolume ?? null,
			candidateProfile: cand.dominant,
			candidateShare: cand.share,
			topDomains: cand.results.slice(0, 5).map((r) => r.domain),
			...cmp,
		};
	});

	const spent = ledger.total("dataforseo");
	log(`\ncusto real: US$ ${spent.toFixed(4)}`);
	return { spentUsd: spent, estimatedUsd: plan.estimatedUsd, results, profiles: perfis };
}
