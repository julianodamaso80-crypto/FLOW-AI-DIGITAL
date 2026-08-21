// Healthcheck do Engine.
//
// Estados possíveis:
//   MISSING               falta variável de ambiente
//   CONFIGURED            variáveis presentes, não testadas
//   CONFIGURED_UNVERIFIED variáveis presentes, mas verificar custaria dinheiro
//   VERIFIED              chamada gratuita confirmou que a credencial funciona
//   FAILED                credencial presente mas rejeitada pela API
//
// Presença de variável nunca é tratada como prova de funcionamento.
// Nenhum valor de segredo aparece na saída.

import { CostLedger, BudgetGuard } from "./providers/base.mjs";
import { DataForSeoProvider } from "./providers/dataforseo.mjs";
import { OpenRouterProvider } from "./providers/openrouter.mjs";
import { SearchConsoleProvider, Ga4Provider, PageSpeedProvider, CruxProvider } from "./providers/google.mjs";
import { IndexNowProvider, CloudflareProvider, FirecrawlProvider, YouTubeProvider } from "./providers/misc.mjs";

/** Providers cuja verificação exigiria consumo pago — não testamos à toa. */
const COSTLY_TO_VERIFY = new Set(["firecrawl", "pagespeed", "crux", "youtube", "google-search-console", "google-analytics", "cloudflare", "indexnow"]);

export function buildProviders(env = process.env, ledger = new CostLedger()) {
	const budget = new BudgetGuard({
		monthlyBudgetUsd: Number(env.DATAFORSEO_MONTHLY_BUDGET_USD ?? 0),
		spentUsd: 0,
	});
	return {
		dataforseo: new DataForSeoProvider({ env, ledger, budget }),
		openrouter: new OpenRouterProvider({ env, ledger }),
		"google-search-console": new SearchConsoleProvider({ env, ledger }),
		"google-analytics": new Ga4Provider({ env, ledger }),
		pagespeed: new PageSpeedProvider({ env, ledger }),
		crux: new CruxProvider({ env, ledger }),
		indexnow: new IndexNowProvider({ env, ledger }),
		cloudflare: new CloudflareProvider({ env, ledger }),
		firecrawl: new FirecrawlProvider({ env, ledger }),
		youtube: new YouTubeProvider({ env, ledger }),
	};
}

/**
 * `verify: true` roda as verificações GRATUITAS (DataForSEO e OpenRouter).
 * Providers cuja verificação custaria ficam em CONFIGURED_UNVERIFIED.
 */
export async function healthReport({ env = process.env, checkDb, checkQueue, verify = false } = {}) {
	const providers = buildProviders(env);
	const rows = [];

	for (const [name, p] of Object.entries(providers)) {
		const base = p.health(); // { provider, status: CONFIGURED|MISSING, missing }
		if (base.status === "MISSING") {
			rows.push({ ...base, detail: null });
			continue;
		}
		if (!verify) {
			rows.push({ ...base, detail: null });
			continue;
		}
		if (COSTLY_TO_VERIFY.has(name) || typeof p.verify !== "function") {
			rows.push({
				...base,
				status: "CONFIGURED_UNVERIFIED",
				detail: "verificação exigiria consumo pago ou credencial de escrita",
			});
			continue;
		}
		const v = await p.verify();
		rows.push({
			...base,
			status: v.verified ? "VERIFIED" : "FAILED",
			detail: scrubSecrets(v.verified ? summarize(name, v) : v.reason),
			// a verificação crua não é devolvida: pode conter label com prefixo de chave
			verification: { verified: v.verified },
		});
	}

	let db = { component: "postgres", status: "MISSING", detail: "DATABASE_URL ausente" };
	if (env.DATABASE_URL) {
		if (checkDb) {
			try {
				await checkDb();
				db = { component: "postgres", status: "VERIFIED" };
			} catch (err) {
				db = { component: "postgres", status: "FAILED", detail: err.message };
			}
		} else {
			db = { component: "postgres", status: "CONFIGURED", detail: "não testado nesta execução" };
		}
	}

	let queue = { component: "queue (pg-boss)", status: "MISSING", detail: "depende de DATABASE_URL" };
	if (env.DATABASE_URL) {
		if (checkQueue) {
			try {
				await checkQueue();
				queue = { component: "queue (pg-boss)", status: "VERIFIED" };
			} catch (err) {
				queue = { component: "queue (pg-boss)", status: "FAILED", detail: err.message };
			}
		} else {
			queue = { component: "queue (pg-boss)", status: "CONFIGURED", detail: "não testado nesta execução" };
		}
	}

	// Publicação via GitHub App é fase posterior — não é bloqueador desta rodada.
	const publishing = {
		component: "github publishing",
		status: env.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY ? "CONFIGURED" : "FUTURE_REQUIRED",
		detail: "publicação versionada entra depois do preview no Pages",
	};

	const autoPublish = String(env.AUTO_PUBLISH ?? "false").toLowerCase() === "true";
	const budgetUsd = Number(env.DATAFORSEO_MONTHLY_BUDGET_USD ?? 0);

	const usable = rows.filter((r) => r.status !== "MISSING").length;

	return {
		checkedAt: new Date().toISOString(),
		verified: verify,
		providers: rows,
		infrastructure: [db, queue, publishing],
		flags: {
			AUTO_PUBLISH: autoPublish,
			DATAFORSEO_MONTHLY_BUDGET_USD: budgetUsd || "não definido",
		},
		usableCount: usable,
		totalProviders: rows.length,
	};
}

