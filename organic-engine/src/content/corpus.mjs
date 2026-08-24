// Corpus publicado — a base do plano de atualização.
//
// Lê o conteúdo do site em disco em vez do banco de propósito: o plano de
// frescor precisa funcionar antes de existir Postgres configurado, e o que
// está publicado é o que está no diretório de conteúdo.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const CONTEUDO = path.resolve(AQUI, "..", "..", "..", "site", "content");

/**
 * Publicações com data e slug. `gscClicks` vem de fora quando houver Search
 * Console conectado — sem ele, o plano ordena só por decaimento, o que é
 * degradação honesta e não silenciosa.
 */
export function loadCorpus({ dir = CONTEUDO, clicksBySlug = {} } = {}) {
	if (!fs.existsSync(dir)) return [];

	const arquivos = [];
	const varrer = (d) => {
		for (const e of fs.readdirSync(d, { withFileTypes: true })) {
			const p = path.join(d, e.name);
			if (e.isDirectory()) varrer(p);
			else if (e.name.endsWith(".md")) arquivos.push(p);
		}
	};
	varrer(dir);

	return arquivos.map((f) => {
		const raw = fs.readFileSync(f, "utf8");
		const fm = raw.match(/^---\n([\s\S]*?)\n---/);
		const campo = (nome) => fm?.[1].match(new RegExp(`^${nome}:\\s*(.+)$`, "m"))?.[1].trim().replace(/^["']|["']$/g, "");
		const slug = campo("slug") ?? path.basename(f, ".md");
		return {
			slug,
			publishedAt: campo("publishedAt") ?? campo("date") ?? null,
			dateModified: campo("dateModified") ?? null,
			gscClicks: Number(clicksBySlug[slug] ?? 0),
			file: f,
		};
	});
}
