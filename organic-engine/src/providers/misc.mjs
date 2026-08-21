// IndexNow, Cloudflare, Firecrawl e YouTube.

import { Provider, ProviderError, fetchWithTimeout, isPermanent, withRetry } from "./base.mjs";

// ── IndexNow ────────────────────────────────────────────────────────────
// Notifica Bing e parceiros. NÃO substitui o Google, que descobre por sitemap
// e crawl. Só enviamos quando a URL foi criada, atualizada ou removida —
// reenviar sem mudança é ruído e pode ser penalizado.
export class IndexNowProvider extends Provider {
	constructor(opts = {}) {
		super("indexnow", opts);
		this.fetchImpl = opts.fetchImpl ?? globalThis.fetch;
		this.timeoutMs = opts.timeoutMs ?? 15_000;
		this.retries = opts.retries ?? 2;
		this.sleep = opts.sleep;
		this.host = opts.host ?? "flowaidigital.com.br";
		this.endpoint = opts.endpoint ?? "https://api.indexnow.org/indexnow";
	}
	requiredEnv() {
		return ["INDEXNOW_KEY"];
	}

	/** Conteúdo do arquivo de verificação, servido em /{key}.txt. */
	keyFile() {
		const key = this.env.INDEXNOW_KEY;
		if (!key) return null;
		return { path: `/${key}.txt`, content: key };
	}

	/**
	 * `changed` guarda o hash anterior de cada URL. Se não mudou, não envia —
	 * é a garantia de idempotência exigida no requisito 49.
	 */
	filterChanged(urls, previousHashes = new Map()) {
		return urls.filter((u) => {
			const prev = previousHashes.get(u.url);
			return prev !== u.hash;
		});
	}

	async submit(urls) {
		const key = this.env.INDEXNOW_KEY;
		if (!key) {
			throw new ProviderError("INDEXNOW_KEY ausente", { permanent: true, provider: this.name });
		}
		if (!urls.length) return { skipped: true, reason: "nenhuma URL mudou", status: null };

		const body = {
			host: this.host,
			key,
			keyLocation: `https://${this.host}/${key}.txt`,
			urlList: urls.slice(0, 10000),
		};

		const status = await withRetry(
			async () => {
				const res = await fetchWithTimeout(
					this.endpoint,
					{ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
					this.timeoutMs,
					this.fetchImpl,
				);
				if (!res.ok && res.status !== 202) {
					throw new ProviderError(`HTTP ${res.status} no IndexNow`, {
						status: res.status,
						permanent: isPermanent(res.status),
						provider: this.name,
					});
				}
				return res.status;
			},
			{ retries: this.retries, sleep: this.sleep },
		);

		this.recordCost({ endpoint: "indexnow/submit", units: urls.length, costUsd: 0 });
		return { skipped: false, status, submitted: urls.length };
	}
}

// ── Cloudflare ──────────────────────────────────────────────────────────
// Token de escopo mínimo (Zone.Zone:Read, Zone.WAF:Edit). Nunca Global API Key.
// Regra do requisito 14: LER as regras atuais antes de escrever qualquer coisa.
export class CloudflareProvider extends Provider {
	constructor(opts = {}) {
		super("cloudflare", opts);
		this.fetchImpl = opts.fetchImpl ?? globalThis.fetch;
		this.timeoutMs = opts.timeoutMs ?? 20_000;
		this.retries = opts.retries ?? 2;
		this.sleep = opts.sleep;
		this.base = opts.base ?? "https://api.cloudflare.com/client/v4";
	}
	requiredEnv() {
		return ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID"];
	}

