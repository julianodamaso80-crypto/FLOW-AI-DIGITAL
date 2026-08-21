// Providers do Google: Search Console, GA4 Data API, PageSpeed e CrUX.
//
// Todos aceitam `fetchImpl` e `tokenProvider` injetáveis — é o que permite
// testar o contrato sem credencial e sem rede.
//
// Escopo do GSC: READ ONLY por padrão. A submissão de sitemap é a única
// operação de escrita e exige escopo ampliado explícito.

import { Provider, ProviderError, fetchWithTimeout, isPermanent, withRetry, parseRetryAfter } from "./base.mjs";

const GSC_READONLY = "https://www.googleapis.com/auth/webmasters.readonly";
const GSC_WRITE = "https://www.googleapis.com/auth/webmasters";
const GA4_READONLY = "https://www.googleapis.com/auth/analytics.readonly";

async function googleFetch(provider, url, options, { critical = false } = {}) {
	return withRetry(
		async () => {
			const token = await provider.getAccessToken();
			const res = await fetchWithTimeout(
				url,
				{
					...options,
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
						...(options.headers ?? {}),
					},
				},
				provider.timeoutMs,
				provider.fetchImpl,
			);
			if (!res.ok) {
				const err = new ProviderError(`HTTP ${res.status} em ${url}`, {
					status: res.status,
					permanent: isPermanent(res.status),
					provider: provider.name,
				});
				const ra = parseRetryAfter(res.headers?.get?.("retry-after"));
				if (ra !== null) err.retryAfterMs = ra;
				throw err;
			}
			return res.json();
		},
		{ retries: provider.retries, sleep: provider.sleep },
	);
}

class GoogleProvider extends Provider {
	constructor(name, opts = {}) {
		super(name, opts);
		this.fetchImpl = opts.fetchImpl ?? globalThis.fetch;
		this.timeoutMs = opts.timeoutMs ?? 30_000;
		this.retries = opts.retries ?? 3;
		this.sleep = opts.sleep;
		// injetável nos testes; em produção troca por JWT assinado da service account
		this.tokenProvider = opts.tokenProvider ?? null;
	}
	async getAccessToken() {
		if (this.tokenProvider) return this.tokenProvider();
		if (!this.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
			throw new ProviderError("GOOGLE_SERVICE_ACCOUNT_JSON ausente", {
				permanent: true,
				provider: this.name,
			});
		}
		throw new ProviderError(
			"troca de JWT por access token ainda não implementada — injete tokenProvider",
			{ permanent: true, provider: this.name },
		);
	}
}

// ── Search Console ──────────────────────────────────────────────────────
export class SearchConsoleProvider extends GoogleProvider {
	constructor(opts = {}) {
		super("google-search-console", opts);
	}
	requiredEnv() {
		return ["GOOGLE_SERVICE_ACCOUNT_JSON", "GSC_SITE_URL"];
	}
	scopes({ write = false } = {}) {
		return write ? [GSC_WRITE] : [GSC_READONLY];
	}
	get siteUrl() {
		return this.env.GSC_SITE_URL;
	}

	async listSites() {
		const data = await googleFetch(this, "https://www.googleapis.com/webmasters/v3/sites", {
			method: "GET",
		});
		return (data.siteEntry ?? []).map((s) => ({
			siteUrl: s.siteUrl,
			permissionLevel: s.permissionLevel,
		}));
	}

