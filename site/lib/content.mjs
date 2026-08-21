// Carga e validação dos artigos do blog.
//
// Artigo = arquivo Markdown versionado no Git com front matter. Nada de MDX
// executável: ver markdown.mjs. O Organic Engine escreve arquivos nesta pasta,
// commita, e o build publica — assim toda publicação tem histórico e rollback.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { wordCount } from "./markdown.mjs";

/** Campos que todo artigo precisa ter para poder ser publicado. */
export const REQUIRED_FIELDS = [
	"id",
	"slug",
	"title",
	"metaDescription",
	"primaryKeyword",
	"intent",
	"cluster",
	"author",
	"status",
	"createdAt",
];

export const VALID_STATUS = ["draft", "review", "hold", "published", "archived"];
export const VALID_INTENT = ["informacional", "comercial", "transacional", "navegacional", "comparativo"];

/** Front matter YAML de subconjunto — chave: valor, listas e objetos simples. */
export function parseFrontMatter(raw) {
	const text = String(raw ?? "").replace(/\r\n/g, "\n");
	const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!m) return { data: {}, body: text };

	const data = {};
	let currentKey = null;
	for (const line of m[1].split("\n")) {
		if (!line.trim() || line.trim().startsWith("#")) continue;

		// item de lista
		const li = line.match(/^\s*-\s+(.*)$/);
		if (li && currentKey) {
			if (!Array.isArray(data[currentKey])) data[currentKey] = [];
			const val = li[1].trim();
			// item objeto inline: {url: x, title: y}
			if (val.startsWith("{") && val.endsWith("}")) {
				const obj = {};
				for (const pair of val.slice(1, -1).split(/,\s*(?=[a-zA-Z_]+\s*:)/)) {
					const kv = pair.match(/^\s*([a-zA-Z_]+)\s*:\s*(.*)$/);
					if (kv) obj[kv[1]] = unquote(kv[2]);
				}
				data[currentKey].push(obj);
			} else {
				data[currentKey].push(unquote(val));
			}
			continue;
		}

		const kv = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
		if (kv) {
			currentKey = kv[1];
			const val = kv[2].trim();
			if (val === "") {
				data[currentKey] = [];
			} else if (val.startsWith("[") && val.endsWith("]")) {
				data[currentKey] = val
					.slice(1, -1)
					.split(",")
					.map((s) => unquote(s.trim()))
					.filter(Boolean);
			} else {
				data[currentKey] = coerce(unquote(val));
			}
		}
	}
	return { data, body: m[2] };
}

function unquote(v) {
	const s = String(v).trim();
	if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
		return s.slice(1, -1);
	}
	return s;
}

function coerce(v) {
	if (v === "true") return true;
	if (v === "false") return false;
	if (/^-?\d+$/.test(v)) return Number(v);
	return v;
}

/** Hash estável do conteúdo — base da idempotência do publisher. */
export function contentHash(body, data) {
	const payload = JSON.stringify({ t: data.title, d: data.metaDescription, b: body });
	return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

/**
 * Valida um artigo. Retorna lista de erros (vazia = válido).
 * Estas são as checagens ESTRUTURAIS. Os hard gates editoriais
 * (demanda, canibalização, fontes, originalidade) vivem no organic-engine.
 */
export function validatePost(post, allPosts = []) {
	const errors = [];

	for (const f of REQUIRED_FIELDS) {
		if (post[f] === undefined || post[f] === null || post[f] === "") {
			errors.push(`campo obrigatório ausente: ${f}`);
		}
	}
	if (post.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)) {
		errors.push(`slug inválido: "${post.slug}" (use apenas minúsculas, números e hífen)`);
	}
	if (post.status && !VALID_STATUS.includes(post.status)) {
		errors.push(`status inválido: "${post.status}"`);
	}
	if (post.intent && !VALID_INTENT.includes(post.intent)) {
		errors.push(`intent inválido: "${post.intent}"`);
	}
	if (post.metaDescription && post.metaDescription.length > 165) {
		errors.push(`metaDescription longa demais (${post.metaDescription.length} caracteres, máximo 165)`);
	}
	if (post.title && post.title.length > 70) {
		errors.push(`title longo demais (${post.title.length} caracteres, máximo 70)`);
	}
	// publicado exige data real de publicação
	if (post.status === "published" && !post.publishedAt) {
		errors.push("artigo publicado precisa de publishedAt");
	}
	// datas nunca no futuro — evita simular cronograma
	const today = new Date().toISOString().slice(0, 10);
	for (const f of ["createdAt", "publishedAt", "updatedAt"]) {
		if (post[f] && String(post[f]).slice(0, 10) > today) {
			errors.push(`${f} está no futuro: ${post[f]}`);
		}
	}
	// slug único
	const dupes = allPosts.filter((p) => p !== post && p.slug === post.slug);
	if (dupes.length) errors.push(`slug duplicado: ${post.slug}`);

	return errors;
}

/** Lê todos os artigos da pasta. Não filtra por status — quem decide é o build. */
export function loadPosts(dir) {
	if (!fs.existsSync(dir)) return [];
	const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
	const posts = files.map((file) => {
		const raw = fs.readFileSync(path.join(dir, file), "utf8");
		const { data, body } = parseFrontMatter(raw);
		return {
			...data,
			slug: data.slug || file.replace(/\.md$/, ""),
			body,
			wordCount: wordCount(body),
			hash: contentHash(body, data),
			_file: file,
		};
	});
	// ordem de publicação, mais recente primeiro
	posts.sort((a, b) => String(b.publishedAt ?? "").localeCompare(String(a.publishedAt ?? "")));
	return posts;
}

export function publishedPosts(posts) {
	return posts.filter((p) => p.status === "published");
}
