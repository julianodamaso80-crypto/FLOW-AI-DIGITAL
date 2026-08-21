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

/**
 * Custo por endpoint, em USD.
 *
 * `base` é o custo fixo da task; `perUnit` é o custo por item consultado
 * (keyword na entrada ou linha no resultado). Modelar só o custo fixo
 * subestima brutalmente: uma execução real de 39 keywords custou US$ 0,1067
 * contra US$ 0,0060 estimados pelo modelo antigo — 17x de erro.
 *
 * Os valores abaixo foram calibrados contra esse gasto observado, com margem
 * de segurança para cima. O custo REAL sempre substitui a estimativa depois
 * da resposta (o campo `cost` que a API devolve).
 */
export const ENDPOINT_COST = {
	"/v3/on_page/instant_pages": { base: 0.0006, perUnit: 0 },
	"/v3/dataforseo_labs/google/ranked_keywords/live": { base: 0.01, perUnit: 0.0001 },
	"/v3/dataforseo_labs/google/competitors_domain/live": { base: 0.01, perUnit: 0.0001 },
	"/v3/dataforseo_labs/google/keyword_ideas/live": { base: 0.01, perUnit: 0.0001 },
	"/v3/dataforseo_labs/google/keyword_suggestions/live": { base: 0.01, perUnit: 0.0001 },
	"/v3/dataforseo_labs/google/search_intent/live": { base: 0.006, perUnit: 0.0002 },
	"/v3/dataforseo_labs/google/domain_intersection/live": { base: 0.01, perUnit: 0.0001 },
	"/v3/keywords_data/google_ads/search_volume/live": { base: 0.08, perUnit: 0.0006 },
	"/v3/serp/google/organic/live/advanced": { base: 0.002, perUnit: 0 },
};

const DEFAULT_COST = { base: 0.02, perUnit: 0.0005 };

/** Custo estimado de uma chamada. `units` = keywords ou itens pedidos. */
export function estimateEndpointCost(endpoint, { tasks = 1, units = 0 } = {}) {
	const c = ENDPOINT_COST[endpoint] ?? DEFAULT_COST;
	return Number((c.base * tasks + c.perUnit * units).toFixed(6));
}

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

	estimateCost(endpoint, tasks = 1, units = 0) {
		return estimateEndpointCost(endpoint, { tasks, units });
	}

	/**
	 * Verificação real da conta, SEM custo.
	 * GET /v3/appendix/user_data é gratuito e devolve saldo, limites e uso —
	 * é a única forma honesta de provar que a credencial funciona sem gastar.
	 * Presença de variável de ambiente não prova nada.
	 */
	async verify() {
		if (!this.configured) {
			return { verified: false, reason: "credenciais ausentes", costUsd: 0 };
		}
		try {
			const res = await fetchWithTimeout(
				`${BASE}/v3/appendix/user_data`,
				{ method: "GET", headers: { Authorization: this.authHeader() } },
				15_000,
				this.fetchImpl,
			);
			if (!res.ok) {
				return { verified: false, reason: `HTTP ${res.status}`, costUsd: 0 };
			}
			const data = await res.json();
			if (data.status_code !== 20000) {
				return {
					verified: false,
					reason: `${data.status_code}: ${data.status_message}`,
					costUsd: 0,
				};
			}
			const r = data.tasks?.[0]?.result?.[0] ?? {};
			const rates = r.rates ?? {};
			return {
				verified: true,
				// login parcialmente mascarado — confirma a conta sem expor o e-mail
				loginMasked: maskLogin(this.env.DATAFORSEO_LOGIN),
				balanceUsd: r.money?.balance ?? null,
				limitUsd: r.money?.limit ?? null,
				spentTodayUsd: r.money?.total?.today ?? null,
				rateLimitPerMinute: rates.limits?.minute ?? null,
				tasksInQueue: r.tasks_in_queue ?? null,
				costUsd: 0,
			};
		} catch (err) {
			return { verified: false, reason: err.message, costUsd: 0 };
		}
	}

	async call(endpoint, body, { critical = false, articleId = null } = {}) {
		const tasks = Array.isArray(body) ? body.length : 1;
		// unidades = keywords enviadas ou limite pedido; sem isso a estimativa
		// ignora o que mais pesa na conta.
		const units = Array.isArray(body)
			? body.reduce((s, t) => s + (t.keywords?.length ?? t.limit ?? 0), 0)
			: 0;
		const estimated = this.estimateCost(endpoint, tasks, units);

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

/** Mostra só o suficiente para conferir a conta: `jo***@do***.com`. */
export function maskLogin(login) {
	const s = String(login ?? "");
	if (!s) return null;
	const [user, domain] = s.split("@");
	if (!domain) return `${s.slice(0, 2)}***`;
	const d = domain.split(".");
	return `${user.slice(0, 2)}***@${d[0].slice(0, 2)}***${d.length > 1 ? "." + d.slice(1).join(".") : ""}`;
}
