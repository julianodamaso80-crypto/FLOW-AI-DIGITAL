import test from "node:test";
import assert from "node:assert/strict";

import {
	ProviderError,
	isPermanent,
	backoffDelay,
	parseRetryAfter,
	withRetry,
	CostLedger,
	BudgetGuard,
	Provider,
} from "../src/providers/base.mjs";
import {
	DataForSeoProvider,
	ENDPOINT_COST,
	estimateEndpointCost,
	mapIntent,
} from "../src/providers/dataforseo.mjs";
import { IndexNowProvider } from "../src/providers/misc.mjs";
import { SearchConsoleProvider, Ga4Provider } from "../src/providers/google.mjs";
import { healthReport } from "../src/health.mjs";
import {
	inspectHtml,
	evaluate,
	checkAllCrawlers,
	checkRobotsTokens,
	CRAWLERS,
	ROBOTS_ONLY_TOKENS,
} from "../src/crawler/ai-access.mjs";

const noSleep = async () => {};

// ─────────────────────────── retry / backoff ────────────────────────────

test("4xx é permanente, exceto 408 e 429", () => {
	assert.equal(isPermanent(400), true);
	assert.equal(isPermanent(404), true);
	assert.equal(isPermanent(408), false);
	assert.equal(isPermanent(429), false);
	assert.equal(isPermanent(500), false);
	assert.equal(isPermanent(503), false);
});

test("backoff cresce exponencialmente e respeita o teto", () => {
	const j = () => 1; // jitter máximo, determinístico
	assert.equal(backoffDelay(1, { baseMs: 100, jitter: j }), 100);
	assert.equal(backoffDelay(2, { baseMs: 100, jitter: j }), 200);
	assert.equal(backoffDelay(3, { baseMs: 100, jitter: j }), 400);
	assert.equal(backoffDelay(20, { baseMs: 100, maxMs: 5000, jitter: j }), 5000);
});

test("jitter mantém o atraso entre 50% e 100% do exponencial", () => {
	const alto = backoffDelay(3, { baseMs: 100, jitter: () => 1 });
	const baixo = backoffDelay(3, { baseMs: 100, jitter: () => 0 });
	assert.equal(alto, 400);
	assert.equal(baixo, 200);
});

test("parseRetryAfter aceita segundos e data HTTP", () => {
	assert.equal(parseRetryAfter("120"), 120_000);
	const agora = Date.now();
	const futuro = new Date(agora + 5000).toUTCString();
	const ms = parseRetryAfter(futuro, agora);
	assert.ok(ms >= 4000 && ms <= 6000, `veio ${ms}`);
	assert.equal(parseRetryAfter(null), null);
});

test("withRetry NÃO repete erro permanente", async () => {
	let calls = 0;
	await assert.rejects(
		withRetry(
			async () => {
				calls++;
				throw new ProviderError("400", { status: 400, permanent: true });
			},
			{ retries: 5, sleep: noSleep },
		),
	);
	assert.equal(calls, 1, "erro permanente foi repetido");
});

test("withRetry repete erro transitório e devolve o sucesso", async () => {
	let calls = 0;
	const out = await withRetry(
		async () => {
			calls++;
			if (calls < 3) throw new ProviderError("503", { status: 503 });
			return "ok";
		},
		{ retries: 5, sleep: noSleep },
	);
	assert.equal(out, "ok");
	assert.equal(calls, 3);
});

test("withRetry desiste após o limite", async () => {
	let calls = 0;
	await assert.rejects(
		withRetry(
			async () => {
				calls++;
				throw new ProviderError("503", { status: 503 });
			},
			{ retries: 3, sleep: noSleep },
		),
	);
	assert.equal(calls, 3);
});

test("withRetry respeita Retry-After no lugar do backoff", async () => {
	const esperas = [];
	let calls = 0;
	await withRetry(
		async () => {
			calls++;
			if (calls === 1) {
				const e = new ProviderError("429", { status: 429 });
				e.retryAfterMs = 7777;
				throw e;
			}
			return "ok";
		},
		{ retries: 3, sleep: async (ms) => esperas.push(ms) },
	);
	assert.deepEqual(esperas, [7777]);
});

// ─────────────────────────── custo e orçamento ──────────────────────────

test("CostLedger soma por provider", () => {
	const l = new CostLedger();
	l.record({ provider: "dataforseo", endpoint: "a", costUsd: 0.01 });
	l.record({ provider: "dataforseo", endpoint: "b", costUsd: 0.02 });
	l.record({ provider: "firecrawl", endpoint: "c", costUsd: 0.5 });
	assert.equal(Number(l.total("dataforseo").toFixed(4)), 0.03);
	assert.equal(Number(l.total().toFixed(4)), 0.53);
	assert.equal(l.drain().length, 3);
	assert.equal(l.entries.length, 0);
});

