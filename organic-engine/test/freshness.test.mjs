// Ciclo de frescor.
//
// Conteúdo atualizado nos últimos 30 dias recebe 3,2× mais citações de motor
// generativo que conteúdo com mais de 90 dias. O sistema tinha `dateModified`
// no schema e nenhum mecanismo que decidisse O QUE atualizar e QUANDO.
//
// Armadilha que este módulo evita por construção: "atualizar" trocando só a
// data é a versão SEO do cheque sem fundo. `dateModified` só avança quando o
// conteúdo muda de verdade — por isso a decisão carrega o hash do corpo.

import test from "node:test";
import assert from "node:assert/strict";
import {
	contentHash,
	ageInDays,
	decayScore,
	planRefresh,
	nextDateModified,
	FRESH_DAYS,
	STALE_DAYS,
} from "../src/content/freshness.mjs";

const HOJE = new Date("2026-08-24T12:00:00Z");
const dias = (n) => new Date(HOJE.getTime() - n * 86_400_000).toISOString();

// ── idade e decaimento ───────────────────────────────────────────────────

test("idade é contada a partir da última modificação, não da publicação", () => {
	const a = { publishedAt: dias(400), dateModified: dias(10) };
	assert.equal(ageInDays(a, HOJE), 10);
});

test("sem dateModified, cai para a data de publicação", () => {
	assert.equal(ageInDays({ publishedAt: dias(45) }, HOJE), 45);
});

test("artigo dentro da janela fresca não decai", () => {
	assert.equal(decayScore({ publishedAt: dias(FRESH_DAYS - 1) }, HOJE), 0);
});

test("decaimento cresce com a idade e satura em 1", () => {
	const novo = decayScore({ publishedAt: dias(45) }, HOJE);
	const velho = decayScore({ publishedAt: dias(200) }, HOJE);
	assert.ok(novo > 0 && novo < 1, `decaimento intermediário inesperado: ${novo}`);
	assert.ok(velho > novo);
	assert.equal(decayScore({ publishedAt: dias(3650) }, HOJE), 1);
});

// ── priorização ──────────────────────────────────────────────────────────

test("prioriza o artigo que mais perde tráfego, não o mais velho", () => {
	// um post antigo e irrelevante não vale o custo de reescrita
	const corpus = [
		{ slug: "velho-irrelevante", publishedAt: dias(300), gscClicks: 1 },
		{ slug: "maduro-forte", publishedAt: dias(120), gscClicks: 800 },
	];
	const plano = planRefresh(corpus, { now: HOJE });
	assert.equal(plano[0].slug, "maduro-forte");
});

test("artigo fresco não entra no plano", () => {
	const plano = planRefresh([{ slug: "novo", publishedAt: dias(5), gscClicks: 500 }], { now: HOJE });
	assert.equal(plano.length, 0);
});

test("o plano respeita o limite de itens por rodada", () => {
	const corpus = Array.from({ length: 20 }, (_, i) => ({
		slug: `p${i}`,
		publishedAt: dias(200),
		gscClicks: 100 + i,
	}));
	assert.equal(planRefresh(corpus, { now: HOJE, limit: 3 }).length, 3);
});

test("cada item do plano diz por que foi escolhido", () => {
	const plano = planRefresh([{ slug: "x", publishedAt: dias(150), gscClicks: 400 }], { now: HOJE });
	assert.ok(plano[0].reason.length > 10, "sem justificativa auditável");
	assert.equal(plano[0].ageDays, 150);
});

// ── honestidade do dateModified ──────────────────────────────────────────

test("dateModified NÃO avança se o conteúdo não mudou", () => {
	const antes = { body: "texto igual", dateModified: dias(200), contentHash: contentHash("texto igual") };
	const depois = nextDateModified(antes, "texto igual", HOJE);
	assert.equal(depois.dateModified, antes.dateModified, "data avançou sem mudança de conteúdo");
	assert.equal(depois.changed, false);
});

test("dateModified avança quando o corpo muda", () => {
	const antes = { body: "texto antigo", dateModified: dias(200), contentHash: contentHash("texto antigo") };
	const depois = nextDateModified(antes, "texto novo e diferente", HOJE);
	assert.equal(depois.dateModified, HOJE.toISOString());
	assert.equal(depois.changed, true);
});

test("mudança só de espaço em branco não conta como atualização", () => {
	const antes = { body: "um dois", dateModified: dias(200), contentHash: contentHash("um dois") };
	assert.equal(nextDateModified(antes, "um   dois\n\n", HOJE).changed, false);
});

test("hash é estável e sensível ao conteúdo", () => {
	assert.equal(contentHash("a b"), contentHash("a  b"), "espaço mudou o hash");
	assert.notEqual(contentHash("a b"), contentHash("a c"));
});

test("as janelas são as da evidência: 30 e 90 dias", () => {
	assert.equal(FRESH_DAYS, 30);
	assert.equal(STALE_DAYS, 90);
});
