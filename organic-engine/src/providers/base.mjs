// Base comum a todos os providers: timeout, retry com backoff, respeito a
// Retry-After, registro de custo e healthcheck — sem jamais expor segredo.

export class ProviderError extends Error {
	constructor(message, { status, permanent = false, provider, endpoint } = {}) {
		super(message);
		this.name = "ProviderError";
		this.status = status;
		this.permanent = permanent;
		this.provider = provider;
		this.endpoint = endpoint;
	}
}

/**
 * 4xx (exceto 408/429) é permanente: repetir não muda o resultado e só gasta.
 * 429 e 5xx são transitórios.
 */
export function isPermanent(status) {
	if (status === undefined || status === null) return false;
	if (status === 408 || status === 429) return false;
	return status >= 400 && status < 500;
}

export function backoffDelay(attempt, { baseMs = 500, maxMs = 30_000, jitter = () => Math.random() } = {}) {
	const exp = Math.min(baseMs * 2 ** (attempt - 1), maxMs);
	// jitter total evita rajada sincronizada quando vários jobs falham juntos
	return Math.round(exp * (0.5 + jitter() * 0.5));
}

/** Retry-After em segundos ou data HTTP. Devolve ms, ou null. */
export function parseRetryAfter(value, now = Date.now()) {
	if (!value) return null;
	const secs = Number(value);
	if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
	const when = Date.parse(value);
	if (Number.isFinite(when)) return Math.max(0, when - now);
	return null;
}

/**
 * Executa `fn` com retry controlado.
 * `fn` recebe {attempt} e deve lançar ProviderError em falha.
 */
export async function withRetry(fn, {
	retries = 3,
	baseMs = 500,
	maxMs = 30_000,
	sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
	jitter = () => Math.random(),
	onRetry = () => {},
} = {}) {
	let lastErr;
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			return await fn({ attempt });
		} catch (err) {
			lastErr = err;
			const permanent = err instanceof ProviderError ? err.permanent : false;
			if (permanent || attempt === retries) break;
			const wait = err?.retryAfterMs ?? backoffDelay(attempt, { baseMs, maxMs, jitter });
			onRetry({ attempt, waitMs: wait, error: err });
			await sleep(wait);
		}
	}
	throw lastErr;
}

/** fetch com timeout via AbortController. */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 20_000, fetchImpl = globalThis.fetch) {
	const ctrl = new AbortController();
	const t = setTimeout(() => ctrl.abort(), timeoutMs);
	try {
		return await fetchImpl(url, { ...options, signal: ctrl.signal });
	} finally {
		clearTimeout(t);
	}
}

/**
 * Registro de custo em memória, drenado para provider_costs.
 * Mantido separado do banco para o provider ser testável sem Postgres.
 */
export class CostLedger {
	constructor() {
		this.entries = [];
	}
	record({ provider, endpoint, units = 1, costUsd = 0, articleId = null, jobRunId = null }) {
		this.entries.push({
			provider,
			endpoint,
			units,
			costUsd: Number(costUsd) || 0,
			articleId,
			jobRunId,
			occurredAt: new Date(),
		});
	}
	total(provider) {
		return this.entries
			.filter((e) => !provider || e.provider === provider)
			.reduce((s, e) => s + e.costUsd, 0);
	}
	drain() {
		const out = this.entries;
		this.entries = [];
		return out;
	}
}

/**
 * Guarda de orçamento mensal. Estoura ANTES da chamada, nunca em silêncio.
 * `spentUsd` vem de uma soma em provider_costs no mês corrente.
 */
export class BudgetGuard {
	constructor({ monthlyBudgetUsd, spentUsd = 0, warnRatio = 0.8 }) {
		this.monthlyBudgetUsd = Number(monthlyBudgetUsd) || 0;
		this.spentUsd = Number(spentUsd) || 0;
		this.warnRatio = warnRatio;
	}
	get remaining() {
		return Math.max(0, this.monthlyBudgetUsd - this.spentUsd);
	}
	get ratio() {
		if (!this.monthlyBudgetUsd) return 0;
		return this.spentUsd / this.monthlyBudgetUsd;
	}
	/** Perto do teto: só o que for crítico continua. */
	get shouldThrottle() {
		return this.monthlyBudgetUsd > 0 && this.ratio >= this.warnRatio;
	}
	check(estimatedUsd, { critical = false } = {}) {
		if (!this.monthlyBudgetUsd) return { allowed: true, reason: "sem orçamento definido" };
		if (this.spentUsd + estimatedUsd > this.monthlyBudgetUsd) {
			return {
				allowed: false,
				reason: `estouraria o orçamento mensal (gasto ${this.spentUsd.toFixed(4)} + ${estimatedUsd.toFixed(4)} > ${this.monthlyBudgetUsd})`,
			};
		}
		if (this.shouldThrottle && !critical) {
			return {
				allowed: false,
				reason: `orçamento em ${(this.ratio * 100).toFixed(0)}% — só jobs críticos`,
			};
		}
		return { allowed: true };
	}
	spend(usd) {
		this.spentUsd += Number(usd) || 0;
	}
}

/** Contrato que todo provider implementa. */
export class Provider {
	constructor(name, { env = process.env, ledger = null } = {}) {
		this.name = name;
		this.env = env;
		this.ledger = ledger;
	}
	/** Nomes das variáveis exigidas. Sobrescrito por cada provider. */
	requiredEnv() {
		return [];
	}
	get configured() {
		return this.requiredEnv().every((k) => Boolean(this.env[k]));
	}
	/** Status sem NUNCA revelar valor de segredo. */
	health() {
		const missing = this.requiredEnv().filter((k) => !this.env[k]);
		return {
			provider: this.name,
			status: missing.length === 0 ? "CONFIGURED" : "MISSING",
			missing, // só nomes
		};
	}
	recordCost(entry) {
		this.ledger?.record({ provider: this.name, ...entry });
	}
}
