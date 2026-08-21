// Testes de INTEGRAÇÃO — Postgres e pg-boss de verdade, sem mock.
//
// Rodar:
//   docker compose up -d
//   DATABASE_URL="postgres://organic:organic@localhost:5433/organic" node --test test/integration.test.mjs
//
// Sem DATABASE_URL a suíte é pulada, para não quebrar o CI de quem só roda
// unitários. Passar unitário nunca prova que a fila funciona.

import test from "node:test";
import assert from "node:assert/strict";
import { sql, eq } from "drizzle-orm";

import {
	createPool,
	createDb,
	createBoss,
	checkDb,
	checkQueue,
	sendOnce,
	idempotencyKey,
	schema,
} from "../src/db/client.mjs";
import { loadEnv } from "../src/env.mjs";

loadEnv();

const HAS_DB = Boolean(process.env.DATABASE_URL);
const opts = HAS_DB ? {} : { skip: "DATABASE_URL ausente — suba com `docker compose up -d`" };

/**
 * O Drizzle envolve o erro do driver numa mensagem "Failed query: ...", e a
 * violação real fica em err.cause.code === "23505" (unique_violation).
 * Casar pela mensagem do topo dá falso negativo — e um teste de constraint que
 * passa por engano é pior do que não ter teste nenhum.
 */
async function assertUniqueViolation(promise, contexto) {
	try {
		await promise;
		assert.fail(`esperava violação de unicidade: ${contexto}`);
	} catch (err) {
		if (err?.code === "ERR_ASSERTION") throw err;
		const code = err?.cause?.code ?? err?.code;
		assert.equal(
			code,
			"23505",
			`esperava unique_violation (23505), veio ${code}: ${err?.cause?.message ?? err?.message}`,
		);
	}
}

// ─────────────────────────── schema ─────────────────────────────────────

test("conecta no Postgres", opts, async () => {
	assert.equal(await checkDb(), true);
});

test("as 19 tabelas do domínio existem", opts, async () => {
	const pool = createPool();
	try {
		const { rows } = await pool.query(
			`select tablename from pg_tables where schemaname = 'public' order by tablename`,
		);
		const nomes = rows.map((r) => r.tablename);
		const esperadas = [
			"ai_crawler_checks", "article_versions", "articles", "competitors",
			"content_candidates", "content_jobs", "crawl_results", "ga4_daily",
			"gsc_daily", "job_runs", "keyword_snapshots", "keywords",
			"page_metrics", "pages", "provider_costs", "publishing_events",
			"research_sources", "serp_results", "settings",
		];
		for (const t of esperadas) {
			assert.ok(nomes.includes(t), `tabela ausente: ${t}`);
		}
		assert.equal(esperadas.length, 19);
	} finally {
		await pool.end();
	}
});

// ─────────────────────────── unique constraints ─────────────────────────

test("slug de artigo é único — não nascem dois com o mesmo endereço", opts, async () => {
	const pool = createPool();
	const db = createDb(pool);
	const slug = `teste-slug-${Date.now()}`;
	try {
		await db.insert(schema.articles).values({ slug, title: "A", contentHash: `h1-${Date.now()}` });
		await assertUniqueViolation(
			db.insert(schema.articles).values({ slug, title: "B", contentHash: `h2-${Date.now()}` }),
			"slug repetido",
		);
	} finally {
		await pool.query("delete from articles where slug like 'teste-slug-%'");
		await pool.end();
	}
});

test("content_hash é único — o mesmo texto não vira dois artigos", opts, async () => {
	const pool = createPool();
	const db = createDb(pool);
	const hash = `hash-teste-${Date.now()}`;
	try {
		await db.insert(schema.articles).values({ slug: `a-${Date.now()}`, title: "A", contentHash: hash });
		await assertUniqueViolation(
			db.insert(schema.articles).values({ slug: `b-${Date.now()}`, title: "B", contentHash: hash }),
			"content_hash repetido",
		);
	} finally {
		await pool.query("delete from articles where content_hash like 'hash-teste-%'");
		await pool.end();
	}
});

