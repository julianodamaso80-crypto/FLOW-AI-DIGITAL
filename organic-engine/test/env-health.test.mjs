import test from "node:test";
import assert from "node:assert/strict";

import { parseEnv, loadEnv, formatEnvReport, candidatePaths } from "../src/env.mjs";
import { healthReport, scrubSecrets, buildProviders } from "../src/health.mjs";
import { OpenRouterProvider, DEFAULT_WRITER_MODEL } from "../src/providers/openrouter.mjs";
import { DataForSeoProvider, maskLogin } from "../src/providers/dataforseo.mjs";

// ─────────────────────────── env loader ─────────────────────────────────

test("parseEnv lê pares, aspas, export e ignora comentário", () => {
	const out = parseEnv(`
# comentario
A=1
export B="dois"
C='tres'
D=valor # com comentario
E=
`);
	assert.equal(out.A, "1");
	assert.equal(out.B, "dois");
	assert.equal(out.C, "tres");
	assert.equal(out.D, "valor");
	assert.equal(out.E, "");
});

test("parseEnv preserva # dentro de valor entre aspas", () => {
	assert.equal(parseEnv('X="a#b"').X, "a#b");
});

test("loadEnv NÃO sobrescreve variável já definida — process.env vence", () => {
	const target = { JA_EXISTE: "original" };
	const files = { "/fake/.env": "JA_EXISTE=do-arquivo\nNOVA=vinda-do-arquivo" };
	const r = loadEnv({
		target,
		paths: ["/fake/.env"],
		readFile: (p) => files[p] ?? null,
	});
	assert.equal(target.JA_EXISTE, "original", "sobrescreveu variável existente");
	assert.equal(target.NOVA, "vinda-do-arquivo");
	assert.deepEqual(r.loadedKeys, ["NOVA"]);
	assert.deepEqual(r.skippedKeys, ["JA_EXISTE"]);
});

test("loadEnv respeita a ordem de precedência entre arquivos", () => {
	const target = {};
	const files = {
		"/engine/.env": "CHAVE=do-engine",
		"/raiz/.env": "CHAVE=da-raiz\nOUTRA=so-na-raiz",
	};
	loadEnv({ target, paths: ["/engine/.env", "/raiz/.env"], readFile: (p) => files[p] ?? null });
	assert.equal(target.CHAVE, "do-engine", "arquivo de menor precedência venceu");
	assert.equal(target.OUTRA, "so-na-raiz");
});

test("loadEnv ignora arquivo inexistente sem quebrar", () => {
	const r = loadEnv({ target: {}, paths: ["/nao/existe/.env"], readFile: () => null });
	assert.deepEqual(r.filesRead, []);
	assert.deepEqual(r.loadedKeys, []);
});

test("valor vazio não conta como definido", () => {
	const target = {};
	loadEnv({ target, paths: ["/f"], readFile: () => "VAZIA=\nCHEIA=x" });
	assert.equal(target.VAZIA, undefined);
	assert.equal(target.CHEIA, "x");
});

test("relatório do env mostra nomes, nunca valores", () => {
	const files = { "/f/.env": "SEGREDO_TOP=valor-ultra-secreto" };
	const r = loadEnv({ target: {}, paths: ["/f/.env"], readFile: (p) => files[p] ?? null });
	const texto = formatEnvReport(r);
	assert.match(texto, /SEGREDO_TOP/);
	assert.ok(!texto.includes("valor-ultra-secreto"), "valor vazou no relatório");
	assert.ok(!JSON.stringify(r).includes("valor-ultra-secreto"), "valor vazou no objeto");
});

test("candidatePaths inclui o .env do engine e o compartilhado", () => {
	const p = candidatePaths();
	assert.ok(p.length >= 2);
	assert.ok(p.some((x) => x.includes("organic-engine")));
});

// ─────────────────────────── scrub de segredo ───────────────────────────

test("scrubSecrets remove chave do OpenRouter — regressão de vazamento", () => {
	// o `label` da chave devolvido pela API traz o prefixo da credencial
	const out = scrubSecrets("sk-or-v1-EXEMPLOFICTICIOxxxxxxxxxxxx, uso US$ 25.30");
	assert.ok(!out.includes("EXEMPLOFICTICIO"), "prefixo da chave vazou");
	assert.match(out, /\[chave omitida\]/);
	assert.match(out, /25\.30/, "informação legítima foi perdida");
});

