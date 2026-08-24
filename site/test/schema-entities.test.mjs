// Grafo de entidades.
//
// O guia oficial do Google (15/05/2026) é explícito: structured data NÃO é
// requisito para IA generativa. Então isto não é aposta em markup mágico — é
// desambiguação. Um `Article` ligado a um `Person` que está ligado a uma
// `Organization` diz à máquina QUEM afirma o quê. Blocos JSON-LD soltos, sem
// `@id`, não dizem.
//
// O que já existia: Organization, WebSite, Service, Breadcrumb, FAQ, Article.
// O que faltava e este arquivo cobre:
//   - o autor como ENTIDADE (`Person` com `@id`), não string solta;
//   - o vínculo autor -> organização;
//   - `LocalBusiness`, porque a FlowAI atende do Rio e o próprio guia do Google
//     manda usar Google Business Profile para negócio local.

import test from "node:test";
import assert from "node:assert/strict";
import {
	personSchema,
	localBusinessSchema,
	articleSchema,
	organizationSchema,
} from "../lib/schema.mjs";
import { SITE_URL } from "../lib/site.mjs";

// ── autor como entidade ──────────────────────────────────────────────────

test("o autor tem @id próprio e estável", () => {
	const p = personSchema({ name: "Juliano Damaso" });
	assert.equal(p["@type"], "Person");
	assert.match(p["@id"], new RegExp(`^${SITE_URL}/#`), "@id precisa ancorar no domínio");
	assert.equal(personSchema({ name: "Juliano Damaso" })["@id"], p["@id"], "@id instável entre chamadas");
});

test("autores diferentes têm @id diferentes", () => {
	assert.notEqual(personSchema({ name: "Juliano Damaso" })["@id"], personSchema({ name: "Outra Pessoa" })["@id"]);
});

test("o autor aponta para a organização", () => {
	const p = personSchema({ name: "Juliano Damaso" });
	assert.equal(p.worksFor["@id"], organizationSchema()["@id"], "autor solto no grafo");
});

test("perfil externo só entra quando confirmado", () => {
	// sameAs inventado é pior que sameAs ausente: aponta para entidade errada
	assert.equal(personSchema({ name: "X" }).sameAs, undefined);
	const comPerfil = personSchema({ name: "X", sameAs: ["https://www.linkedin.com/in/exemplo/"] });
	assert.deepEqual(comPerfil.sameAs, ["https://www.linkedin.com/in/exemplo/"]);
});

test("o artigo referencia o autor por @id, não repete o objeto", () => {
	const a = articleSchema({
		headline: "T",
		description: "D",
		path: "/blog/x/",
		datePublished: "2026-08-01",
		authorName: "Juliano Damaso",
	});
	assert.equal(a.author["@id"], personSchema({ name: "Juliano Damaso" })["@id"]);
	assert.equal(a.author["@type"], "Person");
});

// ── negócio local ────────────────────────────────────────────────────────

test("LocalBusiness declara a praça real, sem inventar endereço", () => {
	const b = localBusinessSchema();
	assert.match(b["@type"], /LocalBusiness|ProfessionalService/);
	assert.equal(b.address.addressLocality, "Rio de Janeiro");
	assert.equal(b.address.addressRegion, "RJ");
	assert.equal(b.address.addressCountry, "BR");
	assert.equal(b.address.streetAddress, undefined, "endereço de rua inventado");
});

test("LocalBusiness é a mesma entidade da Organization, não uma segunda", () => {
	// duas organizações no mesmo grafo é exatamente o que @id existe para evitar
	assert.equal(localBusinessSchema()["@id"], organizationSchema()["@id"]);
});

test("nenhum schema carrega preço — regra dura do projeto", () => {
	const tudo = JSON.stringify([organizationSchema(), localBusinessSchema(), personSchema({ name: "X" })]);
	assert.ok(!/priceRange|"price"|offers/.test(tudo), "vazou preço no markup");
});
