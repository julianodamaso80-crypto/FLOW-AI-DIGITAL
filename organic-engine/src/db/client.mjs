// Conexão com o Postgres e wrapper da fila.
//
// Nada aqui abre conexão na importação: quem usa decide quando conectar, e o
// health consegue reportar "MISSING" sem tentar discar.

import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import PgBoss from "pg-boss";
import * as schema from "./schema.mjs";

export function requireDatabaseUrl(env = process.env) {
	const url = env.DATABASE_URL;
	if (!url) {
		throw new Error("DATABASE_URL ausente — suba o Postgres com `docker compose up -d`");
	}
	return url;
}

export function createPool(env = process.env, opts = {}) {
	return new pg.Pool({
		connectionString: requireDatabaseUrl(env),
		max: opts.max ?? 10,
		idleTimeoutMillis: opts.idleTimeoutMillis ?? 30_000,
		connectionTimeoutMillis: opts.connectionTimeoutMillis ?? 10_000,
	});
}

export function createDb(pool) {
	return drizzle(pool, { schema });
}

/** Ping barato — usado pelo healthcheck. */
export async function checkDb(env = process.env) {
	const pool = createPool(env, { max: 1 });
	try {
		const r = await pool.query("select 1 as ok");
		return r.rows[0].ok === 1;
	} finally {
		await pool.end();
	}
}

/**
 * pg-boss no schema `pgboss`, separado das tabelas de domínio.
 * `retryLimit` e `retryBackoff` valem para todas as filas por padrão.
 */
export function createBoss(env = process.env, opts = {}) {
	return new PgBoss({
		connectionString: requireDatabaseUrl(env),
		schema: opts.schema ?? "pgboss",
		retryLimit: opts.retryLimit ?? 3,
		retryDelay: opts.retryDelay ?? 30,
		retryBackoff: opts.retryBackoff ?? true,
		// mantém histórico para auditoria em vez de apagar job concluído
		archiveCompletedAfterSeconds: opts.archiveCompletedAfterSeconds ?? 3600,
		...opts.extra,
	});
}

export async function checkQueue(env = process.env) {
	const boss = createBoss(env);
	try {
		await boss.start();
		return true;
	} finally {
		await boss.stop({ graceful: false, wait: true }).catch(() => {});
	}
}

/**
 * Envio idempotente.
 *
 * No pg-boss v10, `singletonKey` sozinho NÃO deduplica — ele só garante
 * unicidade dentro de uma janela quando acompanhado de `singletonSeconds`
 * (ou de `useSingletonQueue`). Descoberto em teste de integração: dois
 * `send` com a mesma chave e sem janela criaram dois jobs.
 *
 * Sem esse cuidado, um job que reprocessa o mesmo artigo publicaria duas
 * vezes e pagaria a API duas vezes.
 *
 * @returns id do job, ou null se já havia um equivalente na janela.
 */
export async function sendOnce(boss, queue, data, { key, windowSeconds = 3600, ...opts } = {}) {
	if (!key) throw new Error("sendOnce exige uma chave de idempotência");
	return boss.send(queue, data, {
		...opts,
		singletonKey: key,
		singletonSeconds: windowSeconds,
	});
}

/** Chave estável a partir do tipo de job e do payload relevante. */
export function idempotencyKey(jobType, parts) {
	const flat = Object.entries(parts)
		.filter(([, v]) => v !== undefined && v !== null)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([k, v]) => `${k}=${v}`)
		.join("&");
	return `${jobType}:${flat}`;
}

export { schema };
