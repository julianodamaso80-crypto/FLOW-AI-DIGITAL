// Os títulos das money pages têm que carregar o termo que as pessoas realmente
// buscam.
//
// O erro que este arquivo trava: qualificar demais o título. "CRM
// personalizado" tem 40 buscas/mês; "sistema de CRM", 8.100 — e é intenção
// COMERCIAL, quem compara fornecedor. "Agentes de IA para empresas" tem 70;
// "agente de IA", 8.100. "Chatbot com IA para WhatsApp" tem 140; "chatbot
// WhatsApp", 6.600.
//
// Em todos os casos o padrão é o mesmo: o qualificador que deixa o título mais
// preciso derruba o volume em duas ordens de grandeza. O recorte continua no
// corpo da página; o título captura o termo genérico.
//
// Volumes medidos no DataForSEO (Google Ads search volume, Brasil, pt).

import test from "node:test";
import assert from "node:assert/strict";
import { SERVICES } from "../content/services.mjs";

/** slug -> { termo que o título precisa conter, volume/mês medido } */
const ALVOS = {
	"crm-personalizado-e-automacao-de-vendas": { termo: "sistema de crm", volume: 8100 },
	"agentes-de-ia-para-empresas": { termo: "agente de ia", volume: 8100 },
	"chatbot-com-ia-para-whatsapp": { termo: "chatbot whatsapp", volume: 6600 },
	"tracking-e-analytics": { termo: "dashboard de vendas", volume: 1000 },
	"agencia-de-marketing-digital": { termo: "agencia de marketing digital", volume: 8100 },
	"automacao-de-processos-com-ia": { termo: "automacao de processos", volume: 1000 },
	"integracoes-de-sistemas-e-apis": { termo: "integracao de sistemas", volume: 590 },
};

const norm = (s) =>
	String(s ?? "")
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase();

const bySlug = Object.fromEntries(SERVICES.map((s) => [s.slug, s]));

for (const [slug, { termo, volume }] of Object.entries(ALVOS)) {
	test(`"${slug}" carrega o termo de ${volume} buscas/mês no title`, () => {
		const s = bySlug[slug];
		assert.ok(s, `money page ${slug} sumiu`);
		assert.ok(
			norm(s.metaTitle).includes(norm(termo)),
			`title não contém "${termo}" (${volume}/mês): "${s.metaTitle}"`,
		);
	});

	test(`"${slug}" repete o termo no H1`, () => {
		const s = bySlug[slug];
		assert.ok(
			norm(s.h1).includes(norm(termo)),
			`H1 não contém "${termo}": "${s.h1}"`,
		);
	});
}

test("nenhum title passa de 60 caracteres", () => {
	// acima disso o Google trunca e o termo do fim se perde
	for (const s of SERVICES) {
		assert.ok(s.metaTitle.length <= 60, `${s.slug}: ${s.metaTitle.length} caracteres — "${s.metaTitle}"`);
	}
});

test("os títulos continuam únicos entre si", () => {
	const vistos = new Set();
	for (const s of SERVICES) {
		assert.ok(!vistos.has(s.metaTitle), `title duplicado: "${s.metaTitle}"`);
		vistos.add(s.metaTitle);
	}
});

test("nenhum título quebra as regras de marca", () => {
	const proibidas = /revolucion|disruptiv|inovador|potencializ|alavanc|sinergia|paradigma|melhores do mercado|l[ií]der de mercado/i;
	for (const s of SERVICES) {
		assert.ok(!proibidas.test(s.metaTitle), `palavra proibida em "${s.metaTitle}"`);
		assert.ok(!proibidas.test(s.h1), `palavra proibida em "${s.h1}"`);
		assert.ok(!/R\$|preço|preco|a partir de/i.test(s.metaTitle + s.h1), `preço no título de ${s.slug}`);
	}
});
