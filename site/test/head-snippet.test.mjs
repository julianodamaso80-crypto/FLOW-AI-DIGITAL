// O que entra no <head> da home.
//
// A home não passa pelo gerador de páginas: ela vem da SPA e recebe apenas o
// que o prerender injeta. Foi assim que ela ficou de fora do GA4 — 14 de 15
// páginas mediam, e justamente a mais visitada não media.
//
// Este teste existe para que qualquer coisa nova no <head> das money pages
// tenha que ser conscientemente incluída (ou excluída) da home também.

import test from "node:test";
import assert from "node:assert/strict";
import { headSnippetFor } from "../prerender.mjs";

test("sem Measurement ID a home sai sem analytics, e isso é intencional", async () => {
	const s = await headSnippetFor({});
	assert.ok(!/gtag/.test(s), "injetou analytics sem ID configurado");
	assert.match(s, /Organization|ProfessionalService/, "perdeu o JSON-LD");
});

test("com Measurement ID a home mede como as outras páginas", async () => {
	const s = await headSnippetFor({ GA4_MEASUREMENT_ID: "G-2KMYBL1CPE" });
	assert.match(s, /gtag\/js\?id=G-2KMYBL1CPE/, "home sem GA4 — a página mais visitada não mediria");
	assert.match(s, /ProfessionalService|Organization/, "GA4 entrou mas o JSON-LD saiu");
});

test("ID malformado não vira tag — nunca inventamos ID", async () => {
	assert.ok(!/gtag/.test(await headSnippetFor({ GA4_MEASUREMENT_ID: "SEM-FORMATO" })));
});

test("a home é marcada como page_type home", async () => {
	const s = await headSnippetFor({ GA4_MEASUREMENT_ID: "G-2KMYBL1CPE" });
	assert.match(s, /"page_type":"home"/);
});