test("BudgetGuard bloqueia o que estouraria o teto", () => {
	const b = new BudgetGuard({ monthlyBudgetUsd: 10, spentUsd: 9.5 });
	assert.equal(b.check(1).allowed, false);
	assert.equal(b.check(0.1, { critical: true }).allowed, true);
});

test("BudgetGuard estrangula jobs não críticos perto do teto", () => {
	const b = new BudgetGuard({ monthlyBudgetUsd: 100, spentUsd: 85 });
	assert.equal(b.shouldThrottle, true);
	assert.equal(b.check(1).allowed, false, "não crítico deveria ser barrado");
	assert.equal(b.check(1, { critical: true }).allowed, true);
});

test("BudgetGuard sem teto definido permite tudo", () => {
	const b = new BudgetGuard({ monthlyBudgetUsd: 0 });
	assert.equal(b.check(999).allowed, true);
});

test("BudgetGuard nunca reporta restante negativo", () => {
	const b = new BudgetGuard({ monthlyBudgetUsd: 10, spentUsd: 25 });
	assert.equal(b.remaining, 0);
});

// ─────────────────────────── contrato do Provider ───────────────────────

test("health não expõe valor de segredo, só o nome", () => {
	class Fake extends Provider {
		requiredEnv() {
			return ["SEGREDO_A", "SEGREDO_B"];
		}
	}
	const p = new Fake("fake", { env: { SEGREDO_A: "valor-super-secreto" } });
	const h = p.health();
	assert.equal(h.status, "MISSING");
	assert.deepEqual(h.missing, ["SEGREDO_B"]);
	assert.ok(!JSON.stringify(h).includes("valor-super-secreto"), "o valor do segredo vazou");
});

test("provider com todas as variáveis fica CONFIGURED", () => {
	class Fake extends Provider {
		requiredEnv() {
			return ["A"];
		}
	}
	assert.equal(new Fake("f", { env: { A: "1" } }).health().status, "CONFIGURED");
});

// ─────────────────────────── DataForSEO ─────────────────────────────────

function fakeFetch(payload, { status = 200 } = {}) {
	const calls = [];
	const fn = async (url, options) => {
		calls.push({ url, options });
		return {
			ok: status >= 200 && status < 300,
			status,
			headers: { get: () => null },
			json: async () => payload,
			text: async () => JSON.stringify(payload),
		};
	};
	fn.calls = calls;
	return fn;
}

const env = { DATAFORSEO_LOGIN: "u", DATAFORSEO_PASSWORD: "p" };

test("DataForSEO exige credencial", () => {
	const p = new DataForSeoProvider({ env: {} });
	assert.equal(p.health().status, "MISSING");
	assert.throws(() => p.authHeader(), /credenciais/);
});

test("DataForSEO trata erro no nível da TASK, não só da resposta", async () => {
	const payload = {
		status_code: 20000,
		tasks: [{ status_code: 40501, status_message: "invalid field" }],
	};
	const p = new DataForSeoProvider({ env, fetchImpl: fakeFetch(payload), sleep: noSleep });
	await assert.rejects(p.rankedKeywords("x.com"), /40501/);
});

test("DataForSEO registra custo e desconta do orçamento", async () => {
	const ledger = new CostLedger();
	const budget = new BudgetGuard({ monthlyBudgetUsd: 5 });
	const payload = { status_code: 20000, cost: 0.0123, tasks: [{ status_code: 20000, result: [{ items: [] }] }] };
	const p = new DataForSeoProvider({ env, ledger, budget, fetchImpl: fakeFetch(payload), sleep: noSleep });
	await p.competitors("flowaidigital.com.br");
	assert.equal(ledger.entries.length, 1);
	assert.equal(ledger.entries[0].costUsd, 0.0123);
	assert.equal(budget.spentUsd, 0.0123);
});

test("DataForSEO recusa chamada que estouraria o orçamento", async () => {
	const budget = new BudgetGuard({ monthlyBudgetUsd: 0.001, spentUsd: 0.001 });
	const p = new DataForSeoProvider({ env, budget, fetchImpl: fakeFetch({}), sleep: noSleep });
	await assert.rejects(p.rankedKeywords("x.com"), /orçamento/);
});