/**
 * Alguns provedores devolvem, em campos "informativos", pedaços da própria
 * credencial. O `label` da chave do OpenRouter, por exemplo, costuma conter o
 * prefixo `sk-or-v1-...`. Nada que venha da API entra na saída sem passar por
 * aqui.
 */
export function scrubSecrets(text) {
	return String(text ?? "")
		.replace(/sk-or-v1-[A-Za-z0-9._-]+/g, "[chave omitida]")
		.replace(/sk-[A-Za-z0-9._-]{16,}/g, "[chave omitida]")
		.replace(/\b[A-Za-z0-9._-]{8,}@[A-Za-z0-9.-]+\.[a-z]{2,}\b/g, "[e-mail omitido]")
		.replace(/\bBearer\s+[A-Za-z0-9._-]+/gi, "Bearer [omitido]");
}

/** Números que chegam como objeto (`{minute: 2000}`) viram texto legível. */
function num(v) {
	if (v === null || v === undefined) return null;
	if (typeof v === "number") return v;
	if (typeof v === "object") {
		const first = Object.values(v).find((x) => typeof x === "number");
		return first ?? null;
	}
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

function summarize(name, v) {
	if (name === "dataforseo") {
		const parts = [`conta ${v.loginMasked}`];
		const bal = num(v.balanceUsd);
		if (bal !== null) parts.push(`saldo US$ ${bal.toFixed(2)}`);
		const rate = num(v.rateLimitPerMinute);
		if (rate !== null) parts.push(`${rate} req/min`);
		return scrubSecrets(parts.join(", "));
	}
	if (name === "openrouter") {
		// O `label` da chave NÃO é exibido: ele carrega prefixo da credencial.
		const parts = ["chave válida"];
		const usage = num(v.usage);
		if (usage !== null) parts.push(`uso acumulado US$ ${usage.toFixed(4)}`);
		const rem = num(v.limitRemaining);
		if (rem !== null) parts.push(`restante US$ ${rem.toFixed(2)}`);
		else if (v.limit === null) parts.push("sem limite fixo na chave");
		return scrubSecrets(parts.join(", "));
	}
	return "verificada";
}

export function formatHealth(report) {
	const lines = [];
	lines.push(`Organic Engine — healthcheck  ${report.checkedAt}`);
	lines.push(report.verified ? "(com verificação gratuita das credenciais)" : "(sem verificação — use --verify)");
	lines.push("");
	lines.push("PROVIDERS");
	for (const p of report.providers) {
		const extra = p.detail
			? `  ${p.detail}`
			: p.missing?.length
				? `  (falta: ${p.missing.join(", ")})`
				: "";
		lines.push(`  ${p.provider.padEnd(24)} ${p.status.padEnd(22)}${extra}`);
	}
	lines.push("");
	lines.push("INFRAESTRUTURA");
	for (const i of report.infrastructure) {
		const extra = i.detail ? `  ${i.detail}` : "";
		lines.push(`  ${i.component.padEnd(24)} ${i.status.padEnd(22)}${extra}`);
	}
	lines.push("");
	lines.push("FLAGS");
	for (const [k, v] of Object.entries(report.flags)) {
		lines.push(`  ${k.padEnd(34)} ${v}`);
	}
	lines.push("");
	lines.push(`${report.usableCount}/${report.totalProviders} providers com credencial presente.`);
	return lines.join("\n");
}
