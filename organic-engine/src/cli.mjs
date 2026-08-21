#!/usr/bin/env node
// CLI do Organic Engine.
//
//   node src/cli.mjs health          estado dos providers e da infraestrutura
//   node src/cli.mjs crawlers [url]  matriz de acesso dos crawlers
//   node src/cli.mjs gates <file>    roda hard gates + score num artigo .md
//   node src/cli.mjs costs           gasto por provider no mês

import fs from "node:fs";
import path from "node:path";
import { loadEnv, formatEnvReport } from "./env.mjs";
import { healthReport, formatHealth } from "./health.mjs";
import { checkAllCrawlers, formatMatrix } from "./crawler/ai-access.mjs";
import { runGates } from "./gates/index.mjs";
import { scoreArticle, weakestDimensions, decide } from "./gates/quality-score.mjs";

// Carrega .env do Engine e o compartilhado da raiz. process.env sempre vence.
const envReport = loadEnv();

const [, , cmd, ...args] = process.argv;
const hasFlag = (f) => args.includes(f);

async function main() {
	switch (cmd) {
		case "health": {
			if (hasFlag("--env")) {
				console.log(formatEnvReport(envReport));
				console.log("");
			}
			// --verify roda apenas as checagens GRATUITAS
			const report = await healthReport({ verify: hasFlag("--verify") });
			console.log(formatHealth(report));
			break;
		}

		case "env": {
			console.log(formatEnvReport(envReport));
			break;
		}

		case "crawlers": {
			const url = args[0] ?? "https://flowaidigital.com.br/";
			console.log(`Verificando acesso dos crawlers em ${url}\n`);
			const report = await checkAllCrawlers(url);
			console.log(formatMatrix(report));
			console.log("");
			if (report.passed) {
				console.log("Todos os crawlers se comportaram como esperado.");
			} else {
				console.log(`${report.failures.length} divergência(s) em relação à política:`);
				for (const f of report.failures) console.log(`  - ${f.crawler}: ${f.reason}`);
				process.exitCode = 1;
			}
			break;
		}

		case "gates": {
			const file = args[0];
			if (!file) {
				console.error("uso: node src/cli.mjs gates <caminho-do-artigo.md>");
				process.exitCode = 2;
				return;
			}
			const { parseFrontMatter } = await import("../../site/lib/content.mjs");
			const raw = fs.readFileSync(path.resolve(file), "utf8");
			const { data, body } = parseFrontMatter(raw);
			const article = { ...data, body };

			const routes = loadKnownRoutes();
			const gates = runGates(article, { knownRoutes: routes, corpus: [] });

			console.log(`Artigo: ${article.slug ?? path.basename(file)}\n`);
			console.log("HARD GATES");
			for (const r of gates.results) {
				console.log(`  ${r.passed ? "passou " : "FALHOU "} ${r.id.padEnd(18)} ${r.reason ?? ""}`);
			}
			console.log("");

			if (!gates.passed) {
				console.log(`Bloqueado: ${gates.summary}. O score só é calculado com todos os gates verdes.`);
				process.exitCode = 1;
				return;
			}

			const scored = scoreArticle(article);
			console.log("QUALITY SCORE");
			for (const d of scored.breakdown) {
				console.log(`  ${d.label.padEnd(24)} ${String(d.points).padStart(5)} / ${d.weight}`);
			}
			console.log(`  ${"TOTAL".padEnd(24)} ${String(scored.total).padStart(5)} / 100`);
			console.log("");
			const decision = decide(scored.total, Number(article.reworkCount ?? 0));
			console.log(`Decisão: ${decision}`);
			if (decision !== "PUBLISH") {
				console.log("Retrabalhar primeiro:");
				for (const w of weakestDimensions(scored, 3)) {
					console.log(`  - ${w.label} (perdeu ${w.lost} de ${w.weight})`);
				}
			}
			break;
		}

		case "baseline-keywords": {
			const { runBaseline } = await import("./commands/baseline-keywords.mjs");
			const { MONEY_PAGE_TARGETS } = await import("./commands/money-page-targets.mjs");
			const capArg = args.find((a) => a.startsWith("--max-cost-usd="));
			const maxCostUsd = capArg ? Number(capArg.split("=")[1]) : 1.0;
			const dryRun = hasFlag("--dry-run");

			const out = await runBaseline({ targets: MONEY_PAGE_TARGETS, maxCostUsd, dryRun });
			if (out.aborted || out.dryRun) break;

			console.log("");
			for (const r of out.results) {
				console.log(r.target);
				console.log(
					`  volume: ${r.targetVolume ?? "n/d"} | intenção: ${r.targetIntent ?? "n/d"} | ação: ${r.action}`,
				);
				for (const a of r.alternatives) {
					console.log(`    alternativa "${a.keyword}": ${a.volume ?? "n/d"}`);
				}
				for (const n of r.notes) console.log(`    nota: ${n}`);
			}
			console.log("");
			console.log(`custo total desta execução: US$ ${out.spentUsd.toFixed(4)}`);
			break;
		}

		case "costs": {
			console.log("Custos vivem em provider_costs no Postgres.");
			console.log("Sem DATABASE_URL configurada não há o que somar — rode 'health' para conferir.");
			break;
		}

		default:
			console.log(`Organic Engine — FlowAI Digital

  health [--verify] estado dos providers (--verify usa checagens gratuitas)
  env               quais .env foram lidos e que variaveis vieram deles
  crawlers [url]    matriz de acesso dos crawlers de busca e de IA
  gates <file.md>   hard gates + quality score de um artigo
  baseline-keywords [--max-cost-usd=1.00] [--dry-run]
                    valida as keywords-alvo das money pages no DataForSEO
  costs             gasto por provider no mês
`);
	}
}

/** Rotas publicadas — base do gate de link interno. */
function loadKnownRoutes() {
	try {
		const dist = path.resolve(process.cwd(), "..", "site", "dist", "sitemap.xml");
		const xml = fs.readFileSync(dist, "utf8");
		return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
			m[1].replace(/^https?:\/\/[^/]+/, ""),
		);
	} catch {
		return [];
	}
}

main().catch((err) => {
	console.error(`erro: ${err.message}`);
	process.exitCode = 1;
});