test("DataForSEO separa as faixas do Quick Wins Engine", async () => {
	const payload = {
		status_code: 20000,
		tasks: [
			{
				status_code: 20000,
				result: [
					{
						total_count: 4,
						items: [
							{ keyword_data: { keyword: "a", keyword_info: { search_volume: 100 } }, ranked_serp_element: { serp_item: { rank_absolute: 2 } } },
							{ keyword_data: { keyword: "b", keyword_info: { search_volume: 90 } }, ranked_serp_element: { serp_item: { rank_absolute: 7 } } },
							{ keyword_data: { keyword: "c", keyword_info: { search_volume: 80 } }, ranked_serp_element: { serp_item: { rank_absolute: 15 } } },
							{ keyword_data: { keyword: "d", keyword_info: { search_volume: 70 } }, ranked_serp_element: { serp_item: { rank_absolute: 40 } } },
						],
					},
				],
			},
		],
	};
	const p = new DataForSeoProvider({ env, fetchImpl: fakeFetch(payload), sleep: noSleep });
	const r = await p.rankedKeywords("flowaidigital.com.br");
	assert.equal(r.top3, 1);
	assert.equal(r.top10, 2);
	assert.deepEqual(r.positions4to10.map((k) => k.keyword), ["b"]);
	assert.deepEqual(r.positions11to20.map((k) => k.keyword), ["c"]);
});

test("DataForSEO usa location Brasil e português", async () => {
	const f = fakeFetch({ status_code: 20000, tasks: [{ status_code: 20000, result: [{ items: [] }] }] });
	const p = new DataForSeoProvider({ env, fetchImpl: f, sleep: noSleep });
	await p.keywordIdeas(["automação de processos"]);
	const body = JSON.parse(f.calls[0].options.body)[0];
	assert.equal(body.location_code, 2076);
	assert.equal(body.language_name, "Portuguese");
});

test("todo endpoint declara custo base e por unidade", () => {
	for (const [ep, cost] of Object.entries(ENDPOINT_COST)) {
		assert.equal(typeof cost.base, "number", `base ausente em ${ep}`);
		assert.equal(typeof cost.perUnit, "number", `perUnit ausente em ${ep}`);
		assert.ok(cost.base >= 0 && cost.perUnit >= 0, `custo negativo em ${ep}`);
	}
});

test("estimativa cresce com o número de keywords", () => {
	const ep = "/v3/keywords_data/google_ads/search_volume/live";
	const uma = estimateEndpointCost(ep, { units: 1 });
	const muitas = estimateEndpointCost(ep, { units: 100 });
	assert.ok(muitas > uma, "estimativa ignora o volume de keywords");
});

test("estimativa não subestima o gasto real observado", () => {
	// Execução real de 21/08/2026: 39 keywords custaram US$ 0,1067.
	// A estimativa precisa ficar >= isso, senão o BudgetGuard deixa estourar.
	const volume = estimateEndpointCost("/v3/keywords_data/google_ads/search_volume/live", { units: 39 });
	const intent = estimateEndpointCost("/v3/dataforseo_labs/google/search_intent/live", { units: 39 });
	assert.ok(
		volume + intent >= 0.1067,
		`estimativa ${(volume + intent).toFixed(4)} abaixo do custo real observado 0.1067`,
	);
});

test("endpoint desconhecido cai num custo padrão, não em zero", () => {
	assert.ok(estimateEndpointCost("/v3/endpoint/que/nao/existe", { units: 10 }) > 0);
});

test("mapIntent traduz o vocabulário do provider", () => {
	assert.equal(mapIntent("informational"), "informacional");
	assert.equal(mapIntent("commercial"), "comercial");
	assert.equal(mapIntent("desconhecido"), null);
});

// ─────────────────────────── IndexNow ───────────────────────────────────

test("IndexNow não reenvia URL que não mudou", async () => {
	const p = new IndexNowProvider({ env: { INDEXNOW_KEY: "k" }, fetchImpl: fakeFetch({}), sleep: noSleep });
	const anteriores = new Map([["https://a/", "h1"]]);
	const mudou = p.filterChanged(
		[
			{ url: "https://a/", hash: "h1" },
			{ url: "https://b/", hash: "h2" },
		],
		anteriores,
	);
	assert.deepEqual(mudou.map((u) => u.url), ["https://b/"]);
});

test("IndexNow com lista vazia não faz request", async () => {
	const f = fakeFetch({});
	const p = new IndexNowProvider({ env: { INDEXNOW_KEY: "k" }, fetchImpl: f, sleep: noSleep });
	const r = await p.submit([]);
	assert.equal(r.skipped, true);
	assert.equal(f.calls.length, 0);
});