test("scrubSecrets remove chaves sk- genéricas e e-mail", () => {
	assert.match(scrubSecrets("sk-proj-abcdefghijklmnopqrst"), /\[chave omitida\]/);
	assert.match(scrubSecrets("conta juliano.damaso@empresa.com"), /\[e-mail omitido\]/);
	assert.match(scrubSecrets("Authorization: Bearer abc123def456"), /Bearer \[omitido\]/);
});

test("scrubSecrets preserva texto sem segredo", () => {
	assert.equal(scrubSecrets("saldo US$ 29.42, 2000 req/min"), "saldo US$ 29.42, 2000 req/min");
});

test("maskLogin mostra só o suficiente para conferir a conta", () => {
	const m = maskLogin("juliano.exemplo@empresa.com.br");
	assert.match(m, /^ju\*\*\*@em\*\*\*/);
	assert.ok(!m.includes("juliano.exemplo"), "login vazou");
	assert.equal(maskLogin(""), null);
});

// ─────────────────────────── health com verificação ─────────────────────

const okFetch = (payload, status = 200) => async () => ({
	ok: status >= 200 && status < 300,
	status,
	headers: { get: () => null },
	json: async () => payload,
});

test("DataForSEO verify usa endpoint gratuito e reporta custo zero", async () => {
	let calledUrl = null;
	const p = new DataForSeoProvider({
		env: { DATAFORSEO_LOGIN: "a@b.com", DATAFORSEO_PASSWORD: "x" },
		fetchImpl: async (url) => {
			calledUrl = url;
			return {
				ok: true,
				status: 200,
				json: async () => ({
					status_code: 20000,
					tasks: [{ result: [{ money: { balance: 29.42 }, rates: { limits: { minute: 2000 } } }] }],
				}),
			};
		},
	});
	const v = await p.verify();
	assert.equal(v.verified, true);
	assert.equal(v.costUsd, 0);
	assert.equal(v.balanceUsd, 29.42);
	assert.match(calledUrl, /\/v3\/appendix\/user_data$/, "não usou o endpoint gratuito");
	assert.ok(!v.loginMasked.includes("a@b.com"), "login completo exposto");
});

test("DataForSEO verify falha sem credencial, sem lançar", async () => {
	const v = await new DataForSeoProvider({ env: {} }).verify();
	assert.equal(v.verified, false);
	assert.equal(v.costUsd, 0);
});

test("DataForSEO verify reporta status_code de erro da API", async () => {
	const p = new DataForSeoProvider({
		env: { DATAFORSEO_LOGIN: "a@b.com", DATAFORSEO_PASSWORD: "x" },
		fetchImpl: okFetch({ status_code: 40100, status_message: "auth error" }),
	});
	const v = await p.verify();
	assert.equal(v.verified, false);
	assert.match(v.reason, /40100/);
});

test("OpenRouter verify usa /key e não gera tokens", async () => {
	let calledUrl = null;
	const p = new OpenRouterProvider({
		env: { OPENROUTER_API_KEY: "sk-or-v1-teste" },
		fetchImpl: async (url) => {
			calledUrl = url;
			return { ok: true, status: 200, json: async () => ({ data: { usage: 25.3, limit: null } }) };
		},
	});
	const v = await p.verify();
	assert.equal(v.verified, true);
	assert.equal(v.costUsd, 0);
	assert.match(calledUrl, /\/key$/);
});

test("healthReport não expõe segredo mesmo com verificação ligada", async () => {
	const env = {
		DATAFORSEO_LOGIN: "juliano@empresa.com",
		DATAFORSEO_PASSWORD: "senha-secreta-123",
		OPENROUTER_API_KEY: "sk-or-v1-EXEMPLOFICTICIOyyyyyyyyyyyy",
	};
	const r = await healthReport({ env, verify: false });
	const dump = JSON.stringify(r);
	assert.ok(!dump.includes("senha-secreta-123"), "senha vazou");
	assert.ok(!dump.includes("EXEMPLOFICTICIO"), "chave vazou");
	assert.ok(!dump.includes("juliano@empresa.com"), "login vazou");
});

test("openrouter está entre os providers oficiais", async () => {
	const r = await healthReport({ env: {} });
	assert.ok(r.providers.some((p) => p.provider === "openrouter"), "openrouter ausente");
	assert.equal(r.totalProviders, 10);
});

