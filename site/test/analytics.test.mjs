import test from "node:test";
import assert from "node:assert/strict";

import { ga4Snippet, pageEventSnippet, sanitizeParams, EVENTS, PII_KEYS } from "../lib/analytics.mjs";

test("sem measurement ID não injeta nada — nunca criar ID fictício", () => {
	assert.equal(ga4Snippet(""), "");
	assert.equal(ga4Snippet(null), "");
	assert.equal(ga4Snippet(undefined), "");
});

test("ID em formato inválido é recusado", () => {
	assert.equal(ga4Snippet("UA-12345-1"), "");
	assert.equal(ga4Snippet("GTM-ABC123"), "");
	assert.equal(ga4Snippet("qualquer-coisa"), "");
});

test("ID válido injeta gtag com anonimização de IP", () => {
	const s = ga4Snippet("G-ABC1234567");
	assert.match(s, /googletagmanager\.com\/gtag\/js\?id=G-ABC1234567/);
	assert.match(s, /anonymize_ip/);
});

test("snippet rastreia whatsapp_click e cta_click", () => {
	const s = ga4Snippet("G-ABC1234567");
	assert.match(s, /whatsapp_click/);
	assert.match(s, /cta_click/);
	assert.match(s, /wa\.me/);
});

test("sanitizeParams remove chaves de PII", () => {
	const out = sanitizeParams({
		page_path: "/x/",
		email: "a@b.com",
		telefone: "21999999999",
		nome: "Fulano",
		cpf: "12345678900",
		page_type: "money",
	});
	assert.deepEqual(Object.keys(out).sort(), ["page_path", "page_type"]);
});

test("sanitizeParams remove valores que parecem e-mail ou telefone", () => {
	const out = sanitizeParams({ contato: "pessoa@dominio.com", ref: "5521992208062", ok: "money" });
	assert.deepEqual(Object.keys(out), ["ok"]);
});

test("nenhum PII sai no snippet gerado", () => {
	const s = ga4Snippet("G-ABC1234567", { pageType: "money", pageSlug: "seo-e-conteudo" });
	for (const k of PII_KEYS) {
		assert.ok(!s.includes(`"${k}"`), `snippet contém chave de PII: ${k}`);
	}
	assert.ok(!s.includes("@"), "snippet contém @, possível e-mail");
});

test("evento de página existe para money e blog, não para o resto", () => {
	assert.match(pageEventSnippet("G-ABC1234567", { pageType: "money", slug: "x" }), /view_service/);
	assert.match(pageEventSnippet("G-ABC1234567", { pageType: "blog_post", slug: "x" }), /blog_view/);
	assert.equal(pageEventSnippet("G-ABC1234567", { pageType: "outro", slug: "x" }), "");
	assert.equal(pageEventSnippet("", { pageType: "money", slug: "x" }), "");
});

test("catálogo de eventos cobre o exigido", () => {
	for (const e of [
		"page_view",
		"view_service",
		"blog_view",
		"whatsapp_click",
		"cta_click",
		"form_start",
		"form_submit",
		"lead",
		"diagnostic_start",
		"diagnostic_complete",
	]) {
		assert.ok(EVENTS.includes(e), `evento ausente do catálogo: ${e}`);
	}
});