test("IndexNow monta arquivo de verificação", () => {
	const p = new IndexNowProvider({ env: { INDEXNOW_KEY: "abc123" } });
	assert.deepEqual(p.keyFile(), { path: "/abc123.txt", content: "abc123" });
});

test("IndexNow envia keyLocation junto", async () => {
	const f = fakeFetch({}, { status: 200 });
	const p = new IndexNowProvider({ env: { INDEXNOW_KEY: "k" }, fetchImpl: f, sleep: noSleep });
	await p.submit([{ url: "https://flowaidigital.com.br/blog/x/", hash: "h" }]);
	const body = JSON.parse(f.calls[0].options.body);
	assert.equal(body.host, "flowaidigital.com.br");
	assert.match(body.keyLocation, /\/k\.txt$/);
});

// ─────────────────────────── Google ─────────────────────────────────────

test("GSC usa escopo READ ONLY por padrão", () => {
	const p = new SearchConsoleProvider({ env: {} });
	assert.match(p.scopes()[0], /webmasters\.readonly$/);
	assert.match(p.scopes({ write: true })[0], /webmasters$/);
});

test("GSC lista variáveis exigidas sem revelar valor", () => {
	const p = new SearchConsoleProvider({ env: { GSC_SITE_URL: "https://x/" } });
	assert.deepEqual(p.health().missing, ["GOOGLE_SERVICE_ACCOUNT_JSON"]);
});

test("GSC searchAnalytics mapeia dimensões para campos nomeados", async () => {
	const payload = { rows: [{ keys: ["2026-08-20", "https://x/p/", "kw"], clicks: 3, impressions: 40, ctr: 0.075, position: 8.2 }] };
	const p = new SearchConsoleProvider({
		env: { GSC_SITE_URL: "https://x/" },
		fetchImpl: fakeFetch(payload),
		tokenProvider: async () => "tok",
		sleep: noSleep,
	});
	const rows = await p.searchAnalytics({ startDate: "2026-08-20", endDate: "2026-08-20" });
	assert.equal(rows[0].date, "2026-08-20");
	assert.equal(rows[0].page, "https://x/p/");
	assert.equal(rows[0].query, "kw");
	assert.equal(rows[0].clicks, 3);
});

test("GA4 filtra só sessões orgânicas", async () => {
	const payload = {
		rows: [
			{ dimensionValues: [{ value: "20260820" }, { value: "/a/" }, { value: "google / organic" }], metricValues: [{ value: "10" }, { value: "8" }, { value: "1" }] },
			{ dimensionValues: [{ value: "20260820" }, { value: "/b/" }, { value: "facebook / cpc" }], metricValues: [{ value: "5" }, { value: "3" }, { value: "0" }] },
		],
	};
	const p = new Ga4Provider({
		env: { GA4_PROPERTY_ID: "1" },
		fetchImpl: fakeFetch(payload),
		tokenProvider: async () => "tok",
		sleep: noSleep,
	});
	const rows = await p.organicLandingPages({ startDate: "2026-08-20", endDate: "2026-08-20" });
	assert.equal(rows.length, 1);
	assert.equal(rows[0].landingPage, "/a/");
	assert.equal(rows[0].sessions, 10);
});

// ─────────────────────────── healthcheck ────────────────────────────────

test("healthReport lista todos os providers sem vazar segredo", async () => {
	const r = await healthReport({
		env: { DATAFORSEO_LOGIN: "u", DATAFORSEO_PASSWORD: "senha-secreta" },
	});
	assert.equal(r.providers.length, 10); // 9 + openrouter
	assert.ok(!JSON.stringify(r).includes("senha-secreta"), "segredo vazou no health");
	const dfs = r.providers.find((p) => p.provider === "dataforseo");
	assert.equal(dfs.status, "CONFIGURED");
});

test("healthReport marca AUTO_PUBLISH desligado por padrão", async () => {
	const r = await healthReport({ env: {} });
	assert.equal(r.flags.AUTO_PUBLISH, false);
});

test("healthReport reporta postgres ausente sem DATABASE_URL", async () => {
	const r = await healthReport({ env: {} });
	const db = r.infrastructure.find((i) => i.component === "postgres");
	assert.equal(db.status, "MISSING");
});

// ─────────────────────────── matriz de crawlers ─────────────────────────