test("providers com credencial aparecem como CONFIGURED sem verify", async () => {
	const r = await healthReport({
		env: { DATAFORSEO_LOGIN: "a@b.com", DATAFORSEO_PASSWORD: "x", FIRECRAWL_API_KEY: "f", OPENROUTER_API_KEY: "o" },
	});
	const byName = Object.fromEntries(r.providers.map((p) => [p.provider, p.status]));
	assert.equal(byName.dataforseo, "CONFIGURED");
	assert.equal(byName.firecrawl, "CONFIGURED");
	assert.equal(byName.openrouter, "CONFIGURED");
	assert.equal(r.usableCount, 3);
});

test("firecrawl fica CONFIGURED_UNVERIFIED — não gastamos para testar", async () => {
	const r = await healthReport({ env: { FIRECRAWL_API_KEY: "f" }, verify: true });
	const fc = r.providers.find((p) => p.provider === "firecrawl");
	assert.equal(fc.status, "CONFIGURED_UNVERIFIED");
});

test("github publishing é FUTURE_REQUIRED, não bloqueador", async () => {
	const r = await healthReport({ env: {} });
	const gh = r.infrastructure.find((i) => i.component === "github publishing");
	assert.equal(gh.status, "FUTURE_REQUIRED");
});

// ─────────────────────────── OpenRouter provider ────────────────────────

test("modelo é configurável e não fica cravado", () => {
	const padrao = new OpenRouterProvider({ env: { OPENROUTER_API_KEY: "k" } });
	assert.equal(padrao.writerModel, DEFAULT_WRITER_MODEL);
	const custom = new OpenRouterProvider({
		env: { OPENROUTER_API_KEY: "k", OPENROUTER_WRITER_MODEL: "outro/modelo", OPENROUTER_REVIEW_MODEL: "rev/modelo" },
	});
	assert.equal(custom.writerModel, "outro/modelo");
	assert.equal(custom.reviewModel, "rev/modelo");
});

test("complete rejeita resposta truncada por max_tokens", async () => {
	const p = new OpenRouterProvider({
		env: { OPENROUTER_API_KEY: "k" },
		fetchImpl: okFetch({
			choices: [{ message: { content: "texto cortado" }, finish_reason: "length" }],
			usage: { total_tokens: 100 },
		}),
		sleep: async () => {},
	});
	await assert.rejects(p.complete({ messages: [{ role: "user", content: "x" }] }), /truncada/);
});

test("complete registra custo e desconta do orçamento", async () => {
	const { CostLedger, BudgetGuard } = await import("../src/providers/base.mjs");
	const ledger = new CostLedger();
	const budget = new BudgetGuard({ monthlyBudgetUsd: 10 });
	const p = new OpenRouterProvider({
		env: { OPENROUTER_API_KEY: "k" },
		ledger,
		budget,
		fetchImpl: okFetch({
			choices: [{ message: { content: "ok" }, finish_reason: "stop" }],
			usage: { total_tokens: 500, cost: 0.02 },
		}),
		sleep: async () => {},
	});
	const out = await p.complete({ messages: [{ role: "user", content: "x" }] });
	assert.equal(out.costUsd, 0.02);
	assert.equal(ledger.entries.length, 1);
	assert.equal(budget.spentUsd, 0.02);
});

test("complete barra chamada que estouraria o orçamento", async () => {
	const { BudgetGuard } = await import("../src/providers/base.mjs");
	const p = new OpenRouterProvider({
		env: { OPENROUTER_API_KEY: "k" },
		budget: new BudgetGuard({ monthlyBudgetUsd: 0.01, spentUsd: 0.01 }),
		fetchImpl: okFetch({}),
		sleep: async () => {},
	});
	await assert.rejects(p.complete({ messages: [{ role: "user", content: "x" }] }), /orçamento/);
});

test("completeJson rejeita JSON inválido", async () => {
	const p = new OpenRouterProvider({
		env: { OPENROUTER_API_KEY: "k" },
		fetchImpl: okFetch({
			choices: [{ message: { content: "isso não é json" }, finish_reason: "stop" }],
			usage: {},
		}),
		sleep: async () => {},
	});
	await assert.rejects(p.completeJson({ messages: [{ role: "user", content: "x" }] }), /JSON inválido/);
});

test("buildProviders instancia os 10 providers", () => {
	assert.equal(Object.keys(buildProviders({})).length, 10);
});