	/**
	 * Search Analytics. `dimensions` padrão cobre o que o Engine cruza depois.
	 * A API pagina por rowLimit/startRow — o chamador itera.
	 */
	async searchAnalytics({ startDate, endDate, dimensions = ["date", "page", "query"], rowLimit = 25000, startRow = 0 }) {
		const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(this.siteUrl)}/searchAnalytics/query`;
		const data = await googleFetch(this, url, {
			method: "POST",
			body: JSON.stringify({ startDate, endDate, dimensions, rowLimit, startRow, type: "web" }),
		});
		return (data.rows ?? []).map((r) => {
			const out = {
				clicks: r.clicks ?? 0,
				impressions: r.impressions ?? 0,
				ctr: r.ctr ?? 0,
				position: r.position ?? 0,
			};
			dimensions.forEach((d, i) => {
				out[d] = r.keys?.[i] ?? null;
			});
			return out;
		});
	}

	async listSitemaps() {
		const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(this.siteUrl)}/sitemaps`;
		const data = await googleFetch(this, url, { method: "GET" });
		return (data.sitemap ?? []).map((s) => ({
			path: s.path,
			lastSubmitted: s.lastSubmitted,
			isPending: s.isPending,
			warnings: s.warnings,
			errors: s.errors,
		}));
	}

	/** Única operação de escrita — exige escopo ampliado. */
	async submitSitemap(feedpath) {
		const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(this.siteUrl)}/sitemaps/${encodeURIComponent(feedpath)}`;
		await googleFetch(this, url, { method: "PUT" });
		return { submitted: true, feedpath };
	}

	/**
	 * URL Inspection: INSPECIONA o estado de indexação. Não força indexação —
	 * essa capacidade não existe nesta API e não será simulada.
	 */
	async inspectUrl(inspectionUrl) {
		const data = await googleFetch(this, "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
			method: "POST",
			body: JSON.stringify({
				inspectionUrl,
				siteUrl: this.siteUrl,
				languageCode: "pt-BR",
			}),
		});
		const r = data.inspectionResult ?? {};
		return {
			verdict: r.indexStatusResult?.verdict ?? null,
			coverageState: r.indexStatusResult?.coverageState ?? null,
			robotsTxtState: r.indexStatusResult?.robotsTxtState ?? null,
			indexingState: r.indexStatusResult?.indexingState ?? null,
			lastCrawlTime: r.indexStatusResult?.lastCrawlTime ?? null,
			googleCanonical: r.indexStatusResult?.googleCanonical ?? null,
			userCanonical: r.indexStatusResult?.userCanonical ?? null,
			mobileUsable: r.mobileUsabilityResult?.verdict ?? null,
		};
	}
}

// ── GA4 Data API ────────────────────────────────────────────────────────
export class Ga4Provider extends GoogleProvider {
	constructor(opts = {}) {
		super("google-analytics", opts);
	}
	requiredEnv() {
		return ["GOOGLE_SERVICE_ACCOUNT_JSON", "GA4_PROPERTY_ID"];
	}
	scopes() {
		return [GA4_READONLY];
	}

	async runReport({ startDate, endDate, dimensions = ["date", "landingPage", "sessionSourceMedium"], metrics = ["sessions", "engagedSessions", "conversions"], limit = 100000 }) {
		const prop = this.env.GA4_PROPERTY_ID;
		const url = `https://analyticsdata.googleapis.com/v1beta/properties/${prop}:runReport`;
		const data = await googleFetch(this, url, {
			method: "POST",
			body: JSON.stringify({
				dateRanges: [{ startDate, endDate }],
				dimensions: dimensions.map((name) => ({ name })),
				metrics: metrics.map((name) => ({ name })),
				limit,
			}),
		});
		return (data.rows ?? []).map((row) => {
			const out = {};
			dimensions.forEach((d, i) => {
				out[d] = row.dimensionValues?.[i]?.value ?? null;
			});
			metrics.forEach((m, i) => {
				out[m] = Number(row.metricValues?.[i]?.value ?? 0);
			});
			return out;
		});
	}

	/** Sessões orgânicas por landing page — o cruzamento com GSC. */
	async organicLandingPages({ startDate, endDate }) {
		const rows = await this.runReport({
			startDate,
			endDate,
			dimensions: ["date", "landingPage", "sessionSourceMedium"],
			metrics: ["sessions", "engagedSessions", "conversions"],
		});
		return rows.filter((r) => /organic/i.test(r.sessionSourceMedium ?? ""));
	}
}

