// Aplica a política granular de crawlers na zona.
//
// Estado encontrado em 21/08/2026:
//   ai_bots_protection: "block"   -> bloqueia TODO AI bot, inclusive os de busca
//   ai_search / ai_user / ai_training: "disabled"  -> granular desligado
//
// Queremos o oposto: busca e user-triggered liberados, treinamento bloqueado.
//
// A operação é feita com REDE DE SEGURANÇA: guarda o estado anterior, aplica,
// testa a matriz de crawlers e REVERTE sozinha se os bots de treinamento
// escaparem. Liberar treinamento por engano é pior do que continuar bloqueado.

import { CloudflareProvider } from "../providers/misc.mjs";
import { checkAllCrawlers } from "../crawler/ai-access.mjs";

/** Política final do projeto. */
export const DESIRED_POLICY = {
	// master switch sai do "block" cego para o controle granular assumir
	ai_bots_protection: "disabled",
	ai_search: "allow", // OAI-SearchBot, PerplexityBot, Claude-SearchBot
	ai_user: "allow", // ChatGPT-User, Perplexity-User, Claude-User
	ai_training: "block", // GPTBot, ClaudeBot, CCBot
};

export async function readPolicy(cf, zoneId) {
	return cf.call(`/zones/${zoneId}/bot_management`);
}

export async function writePolicy(cf, zoneId, body) {
	return cf.call(`/zones/${zoneId}/bot_management`, {
		method: "PUT",
		body: JSON.stringify(body),
	});
}

/** Só os campos que a política controla — o resto do estado é preservado. */
export function diffPolicy(before, after) {
	const campos = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
	const mudou = [];
	for (const k of campos) {
		if (JSON.stringify(before?.[k]) !== JSON.stringify(after?.[k])) {
			mudou.push({ campo: k, de: before?.[k], para: after?.[k] });
		}
	}
	return mudou;
}

/**
 * A política só é considerada bem-sucedida se AMBOS valerem:
 *   - todo crawler de busca responde 2xx
 *   - todo crawler de treinamento continua bloqueado
 */
export function policySatisfied(report) {
	const busca = report.results.filter((r) => r.expected === "allow");
	const treino = report.results.filter((r) => r.expected === "deny");
	const buscaLiberada = busca.every((r) => r.statusCode >= 200 && r.statusCode < 300);
	const treinoBloqueado = treino.every((r) => [401, 403, 429].includes(r.statusCode));
	return {
		ok: buscaLiberada && treinoBloqueado,
		buscaLiberada,
		treinoBloqueado,
		buscaFalhou: busca.filter((r) => !(r.statusCode >= 200 && r.statusCode < 300)).map((r) => r.crawler),
		treinoEscapou: treino.filter((r) => !([401, 403, 429].includes(r.statusCode))).map((r) => r.crawler),
	};
}

export async function applyPolicy({
	env = process.env,
	zoneId,
	url = "https://flowaidigital.com.br/",
	dryRun = false,
	log = console.log,
	waitMs = 12_000,
	sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
}) {
	const cf = new CloudflareProvider({ env });

	log("lendo estado atual…");
	const before = await readPolicy(cf, zoneId);
	log("BEFORE:");
	for (const [k, v] of Object.entries(before)) log(`  ${k}: ${JSON.stringify(v)}`);

	const desejado = { ...before, ...DESIRED_POLICY };
	const mudancas = diffPolicy(before, desejado);

	log("");
	if (mudancas.length === 0) {
		log("política já está no estado desejado — nada a alterar.");
		return { changed: false, before, after: before };
	}
	log("mudanças a aplicar:");
	for (const m of mudancas) log(`  ${m.campo}: ${JSON.stringify(m.de)} -> ${JSON.stringify(m.para)}`);

	if (dryRun) {
		log("\ndry run — nada foi alterado.");
		return { dryRun: true, before, planned: mudancas };
	}

	log("\naplicando…");
	let after;
	try {
		after = await writePolicy(cf, zoneId, desejado);
	} catch (err) {
		log(`FALHOU ao aplicar: ${err.message}`);
		return { changed: false, before, error: err.message };
	}
	log("AFTER:");
	for (const [k, v] of Object.entries(after ?? {})) log(`  ${k}: ${JSON.stringify(v)}`);

	log(`\naguardando ${waitMs / 1000}s para a borda propagar…`);
	await sleep(waitMs);

	log("verificando a matriz de crawlers…");
	const report = await checkAllCrawlers(url);
	const veredito = policySatisfied(report);

	for (const r of report.results) {
		log(`  ${r.crawler.padEnd(18)} ${r.expected.padEnd(6)} HTTP ${String(r.statusCode ?? "-").padEnd(5)} ${r.passed ? "ok" : "DIVERGE"}`);
	}

	if (veredito.treinoEscapou.length > 0) {
		log(`\nREVERTENDO: bots de treinamento escaparam (${veredito.treinoEscapou.join(", ")}).`);
		log("Liberar treinamento por engano é pior que seguir bloqueado.");
		await writePolicy(cf, zoneId, before);
		return { changed: false, reverted: true, before, veredito, report };
	}

	if (!veredito.buscaLiberada) {
		log(`\nATENÇÃO: crawlers de busca ainda bloqueados: ${veredito.buscaFalhou.join(", ")}`);
		log("A alteração foi MANTIDA (não piora nada), mas a política não foi atingida.");
	} else {
		log("\npolítica aplicada: busca liberada, treinamento bloqueado.");
	}

	return { changed: true, before, after, veredito, report };
}