test("gsc_daily é idempotente por dia+página+query+país+device", opts, async () => {
	const pool = createPool();
	const db = createDb(pool);
	const row = {
		day: "2026-08-20",
		page: "https://flowaidigital.com.br/teste-integracao/",
		query: "teste integracao",
		country: "bra",
		device: "MOBILE",
		clicks: 3,
		impressions: 40,
	};
	try {
		await db.insert(schema.gscDaily).values(row);
		// reprocessar o mesmo dia não pode duplicar
		await assertUniqueViolation(db.insert(schema.gscDaily).values(row), "linha de gsc_daily repetida");

		const { rows } = await pool.query(
			`select count(*)::int as n from gsc_daily where page = $1`,
			[row.page],
		);
		assert.equal(rows[0].n, 1);
	} finally {
		await pool.query("delete from gsc_daily where page like '%teste-integracao%'");
		await pool.end();
	}
});

test("path de página é único", opts, async () => {
	const pool = createPool();
	const db = createDb(pool);
	const path = `/teste-int-${Date.now()}/`;
	try {
		await db.insert(schema.pages).values({ path, type: "money" });
		await assertUniqueViolation(db.insert(schema.pages).values({ path, type: "blog" }), "path repetido");
	} finally {
		await pool.query("delete from pages where path like '/teste-int-%'");
		await pool.end();
	}
});

test("keyword é única por keyword+location+language", opts, async () => {
	const pool = createPool();
	const db = createDb(pool);
	const kw = `teste-kw-${Date.now()}`;
	try {
		await db.insert(schema.keywords).values({ keyword: kw });
		await assertUniqueViolation(db.insert(schema.keywords).values({ keyword: kw }), "keyword repetida");
		// mesma keyword em outro país é permitida
		await db.insert(schema.keywords).values({ keyword: kw, locationCode: 2840 });
	} finally {
		await pool.query("delete from keywords where keyword like 'teste-kw-%'");
		await pool.end();
	}
});

test("provider_costs aceita custo fracionado sem perder precisão", opts, async () => {
	const pool = createPool();
	const db = createDb(pool);
	try {
		await db.insert(schema.providerCosts).values({
			provider: "teste-int",
			endpoint: "/v3/x",
			costUsd: "0.000125",
		});
		const { rows } = await pool.query(
			`select cost_usd from provider_costs where provider = 'teste-int'`,
		);
		assert.equal(Number(rows[0].cost_usd), 0.000125);
	} finally {
		await pool.query("delete from provider_costs where provider = 'teste-int'");
		await pool.end();
	}
});

test("job_runs registra execução com custo e erro", opts, async () => {
	const pool = createPool();
	const db = createDb(pool);
	try {
		await db.insert(schema.jobRuns).values({
			jobType: "teste-integracao",
			status: "failed",
			attempt: 2,
			provider: "dataforseo",
			costUsd: "0.01",
			error: "erro simulado",
		});
		const { rows } = await pool.query(
			`select status, attempt, error from job_runs where job_type = 'teste-integracao'`,
		);
		assert.equal(rows[0].status, "failed");
		assert.equal(rows[0].attempt, 2);
		assert.match(rows[0].error, /erro simulado/);
	} finally {
		await pool.query("delete from job_runs where job_type = 'teste-integracao'");
		await pool.end();
	}
});

// ─────────────────────────── pg-boss ────────────────────────────────────

test("pg-boss inicia e cria o próprio schema", opts, async () => {
	assert.equal(await checkQueue(), true);
	const pool = createPool();
	try {
		const { rows } = await pool.query(
			`select count(*)::int as n from information_schema.schemata where schema_name = 'pgboss'`,
		);
		assert.equal(rows[0].n, 1, "schema pgboss não foi criado");
	} finally {
		await pool.end();
	}
});

test("enfileira e executa um job de verdade", opts, async () => {
	const boss = createBoss();
	const fila = `teste-exec-${Date.now()}`;
	try {
		await boss.start();
		await boss.createQueue(fila);

		let recebido = null;
		await boss.work(fila, async ([job]) => {
			recebido = job.data;
		});

		const id = await boss.send(fila, { artigo: "x", tentativa: 1 });
		assert.ok(id, "send não devolveu id");

		// espera a execução por condição, não por tempo fixo
		const limite = Date.now() + 20_000;
		while (recebido === null && Date.now() < limite) {
			await new Promise((r) => setTimeout(r, 200));
		}
		assert.deepEqual(recebido, { artigo: "x", tentativa: 1 });
	} finally {
		await boss.stop({ graceful: false, wait: true }).catch(() => {});
	}
});

