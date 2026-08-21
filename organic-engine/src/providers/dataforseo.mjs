// DataForSEO.
//
// Reaproveita a lógica que já existia e funcionava em api/services/dataforseo.js:
// auth Basic, tratamento de erro em dois níveis (status da resposta E status da
// task) e custo documentado por endpoint. O que foi acrescentado: keyword ideas,
// search volume, intent e domain intersection — a etapa de DESCOBERTA, que o
// código original não cobria.
//
// Política de custo (requisito 26): deep research 1x/mês; rank tracking só das
// keywords prioritárias. Todo custo é registrado antes de retornar.

import { Provider, ProviderError, fetchWithTimeout, isPermanent, withRetry, parseRetryAfter } from "./base.mjs";

const BASE = "https://api.dataforseo.com";

/** Custo estimado por chamada, em USD. Base do BudgetGuard. */
export const ENDPOINT_COST = {
	"/v3/on_page/instant_pages": 0.0001,
	"/v3/dataforseo_labs/google/ranked_keywords/live": 0.01,
	"/v3/dataforseo_labs/google/competitors_domain/live": 0.01,
	"/v3/dataforseo_labs/google/keyword_ideas/live": 0.01,
	"/v3/dataforseo_labs/google/keyword_suggestions/live": 0.01,
	"/v3/dataforseo_labs/google/search_intent/live": 0.001,
	"/v3/dataforseo_labs/google/domain_intersection/live": 0.01,
	"/v3/keywords_data/google_ads/search_volume/live": 0.005,
	"/v3/serp/google/organic/live/advanced": 0.002,
};

export const BRAZIL = { location_code: 2076, language_name: "Portuguese", language_code: "pt" };

export class DataForSeoProvider extends Provider {
	constructor(opts = {}) {
		super("dataforseo", opts);
		this.budget = opts.budget ?? null;
		this.fetchImpl = opts.fetchImpl ?? globalThis.fetch;
		this.timeoutMs = opts.timeoutMs ?? 30_000;
		this.retries = opts.retries ?? 3;
		this.sleep = opts.sleep;
	}

	requiredEnv() {
		return ["DATAFORSEO_LOGIN", "DATAFORSEO_PASSWORD"];
	}

