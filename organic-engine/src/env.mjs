// Carregador de ambiente.
//
// O projeto já tem credenciais úteis no .env da raiz (DataForSEO, Firecrawl,
// OpenRouter). Copiá-las para um segundo .env criaria duas fontes de verdade e
// duplicaria segredo em disco. Este loader lê as que já existem, na ordem certa.
//
// Precedência (a primeira que define, vence — nada é sobrescrito depois):
//   1. process.env                       (CI, shell, container)
//   2. organic-engine/.env               (específico do Engine)
//   3. <raiz do repo>/.env               (compartilhado, já existente)
//
// Invariantes: nunca imprime valor, nunca sobrescreve variável já definida,
// nunca inclui segredo em mensagem de erro.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENGINE_ROOT = path.resolve(HERE, "..");
const REPO_ROOT = path.resolve(ENGINE_ROOT, "..");
const PARENT_ROOT = path.resolve(REPO_ROOT, "..");

/** Ordem de busca. O primeiro arquivo não impede a leitura dos seguintes. */
export function candidatePaths() {
	return [
		path.join(ENGINE_ROOT, ".env"),
		path.join(REPO_ROOT, ".env"),
		// o .env compartilhado vive um nível acima, na pasta do workspace
		path.join(PARENT_ROOT, ".env"),
	];
}

/** Parser de .env: KEY=VALUE, aspas opcionais, `export` opcional, # comenta. */
export function parseEnv(text) {
	const out = {};
	for (const raw of String(text ?? "").split(/\r?\n/)) {
		const line = raw.trim();
		if (!line || line.startsWith("#")) continue;
		const m = line.replace(/^export\s+/, "").match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
		if (!m) continue;
		let value = m[2].trim();
		// remove comentário à direita só quando o valor não está entre aspas
		if (!/^["']/.test(value)) value = value.replace(/\s+#.*$/, "").trim();
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
		}
		out[m[1]] = value;
	}
	return out;
}

/**
 * Carrega o ambiente. Devolve relatório com NOMES e origem — nunca valores.
 * `target` é mutado (por padrão, process.env).
 */
export function loadEnv({ target = process.env, paths = candidatePaths(), readFile } = {}) {
	const read =
		readFile ??
		((p) => {
			try {
				return fs.readFileSync(p, "utf8");
			} catch {
				return null;
			}
		});

	const loaded = [];
	const skipped = [];
	const filesRead = [];

	for (const p of paths) {
		const text = read(p);
		if (text === null) continue;
		filesRead.push(p);
		for (const [key, value] of Object.entries(parseEnv(text))) {
			if (target[key] !== undefined && target[key] !== "") {
				// já definido por fonte de maior precedência — não sobrescreve
				skipped.push({ key, from: p });
				continue;
			}
			if (value === "") continue; // vazio não conta como definido
			target[key] = value;
			loaded.push({ key, from: p });
		}
	}

	return {
		filesRead,
		loadedKeys: loaded.map((l) => l.key),
		skippedKeys: skipped.map((s) => s.key),
		details: { loaded, skipped },
	};
}

/** Formata o relatório para o terminal. Só nomes e caminhos. */
export function formatEnvReport(report) {
	const lines = [];
	if (report.filesRead.length === 0) {
		lines.push("Nenhum arquivo .env encontrado nos caminhos padrão.");
	} else {
		lines.push("Arquivos .env lidos:");
		for (const f of report.filesRead) lines.push(`  ${f}`);
	}
	if (report.loadedKeys.length) {
		lines.push(`Variáveis carregadas (${report.loadedKeys.length}): ${report.loadedKeys.join(", ")}`);
	}
	if (report.skippedKeys.length) {
		lines.push(
			`Ignoradas por já existirem no ambiente (${report.skippedKeys.length}): ${[...new Set(report.skippedKeys)].join(", ")}`,
		);
	}
	return lines.join("\n");
}