	async call(path, options = {}) {
		const token = this.env.CLOUDFLARE_API_TOKEN;
		if (!token) {
			throw new ProviderError("CLOUDFLARE_API_TOKEN ausente", {
				permanent: true,
				provider: this.name,
			});
		}
		return withRetry(
			async () => {
				const res = await fetchWithTimeout(
					`${this.base}${path}`,
					{
						...options,
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${token}`,
							...(options.headers ?? {}),
						},
					},
					this.timeoutMs,
					this.fetchImpl,
				);
				const data = await res.json().catch(() => ({}));
				if (!res.ok || data.success === false) {
					const msg = data.errors?.map((e) => e.message).join("; ") || `HTTP ${res.status}`;
					throw new ProviderError(`Cloudflare: ${msg}`, {
						status: res.status,
						permanent: isPermanent(res.status),
						provider: this.name,
					});
				}
				return data.result;
			},
			{ retries: this.retries, sleep: this.sleep },
		);
	}

	get zone() {
		return this.env.CLOUDFLARE_ZONE_ID;
	}

	/** Só leitura — é o primeiro passo obrigatório antes de qualquer ajuste. */
	async readCurrentConfig() {
		const [rulesets, botSettings] = await Promise.allSettled([
			this.call(`/zones/${this.zone}/rulesets`),
			this.call(`/zones/${this.zone}/bot_management`),
		]);
		return {
			rulesets: rulesets.status === "fulfilled" ? rulesets.value : null,
			botManagement: botSettings.status === "fulfilled" ? botSettings.value : null,
			rulesetsError: rulesets.status === "rejected" ? rulesets.reason?.message : null,
			botError: botSettings.status === "rejected" ? botSettings.reason?.message : null,
		};
	}

	/** Regras de firewall/WAF da zona, para achar quem devolve 403. */
	async listWafRules() {
		const rulesets = await this.call(`/zones/${this.zone}/rulesets`);
		const custom = (rulesets ?? []).filter(
			(r) => r.phase === "http_request_firewall_custom" || r.phase === "http_request_firewall_managed",
		);
		const out = [];
		for (const rs of custom) {
			const full = await this.call(`/zones/${this.zone}/rulesets/${rs.id}`);
			out.push({
				id: rs.id,
				name: rs.name,
				phase: rs.phase,
				rules: (full?.rules ?? []).map((r) => ({
					id: r.id,
					action: r.action,
					expression: r.expression,
					description: r.description,
					enabled: r.enabled !== false,
				})),
			});
		}
		return out;
	}
}

// ── Firecrawl ───────────────────────────────────────────────────────────
// Ferramenta de pesquisa e captura de fonte. Não substitui Search Console
// nem DataForSEO — usar só quando ajuda a extrair conteúdo de referência.
export class FirecrawlProvider extends Provider {
	constructor(opts = {}) {
		super("firecrawl", opts);
		this.fetchImpl = opts.fetchImpl ?? globalThis.fetch;
		this.timeoutMs = opts.timeoutMs ?? 60_000;
		this.retries = opts.retries ?? 2;
		this.sleep = opts.sleep;
		this.base = opts.base ?? "https://api.firecrawl.dev/v1";
	}
	requiredEnv() {
		return ["FIRECRAWL_API_KEY"];
	}

	async scrape(url, { formats = ["markdown"] } = {}) {
		const key = this.env.FIRECRAWL_API_KEY;
		if (!key) {
			throw new ProviderError("FIRECRAWL_API_KEY ausente", { permanent: true, provider: this.name });
		}
		const data = await withRetry(
			async () => {
				const res = await fetchWithTimeout(
					`${this.base}/scrape`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
						body: JSON.stringify({ url, formats }),
					},
					this.timeoutMs,
					this.fetchImpl,
				);
				if (!res.ok) {
					throw new ProviderError(`HTTP ${res.status} no Firecrawl`, {
						status: res.status,
						permanent: isPermanent(res.status),
						provider: this.name,
					});
				}
				return res.json();
			},
			{ retries: this.retries, sleep: this.sleep },
		);
		this.recordCost({ endpoint: "firecrawl/scrape", units: 1, costUsd: 0 });
		const d = data.data ?? {};
		return {
			url,
			markdown: d.markdown ?? null,
			title: d.metadata?.title ?? null,
			publishedAt: d.metadata?.publishedTime ?? null,
			sourceUrl: d.metadata?.sourceURL ?? url,
		};
	}
}

// ── YouTube ─────────────────────────────────────────────────────────────
// Só LEITURA nesta fase. Upload exige OAuth e não será feito agora.
export class YouTubeProvider extends Provider {
	constructor(opts = {}) {
		super("youtube", opts);
		this.fetchImpl = opts.fetchImpl ?? globalThis.fetch;
		this.timeoutMs = opts.timeoutMs ?? 20_000;
		this.retries = opts.retries ?? 2;
		this.sleep = opts.sleep;
	}
	requiredEnv() {
		return ["YOUTUBE_API_KEY"];
	}
	/** Nomes exigidos para upload — documentados, não usados nesta fase. */
	uploadEnv() {
		return ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"];
	}

	async call(path, params) {
		const key = this.env.YOUTUBE_API_KEY;
		if (!key) {
			throw new ProviderError("YOUTUBE_API_KEY ausente", { permanent: true, provider: this.name });
		}
		const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
		for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
		url.searchParams.set("key", key);

		return withRetry(
			async () => {
				const res = await fetchWithTimeout(url.toString(), {}, this.timeoutMs, this.fetchImpl);
				if (!res.ok) {
					throw new ProviderError(`HTTP ${res.status} no YouTube`, {
						status: res.status,
						permanent: isPermanent(res.status),
						provider: this.name,
					});
				}
				return res.json();
			},
			{ retries: this.retries, sleep: this.sleep },
		);
	}

	/** Avalia se um tema tem demanda também em vídeo. */
	async search(query, { maxResults = 25 } = {}) {
		const data = await this.call("search", {
			part: "snippet",
			q: query,
			type: "video",
			maxResults,
			relevanceLanguage: "pt",
			regionCode: "BR",
		});
		return (data.items ?? []).map((i) => ({
			videoId: i.id?.videoId,
			title: i.snippet?.title,
			channelTitle: i.snippet?.channelTitle,
			publishedAt: i.snippet?.publishedAt,
		}));
	}

	async videoStats(ids) {
		const data = await this.call("videos", { part: "statistics,snippet", id: ids.join(",") });
		return (data.items ?? []).map((i) => ({
			videoId: i.id,
			title: i.snippet?.title,
			views: Number(i.statistics?.viewCount ?? 0),
			likes: Number(i.statistics?.likeCount ?? 0),
			comments: Number(i.statistics?.commentCount ?? 0),
		}));
	}
}