	authHeader() {
		const login = this.env.DATAFORSEO_LOGIN;
		const password = this.env.DATAFORSEO_PASSWORD;
		if (!login || !password) {
			throw new ProviderError("credenciais do DataForSEO ausentes", {
				permanent: true,
				provider: this.name,
			});
		}
		return `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;
	}

	estimateCost(endpoint, tasks = 1) {
		return (ENDPOINT_COST[endpoint] ?? 0.01) * tasks;
	}

	async call(endpoint, body, { critical = false, articleId = null } = {}) {
		const tasks = Array.isArray(body) ? body.length : 1;
		const estimated = this.estimateCost(endpoint, tasks);

		if (this.budget) {
			const verdict = this.budget.check(estimated, { critical });
			if (!verdict.allowed) {
				throw new ProviderError(`bloqueado pelo orçamento: ${verdict.reason}`, {
					permanent: true,
					provider: this.name,
					endpoint,
				});
			}
		}

		const result = await withRetry(
			async () => {
				const res = await fetchWithTimeout(
					`${BASE}${endpoint}`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json", Authorization: this.authHeader() },
						body: JSON.stringify(body),
					},
					this.timeoutMs,
					this.fetchImpl,
				);

				if (!res.ok) {
					const err = new ProviderError(`HTTP ${res.status} em ${endpoint}`, {
						status: res.status,
						permanent: isPermanent(res.status),
						provider: this.name,
						endpoint,
					});
					const ra = parseRetryAfter(res.headers?.get?.("retry-after"));
					if (ra !== null) err.retryAfterMs = ra;
					throw err;
				}

				const data = await res.json();

				// Erro no nível da resposta
				if (data.status_code && data.status_code !== 20000) {
					const permanent = data.status_code >= 40000 && data.status_code < 50000;
					throw new ProviderError(`DataForSEO ${data.status_code}: ${data.status_message}`, {
						status: data.status_code,
						permanent,
						provider: this.name,
						endpoint,
					});
				}
				// Erro no nível da task — o motivo do tratamento em dois níveis
				const task = data.tasks?.[0];
				if (task && task.status_code && task.status_code !== 20000) {
					throw new ProviderError(`task ${task.status_code}: ${task.status_message}`, {
						status: task.status_code,
						permanent: task.status_code >= 40000 && task.status_code < 50000,
						provider: this.name,
						endpoint,
					});
				}
				return data;
			},
			{ retries: this.retries, sleep: this.sleep },
		);

		// custo real quando a API informa; senão, a estimativa
		const realCost = Number(result?.cost ?? 0) || estimated;
		this.recordCost({ endpoint, units: tasks, costUsd: realCost, articleId });
		this.budget?.spend(realCost);
		return result;
	}

	// ── Auditoria on-page ────────────────────────────────────────────────
	async onPageInstant(url) {
		const endpoint = "/v3/on_page/instant_pages";
		const data = await this.call(endpoint, [
			{ url, enable_javascript: true, enable_browser_rendering: true },
		]);
		const page = data.tasks?.[0]?.result?.[0]?.items?.[0];
		if (!page) return null;
		const meta = page.meta ?? {};
		const checks = page.checks ?? {};
		return {
			url: page.url,
			onPageScore: page.onpage_score ?? 0,
			statusCode: page.status_code ?? 0,
			title: meta.title ?? "",
			description: meta.description ?? "",
			loadTimeMs: page.page_timing?.duration ?? null,
			ttfbMs: page.page_timing?.time_to_interactive ?? null,
			internalLinks: meta.internal_links_count ?? 0,
			externalLinks: meta.external_links_count ?? 0,
			imagesWithoutAlt: checks.no_image_alt_attribute ?? 0,
			h1Count: meta.htags?.h1?.length ?? 0,
			hasCanonical: Boolean(meta.canonical),
			isHttps: String(page.url ?? "").startsWith("https"),
			wordCount: meta.content?.plain_text_word_count ?? 0,
			checks,
		};
	}

	// ── Ranking atual do domínio ─────────────────────────────────────────
	async rankedKeywords(domain, { limit = 50 } = {}) {
		const endpoint = "/v3/dataforseo_labs/google/ranked_keywords/live";
		const data = await this.call(endpoint, [
			{
				target: domain,
				language_name: BRAZIL.language_name,
				location_code: BRAZIL.location_code,
				limit,
				order_by: ["keyword_data.keyword_info.search_volume,desc"],
			},
		]);
		const result = data.tasks?.[0]?.result?.[0];
		if (!result) return null;
		const keywords = (result.items ?? []).map((item) => ({
			keyword: item.keyword_data?.keyword ?? "",
			position: item.ranked_serp_element?.serp_item?.rank_absolute ?? 0,
			searchVolume: item.keyword_data?.keyword_info?.search_volume ?? 0,
			url: item.ranked_serp_element?.serp_item?.url ?? "",
			cpc: item.keyword_data?.keyword_info?.cpc ?? 0,
			competition: item.keyword_data?.keyword_info?.competition_level ?? "",
		}));
		return {
			totalKeywords: result.total_count ?? 0,
			keywords,
			top3: keywords.filter((k) => k.position > 0 && k.position <= 3).length,
			top10: keywords.filter((k) => k.position > 0 && k.position <= 10).length,
			// as duas faixas do Quick Wins Engine (requisito 42)
			positions4to10: keywords.filter((k) => k.position >= 4 && k.position <= 10),
			positions11to20: keywords.filter((k) => k.position >= 11 && k.position <= 20),
		};
	}

	// ── Concorrentes ─────────────────────────────────────────────────────
	async competitors(domain, { limit = 10 } = {}) {
		const endpoint = "/v3/dataforseo_labs/google/competitors_domain/live";
		const data = await this.call(endpoint, [
			{
				target: domain,
				language_name: BRAZIL.language_name,
				location_code: BRAZIL.location_code,
				limit,
				filters: ["avg_position", "<=", 50],
			},
		]);
		const items = data.tasks?.[0]?.result?.[0]?.items ?? [];
		return items.map((i) => ({
			domain: i.domain ?? "",
			avgPosition: Math.round(i.avg_position ?? 0),
			keywordsCount: i.se_keywords ?? i.keywords_count ?? 0,
			intersections: i.intersections ?? 0,
			visibility: i.visibility ?? 0,
		}));
	}

	// ── DESCOBERTA (novo) ────────────────────────────────────────────────
	async keywordIdeas(seeds, { limit = 200 } = {}) {
		const endpoint = "/v3/dataforseo_labs/google/keyword_ideas/live";
		const data = await this.call(endpoint, [
			{
				keywords: Array.isArray(seeds) ? seeds : [seeds],
				language_name: BRAZIL.language_name,
				location_code: BRAZIL.location_code,
				limit,
				order_by: ["keyword_info.search_volume,desc"],
			},
		]);
		const items = data.tasks?.[0]?.result?.[0]?.items ?? [];
		return items.map(normalizeKeywordItem);
	}

	async searchVolume(keywords) {
		const endpoint = "/v3/keywords_data/google_ads/search_volume/live";
		const data = await this.call(endpoint, [
			{
				keywords,
				language_code: BRAZIL.language_code,
				location_code: BRAZIL.location_code,
			},
		]);
		const items = data.tasks?.[0]?.result ?? [];
		return items.map((i) => ({
			keyword: i.keyword ?? "",
			searchVolume: i.search_volume ?? 0,
			cpc: i.cpc ?? 0,
			competition: i.competition_index ?? null,
		}));
	}

	async searchIntent(keywords) {
		const endpoint = "/v3/dataforseo_labs/google/search_intent/live";
		const data = await this.call(endpoint, [
			{ keywords, language_name: BRAZIL.language_name },
		]);
		const items = data.tasks?.[0]?.result?.[0]?.items ?? [];
		return items.map((i) => ({
			keyword: i.keyword ?? "",
			intent: mapIntent(i.keyword_intent?.label),
			probability: i.keyword_intent?.probability ?? null,
		}));
	}

	/** Gap: o que o concorrente ranqueia e nós não. */
	async domainIntersection(ourDomain, theirDomain, { limit = 100 } = {}) {
		const endpoint = "/v3/dataforseo_labs/google/domain_intersection/live";
		const data = await this.call(endpoint, [
			{
				target1: ourDomain,
				target2: theirDomain,
				language_name: BRAZIL.language_name,
				location_code: BRAZIL.location_code,
				intersections: false, // só o que o target2 tem e o target1 não
				limit,
			},
		]);
		const items = data.tasks?.[0]?.result?.[0]?.items ?? [];
		return items.map(normalizeKeywordItem);
	}
}

function normalizeKeywordItem(i) {
	const info = i.keyword_info ?? i.keyword_data?.keyword_info ?? {};
	const props = i.keyword_properties ?? i.keyword_data?.keyword_properties ?? {};
	return {
		keyword: i.keyword ?? i.keyword_data?.keyword ?? "",
		searchVolume: info.search_volume ?? 0,
		cpc: info.cpc ?? 0,
		competition: info.competition ?? null,
		competitionLevel: info.competition_level ?? null,
		difficulty: props.keyword_difficulty ?? null,
	};
}

/** Vocabulário do DataForSEO -> o nosso. */
export function mapIntent(label) {
	const map = {
		informational: "informacional",
		commercial: "comercial",
		transactional: "transacional",
		navigational: "navegacional",
	};
	return map[String(label ?? "").toLowerCase()] ?? null;
}
