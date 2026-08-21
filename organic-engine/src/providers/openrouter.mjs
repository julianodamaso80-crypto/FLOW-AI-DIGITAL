// OpenRouter — geração e revisão de conteúdo.
//
// É o provider central do motor editorial: escreve o rascunho e roda as
// revisões. Modelo é configurável por variável; nada de modelo antigo
// cravado no código como única opção.
//
// Healthcheck usa GET /api/v1/key, que devolve limite e uso da chave sem
// consumir geração paga.

import { Provider, ProviderError, fetchWithTimeout, isPermanent, withRetry, parseRetryAfter } from "./base.mjs";

const BASE = "https://openrouter.ai/api/v1";

/** Padrões só entram se a variável não estiver definida. */
export const DEFAULT_WRITER_MODEL = "anthropic/claude-sonnet-4.5";
export const DEFAULT_REVIEW_MODEL = "anthropic/claude-sonnet-4.5";

export class OpenRouterProvider extends Provider {
	constructor(opts = {}) {
		super("openrouter", opts);
		this.fetchImpl = opts.fetchImpl ?? globalThis.fetch;
		this.timeoutMs = opts.timeoutMs ?? 120_000;
		this.retries = opts.retries ?? 3;
		this.sleep = opts.sleep;
		this.budget = opts.budget ?? null;
		this.referer = opts.referer ?? "https://flowaidigital.com.br";
		this.title = opts.title ?? "FlowAI Organic Growth Engine";
	}

	requiredEnv() {
		return ["OPENROUTER_API_KEY"];
	}

	get writerModel() {
		return this.env.OPENROUTER_WRITER_MODEL || DEFAULT_WRITER_MODEL;
	}
	get reviewModel() {
		return this.env.OPENROUTER_REVIEW_MODEL || DEFAULT_REVIEW_MODEL;
	}

	headers() {
		const key = this.env.OPENROUTER_API_KEY;
		if (!key) {
			throw new ProviderError("OPENROUTER_API_KEY ausente", {
				permanent: true,
				provider: this.name,
			});
		}
		return {
			"Content-Type": "application/json",
			Authorization: `Bearer ${key}`,
			"HTTP-Referer": this.referer,
			"X-Title": this.title,
		};
	}

	/** Gratuito: informa limite, uso e se a chave é válida. Não gera tokens. */
	async verify() {
		if (!this.configured) {
			return { verified: false, reason: "OPENROUTER_API_KEY ausente" };
		}
		try {
			const res = await fetchWithTimeout(
				`${BASE}/key`,
				{ headers: this.headers() },
				15_000,
				this.fetchImpl,
			);
			if (!res.ok) {
				return { verified: false, reason: `HTTP ${res.status} em /key` };
			}
			const body = await res.json();
			const d = body.data ?? {};
			return {
				verified: true,
				label: d.label ?? null,
				usage: d.usage ?? null,
				limit: d.limit ?? null,
				limitRemaining: d.limit_remaining ?? null,
				isFreeTier: d.is_free_tier ?? null,
				costUsd: 0,
			};
		} catch (err) {
			return { verified: false, reason: err.message };
		}
	}

	/**
	 * Chamada de chat. `maxTokens` é obrigatório na prática: sem teto, um
	 * modelo verborrágico transforma um artigo em conta alta.
	 */
	async complete({
		messages,
		model,
		maxTokens = 4000,
		temperature = 0.4,
		responseFormat = null,
		critical = false,
		articleId = null,
		estimatedCostUsd = 0.05,
	}) {
		if (!Array.isArray(messages) || messages.length === 0) {
			throw new ProviderError("messages vazio", { permanent: true, provider: this.name });
		}
		if (this.budget) {
			const verdict = this.budget.check(estimatedCostUsd, { critical });
			if (!verdict.allowed) {
				throw new ProviderError(`bloqueado pelo orçamento: ${verdict.reason}`, {
					permanent: true,
					provider: this.name,
					endpoint: "/chat/completions",
				});
			}
		}

		const payload = {
			model: model ?? this.writerModel,
			messages,
			max_tokens: maxTokens,
			temperature,
		};
		if (responseFormat) payload.response_format = responseFormat;

		const data = await withRetry(
			async () => {
				const res = await fetchWithTimeout(
					`${BASE}/chat/completions`,
					{ method: "POST", headers: this.headers(), body: JSON.stringify(payload) },
					this.timeoutMs,
					this.fetchImpl,
				);
				if (!res.ok) {
					const err = new ProviderError(`HTTP ${res.status} no OpenRouter`, {
						status: res.status,
						permanent: isPermanent(res.status),
						provider: this.name,
						endpoint: "/chat/completions",
					});
					const ra = parseRetryAfter(res.headers?.get?.("retry-after"));
					if (ra !== null) err.retryAfterMs = ra;
					throw err;
				}
				const body = await res.json();
				if (body.error) {
					throw new ProviderError(`OpenRouter: ${body.error.message ?? "erro"}`, {
						status: body.error.code,
						permanent: isPermanent(body.error.code),
						provider: this.name,
					});
				}
				return body;
			},
			{ retries: this.retries, sleep: this.sleep },
		);

		const content = data.choices?.[0]?.message?.content;
		if (typeof content !== "string" || content.trim() === "") {
			throw new ProviderError("resposta sem conteúdo utilizável", {
				permanent: false,
				provider: this.name,
			});
		}
		const finishReason = data.choices?.[0]?.finish_reason ?? null;
		// truncado por limite de tokens é falha silenciosa clássica
		if (finishReason === "length") {
			throw new ProviderError(
				`resposta truncada em max_tokens=${maxTokens} — aumente o teto ou reduza o escopo`,
				{ permanent: true, provider: this.name },
			);
		}

		const usage = data.usage ?? {};
		const realCost = Number(usage.cost ?? 0) || estimatedCostUsd;
		this.recordCost({
			endpoint: "/chat/completions",
			units: usage.total_tokens ?? 0,
			costUsd: realCost,
			articleId,
		});
		this.budget?.spend(realCost);

		return {
			content,
			model: data.model ?? payload.model,
			finishReason,
			promptTokens: usage.prompt_tokens ?? null,
			completionTokens: usage.completion_tokens ?? null,
			totalTokens: usage.total_tokens ?? null,
			costUsd: realCost,
		};
	}

	/** Conveniência para respostas estruturadas, com validação de JSON. */
	async completeJson(opts) {
		const out = await this.complete({
			...opts,
			responseFormat: { type: "json_object" },
		});
		try {
			return { ...out, json: JSON.parse(out.content) };
		} catch {
			throw new ProviderError("modelo devolveu JSON inválido", {
				permanent: false,
				provider: this.name,
			});
		}
	}
}