test("política cobre busca e treinamento com os agentes corretos", () => {
	const byName = Object.fromEntries(CRAWLERS.map((c) => [c.name, c.expected]));
	assert.equal(byName["OAI-SearchBot"], "allow");
	assert.equal(byName["ChatGPT-User"], "allow");
	assert.equal(byName["Claude-SearchBot"], "allow");
	assert.equal(byName["PerplexityBot"], "allow");
	assert.equal(byName.Googlebot, "allow");
	// treinamento continua bloqueado de propósito
	assert.equal(byName.GPTBot, "deny");
	assert.equal(byName.ClaudeBot, "deny");
	// Google-Extended NÃO tem user-agent próprio — é token de robots.txt
	assert.equal(byName["Google-Extended"], undefined);
	assert.ok(
		ROBOTS_ONLY_TOKENS.some((t) => t.name === "Google-Extended" && t.expected === "disallow"),
	);
});

test("tokens de robots são verificados no robots.txt, não por user-agent", async () => {
	const robots = [
		"User-agent: Google-Extended",
		"Disallow: /",
		"",
		"User-agent: Applebot-Extended",
		"Allow: /",
	].join("\n");
	const fetchImpl = async () => ({ text: async () => robots });
	const r = await checkRobotsTokens("https://x/robots.txt", { fetchImpl });
	const ge = r.find((x) => x.token === "Google-Extended");
	const ae = r.find((x) => x.token === "Applebot-Extended");
	assert.equal(ge.passed, true, "Google-Extended com Disallow deveria passar");
	assert.equal(ae.passed, false, "Applebot-Extended com Allow deveria falhar");
	assert.match(ae.reason, /esperado disallow/);
});

test("inspectHtml extrai H1, canonical e conta palavras ignorando script", () => {
	const html = `<html><head><title>T</title><link rel="canonical" href="https://x/"></head>
    <body><h1>Título</h1><p>uma duas três</p><script>var a=1;var b=2;var c=3;</script></body></html>`;
	const i = inspectHtml(html);
	assert.equal(i.hasH1, true);
	assert.equal(i.h1, "Título");
	assert.equal(i.canonical, "https://x/");
	assert.ok(i.wordCount < 10, `script contou como texto: ${i.wordCount}`);
});

test("allow com 200 mas sem conteúdo é FALHA — casca vazia não serve", () => {
	const v = evaluate({ expected: "allow", statusCode: 200, wordCount: 3 });
	assert.equal(v.passed, false);
	assert.match(v.reason, /casca sem conteúdo/);
});

test("allow com 200 e conteúdo passa", () => {
	assert.equal(evaluate({ expected: "allow", statusCode: 200, wordCount: 600 }).passed, true);
});

test("allow bloqueado por 403 é falha", () => {
	assert.equal(evaluate({ expected: "allow", statusCode: 403, wordCount: 0 }).passed, false);
});

test("deny só passa quando realmente bloqueia", () => {
	assert.equal(evaluate({ expected: "deny", statusCode: 403 }).passed, true);
	assert.equal(evaluate({ expected: "deny", statusCode: 200, wordCount: 900 }).passed, false);
});

test("checkAllCrawlers roda a matriz e detecta divergência", async () => {
	const fetchImpl = async (url, options) => {
		const ua = options.headers["User-Agent"];
		// simula produção hoje: bots de IA bloqueados, Googlebot liberado
		const isAi = /OAI-SearchBot|GPTBot|Claude|Perplexity/.test(ua);
		return {
			status: isAi ? 403 : 200,
			text: async () =>
				isAi
					? "Your request was blocked."
					: `<html><head><title>T</title><link rel="canonical" href="https://x/"></head><body><h1>Oi</h1>${"palavra ".repeat(300)}</body></html>`,
		};
	};
	const report = await checkAllCrawlers("https://x/", { fetchImpl });
	assert.equal(report.passed, false);
	const nomes = report.failures.map((f) => f.crawler);
	assert.ok(nomes.includes("OAI-SearchBot"));
	assert.ok(nomes.includes("Claude-SearchBot"));
	// os de treinamento devolvendo 403 é o comportamento desejado
	assert.ok(!nomes.includes("GPTBot"));
	assert.ok(!nomes.includes("ClaudeBot"));
});

test("checkAllCrawlers aprova quando o estado bate com a política", async () => {
	const fetchImpl = async (url, options) => {
		const ua = options.headers["User-Agent"];
		const deveBloquear = /GPTBot|ClaudeBot\//.test(ua);
		return {
			status: deveBloquear ? 403 : 200,
			text: async () =>
				deveBloquear
					? "blocked"
					: `<html><head><link rel="canonical" href="https://x/"></head><body><h1>Oi</h1>${"palavra ".repeat(300)}</body></html>`,
		};
	};
	const report = await checkAllCrawlers("https://x/", { fetchImpl });
	assert.equal(report.passed, true, JSON.stringify(report.failures));
});