// ── PageSpeed Insights ──────────────────────────────────────────────────
export class PageSpeedProvider extends Provider {
	constructor(opts = {}) {
		super("pagespeed", opts);
		this.fetchImpl = opts.fetchImpl ?? globalThis.fetch;
		this.timeoutMs = opts.timeoutMs ?? 60_000;
		this.retries = opts.retries ?? 2;
		this.sleep = opts.sleep;
	}
	requiredEnv() {
		return ["GOOGLE_API_KEY"];
	}

	async analyze(url, { strategy = "mobile" } = {}) {
		const api = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
		api.searchParams.set("url", url);
		api.searchParams.set("strategy", strategy);
		api.searchParams.set("category", "performance");
		if (this.env.GOOGLE_API_KEY) api.searchParams.set("key", this.env.GOOGLE_API_KEY);

		const data = await withRetry(
			async () => {
				const res = await fetchWithTimeout(api.toString(), {}, this.timeoutMs, this.fetchImpl);
				if (!res.ok) {
					throw new ProviderError(`HTTP ${res.status} no PageSpeed`, {
						status: res.status,
						permanent: isPermanent(res.status),
						provider: this.name,
					});
				}
				return res.json();
			},
			{ retries: this.retries, sleep: this.sleep },
		);

		const audits = data.lighthouseResult?.audits ?? {};
		return {
			url,
			formFactor: strategy,
			performanceScore: Math.round((data.lighthouseResult?.categories?.performance?.score ?? 0) * 100),
			lcpMs: audits["largest-contentful-paint"]?.numericValue ?? null,
			clsRaw: audits["cumulative-layout-shift"]?.numericValue ?? null,
			fcpMs: audits["first-contentful-paint"]?.numericValue ?? null,
			ttfbMs: audits["server-response-time"]?.numericValue ?? null,
			tbtMs: audits["total-blocking-time"]?.numericValue ?? null,
		};
	}
}

// ── CrUX (dados de campo) ───────────────────────────────────────────────
export class CruxProvider extends Provider {
	constructor(opts = {}) {
		super("crux", opts);
		this.fetchImpl = opts.fetchImpl ?? globalThis.fetch;
		this.timeoutMs = opts.timeoutMs ?? 30_000;
		this.retries = opts.retries ?? 2;
		this.sleep = opts.sleep;
	}
	requiredEnv() {
		return ["GOOGLE_API_KEY"];
	}

	async query({ url, origin, formFactor = "PHONE" }) {
		const key = this.env.GOOGLE_API_KEY;
		if (!key) {
			throw new ProviderError("GOOGLE_API_KEY ausente", { permanent: true, provider: this.name });
		}
		const body = { formFactor };
		if (url) body.url = url;
		else body.origin = origin;

		const data = await withRetry(
			async () => {
				const res = await fetchWithTimeout(
					`https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${key}`,
					{ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
					this.timeoutMs,
					this.fetchImpl,
				);
				// 404 = sem dado de campo suficiente. É resposta válida, não erro.
				if (res.status === 404) return null;
				if (!res.ok) {
					throw new ProviderError(`HTTP ${res.status} no CrUX`, {
						status: res.status,
						permanent: isPermanent(res.status),
						provider: this.name,
					});
				}
				return res.json();
			},
			{ retries: this.retries, sleep: this.sleep },
		);

		if (!data) return { hasFieldData: false };
		const m = data.record?.metrics ?? {};
		return {
			hasFieldData: true,
			formFactor,
			lcpMs: m.largest_contentful_paint?.percentiles?.p75 ?? null,
			inpMs: m.interaction_to_next_paint?.percentiles?.p75 ?? null,
			cls: m.cumulative_layout_shift?.percentiles?.p75 ?? null,
			ttfbMs: m.experimental_time_to_first_byte?.percentiles?.p75 ?? null,
		};
	}
}
