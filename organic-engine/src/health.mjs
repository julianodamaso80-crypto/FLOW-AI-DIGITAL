// Healthcheck do Engine. Mostra estado sem NUNCA revelar valor de segredo —
// só o nome da variável e se está presente.

import { CostLedger, BudgetGuard } from "./providers/base.mjs";
import { DataForSeoProvider } from "./providers/dataforseo.mjs";
import { SearchConsoleProvider, Ga4Provider, PageSpeedProvider, CruxProvider } from "./providers/google.mjs";
import { IndexNowProvider, CloudflareProvider, FirecrawlProvider, YouTubeProvider } from "./providers/misc.mjs";

export function buildProviders(env = process.env, ledger = new CostLedger()) {
	const budget = new BudgetGuard({
		monthlyBudgetUsd: Number(env.DATAFORSEO_MONTHLY_BUDGET_USD ?? 0),
		spentUsd: 0,
	});
	return {
		dataforseo: new DataForSeoProvider({ env, ledger, budget }),
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

/** `checkDb` e `checkQueue` são injetáveis para o health rodar sem Postgres. */
export async function healthReport({ env = process.env, checkDb, checkQueue } = {}) {
	const providers = buildProviders(env);
	const rows = Object.values(providers).map((p) => p.health());

	let db = { component: "postgres", status: "MISSING", detail: "DATABASE_URL ausente" };
	if (env.DATABASE_URL) {
		if (checkDb) {
			try {
				await checkDb();
				db = { component: "postgres", status: "OK" };
			} catch (err) {
				db = { component: "postgres", status: "FAIL", detail: err.message };
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
				queue = { component: "queue (pg-boss)", status: "OK" };
			} catch (err) {
				queue = { component: "queue (pg-boss)", status: "FAIL", detail: err.message };
			}
		} else {
			queue = { component: "queue (pg-boss)", status: "CONFIGURED", detail: "não testado nesta execução" };
		}
	}

	const publishing = {
		component: "github publishing",
		status: env.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY ? "CONFIGURED" : "MISSING",
		missing: ["GITHUB_APP_ID", "GITHUB_APP_PRIVATE_KEY"].filter((k) => !env[k]),
	};

	const autoPublish = String(env.AUTO_PUBLISH ?? "false").toLowerCase() === "true";
	const budgetUsd = Number(env.DATAFORSEO_MONTHLY_BUDGET_USD ?? 0);

	return {
		checkedAt: new Date().toISOString(),
		providers: rows,
		infrastructure: [db, queue, publishing],
		flags: {
			AUTO_PUBLISH: autoPublish,
			DATAFORSEO_MONTHLY_BUDGET_USD: budgetUsd || "não definido",
		},
		configuredCount: rows.filter((r) => r.status === "CONFIGURED").length,
		totalProviders: rows.length,
	};
}

export function formatHealth(report) {
	const lines = [];
	lines.push(`Organic Engine — healthcheck  ${report.checkedAt}`);
	lines.push("");
	lines.push("PROVIDERS");
	for (const p of report.providers) {
		const miss = p.missing.length ? `  (falta: ${p.missing.join(", ")})` : "";
		lines.push(`  ${p.provider.padEnd(24)} ${p.status}${miss}`);
	}
	lines.push("");
	lines.push("INFRAESTRUTURA");
	for (const i of report.infrastructure) {
		const extra = i.detail ? `  (${i.detail})` : i.missing?.length ? `  (falta: ${i.missing.join(", ")})` : "";
		lines.push(`  ${i.component.padEnd(24)} ${i.status}${extra}`);
	}
	lines.push("");
	lines.push("FLAGS");
	for (const [k, v] of Object.entries(report.flags)) {
		lines.push(`  ${k.padEnd(34)} ${v}`);
	}
	lines.push("");
	lines.push(`${report.configuredCount}/${report.totalProviders} providers configurados.`);
	return lines.join("\n");
}