test("job que falha é reprocessado até o limite de retry", opts, async () => {
	const boss = createBoss({ ...process.env }, { retryLimit: 2, retryDelay: 1, retryBackoff: false });
	const fila = `teste-retry-${Date.now()}`;
	try {
		await boss.start();
		await boss.createQueue(fila);

		let tentativas = 0;
		await boss.work(fila, { pollingIntervalSeconds: 1 }, async () => {
			tentativas++;
			throw new Error("falha proposital");
		});

		await boss.send(fila, { x: 1 }, { retryLimit: 2, retryDelay: 1, retryBackoff: false });

		const limite = Date.now() + 30_000;
		while (tentativas < 2 && Date.now() < limite) {
			await new Promise((r) => setTimeout(r, 300));
		}
		assert.ok(tentativas >= 2, `esperava 2+ tentativas, houve ${tentativas}`);
	} finally {
		await boss.stop({ graceful: false, wait: true }).catch(() => {});
	}
});

test("singletonKey SOZINHO não deduplica no pg-boss v10", opts, async () => {
	// Comportamento real da v10, confirmado aqui: sem janela, a chave não
	// impede o segundo envio. É por isso que sendOnce existe.
	const boss = createBoss();
	const fila = `teste-semjanela-${Date.now()}`;
	try {
		await boss.start();
		await boss.createQueue(fila);
		const a = await boss.send(fila, { artigo: 42 }, { singletonKey: "artigo-42" });
		const b = await boss.send(fila, { artigo: 42 }, { singletonKey: "artigo-42" });
		assert.ok(a);
		assert.ok(b, "se isto virar null, a v10 mudou e sendOnce pode simplificar");
	} finally {
		await boss.stop({ graceful: false, wait: true }).catch(() => {});
	}
});

test("sendOnce deduplica de verdade — o mesmo artigo não entra duas vezes", opts, async () => {
	const boss = createBoss();
	const fila = `teste-idem-${Date.now()}`;
	try {
		await boss.start();
		await boss.createQueue(fila);

		const key = idempotencyKey("publish-article", { slug: "meu-artigo", hash: "abc123" });
		const a = await sendOnce(boss, fila, { slug: "meu-artigo" }, { key });
		const b = await sendOnce(boss, fila, { slug: "meu-artigo" }, { key });

		assert.ok(a, "primeiro envio deveria criar o job");
		assert.equal(b, null, "segundo envio com a mesma chave deveria ser recusado");

		// payload diferente, chave diferente -> passa
		const outraKey = idempotencyKey("publish-article", { slug: "meu-artigo", hash: "def456" });
		assert.ok(await sendOnce(boss, fila, { slug: "meu-artigo" }, { key: outraKey }));
	} finally {
		await boss.stop({ graceful: false, wait: true }).catch(() => {});
	}
});

test("idempotencyKey é estável e independe da ordem das chaves", () => {
	const a = idempotencyKey("job", { b: 2, a: 1 });
	const c = idempotencyKey("job", { a: 1, b: 2 });
	assert.equal(a, c);
	assert.notEqual(a, idempotencyKey("job", { a: 1, b: 3 }));
	assert.equal(idempotencyKey("job", { a: 1, x: undefined }), "job:a=1");
});

test("sendOnce exige chave — idempotência não é opcional", opts, async () => {
	const boss = createBoss();
	try {
		await assert.rejects(sendOnce(boss, "q", {}, {}), /chave de idempotência/);
	} finally {
		await boss.stop({ graceful: false, wait: true }).catch(() => {});
	}
});

test("agendamento por cron é registrado", opts, async () => {
	const boss = createBoss();
	const fila = `teste-cron-${Date.now()}`;
	try {
		await boss.start();
		await boss.createQueue(fila);
		// 3h da manhã todo dia — o sync diário do Search Console
		await boss.schedule(fila, "0 3 * * *", { origem: "gsc" });
		const agendas = await boss.getSchedules();
		assert.ok(
			agendas.some((s) => s.name === fila && s.cron === "0 3 * * *"),
			"agendamento não apareceu em getSchedules",
		);
		await boss.unschedule(fila);
	} finally {
		await boss.stop({ graceful: false, wait: true }).catch(() => {});
	}
});
