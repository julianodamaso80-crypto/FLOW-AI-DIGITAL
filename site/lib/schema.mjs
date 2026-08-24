// Dados estruturados. Portado de redesign-v8:site-v8/src/lib/schema.ts.
//
// Política herdada do MAPA-SEO.md e do CONTEUDO-PENDENTE.md, mantida aqui:
//   - apenas informações verdadeiras e confirmadas;
//   - sem LocalBusiness (endereço físico não publicado);
//   - sem AggregateRating, sem review, sem Offer, sem preço;
//   - sameAs só com perfil confirmado.

import { SITE_NAME, SITE_URL, WHATSAPP_DISPLAY, confirmedProfiles } from "./site.mjs";

export function organizationSchema() {
	const sameAs = confirmedProfiles();
	const org = {
		"@context": "https://schema.org",
		"@type": "Organization",
		"@id": `${SITE_URL}/#organization`,
		name: SITE_NAME,
		url: `${SITE_URL}/`,
		logo: `${SITE_URL}/images/brand/flowai-logo.png`,
		description:
			"A FlowAI Digital integra marketing digital, inteligência artificial, automação e desenvolvimento de sistemas personalizados para empresas.",
		areaServed: "BR",
		contactPoint: {
			"@type": "ContactPoint",
			contactType: "sales",
			telephone: `+55 ${WHATSAPP_DISPLAY}`,
			availableLanguage: "Portuguese",
		},
	};
	// Chave ausente é melhor que array vazio — array vazio é ruído no grafo.
	if (sameAs.length > 0) org.sameAs = sameAs;
	return org;
}

export function websiteSchema() {
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		"@id": `${SITE_URL}/#website`,
		url: `${SITE_URL}/`,
		name: SITE_NAME,
		inLanguage: "pt-BR",
		publisher: { "@id": `${SITE_URL}/#organization` },
	};
}

export function serviceSchema({ name, description, path }) {
	return {
		"@context": "https://schema.org",
		"@type": "Service",
		name,
		description,
		url: `${SITE_URL}${path}`,
		provider: { "@id": `${SITE_URL}/#organization` },
		areaServed: "BR",
		serviceType: name,
	};
}

export function breadcrumbSchema(items) {
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items.map((item, i) => ({
			"@type": "ListItem",
			position: i + 1,
			name: item.name,
			item: `${SITE_URL}${item.path}`,
		})),
	};
}

/**
 * FAQPage. Regra do prompt: o schema tem que corresponder EXATAMENTE ao que
 * está visível na página. Por isso o gerador passa a mesma lista que renderiza.
 * Não prometemos rich result — o valor aqui é semântico.
 */
export function faqSchema(items) {
	return {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: items.map((item) => ({
			"@type": "Question",
			name: item.q,
			acceptedAnswer: { "@type": "Answer", text: item.a },
		})),
	};
}

export function articleSchema({
	headline,
	description,
	path,
	datePublished,
	dateModified,
	authorName,
	image,
}) {
	const a = {
		"@context": "https://schema.org",
		"@type": "BlogPosting",
		headline,
		description,
		url: `${SITE_URL}${path}`,
		mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}${path}` },
		datePublished,
		dateModified: dateModified || datePublished,
		// referência por @id: o nó completo do autor é emitido uma vez na página
		author: { "@type": "Person", "@id": personId(authorName), name: authorName },
		publisher: { "@id": `${SITE_URL}/#organization` },
		inLanguage: "pt-BR",
	};
	if (image) a.image = `${SITE_URL}${image}`;
	return a;
}


// ── Autor como entidade ─────────────────────────────────────────────────
//
// Autor como string ("author": "Fulano") não é entidade: a máquina não
// consegue ligar o mesmo autor entre dois artigos, nem saber que ele trabalha
// na organização que assina o site. Com `@id` estável, consegue.

const slugify = (s) =>
	String(s ?? "")
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");

export function personId(name) {
	return `${SITE_URL}/#person-${slugify(name)}`;
}

export function personSchema({ name, jobTitle, sameAs } = {}) {
	const p = {
		"@context": "https://schema.org",
		"@type": "Person",
		"@id": personId(name),
		name,
		worksFor: { "@id": `${SITE_URL}/#organization` },
	};
	if (jobTitle) p.jobTitle = jobTitle;
	// Perfil externo inventado é pior que ausente: aponta para outra pessoa.
	if (Array.isArray(sameAs) && sameAs.length > 0) p.sameAs = sameAs;
	return p;
}

// ── Negócio local ───────────────────────────────────────────────────────
//
// O guia do Google manda usar Google Business Profile para negócio local, e a
// FlowAI atende do Rio. Este nó SUBSTITUI o Organization na página onde é
// usado — nunca convive com ele. Mesmo `@id` de propósito: `ProfessionalService`
// é subtipo de `LocalBusiness`, que é subtipo de `Organization`, então é a
// MESMA entidade, mais específica.
//
// Sem `streetAddress`: endereço de rua inventado é dado falso em markup, e o
// Google cruza isso com o Business Profile.

export function localBusinessSchema() {
	const org = organizationSchema();
	return {
		...org,
		"@type": "ProfessionalService",
		address: {
			"@type": "PostalAddress",
			addressLocality: "Rio de Janeiro",
			addressRegion: "RJ",
			addressCountry: "BR",
		},
	};
}

/** Serializa com escape de `<` para não fechar o <script> por engano. */
export function jsonLd(...objects) {
	return objects
		.map(
			(o) =>
				`<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`,
		)
		.join("\n");
}
