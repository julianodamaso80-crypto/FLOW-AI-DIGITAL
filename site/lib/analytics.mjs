// GA4.
//
// Duas regras que o snippet garante por construção:
//   1. Sem ID real configurado, NADA é injetado. Nunca criamos ID fictício.
//   2. Nenhum PII sai daqui. O link do WhatsApp carrega texto da mensagem;
//      o evento envia só a página e o contexto, jamais telefone, e-mail ou nome.

/** Eventos do requisito 29. Os de venda entram quando houver CRM integrado. */
export const EVENTS = [
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
];

/** Chaves proibidas em qualquer payload — a checagem roda em teste. */
export const PII_KEYS = [
	"email",
	"e_mail",
	"mail",
	"phone",
	"telefone",
	"whatsapp_number",
	"nome",
	"name",
	"full_name",
	"cpf",
	"cnpj",
	"address",
	"endereco",
];

/** Remove qualquer chave sensível antes de enviar. */
export function sanitizeParams(params = {}) {
	const out = {};
	for (const [k, v] of Object.entries(params)) {
		const key = String(k).toLowerCase();
		if (PII_KEYS.some((p) => key === p || key.includes(p))) continue;
		if (typeof v === "string" && (v.includes("@") || /\d{8,}/.test(v.replace(/\D/g, "")))) continue;
		out[k] = v;
	}
	return out;
}

/**
 * Snippet do GA4. `measurementId` vem de GA4_MEASUREMENT_ID no build.
 * Sem ele, devolve string vazia — a página sai sem analytics, de propósito.
 */
export function ga4Snippet(measurementId, { pageType = null, pageSlug = null } = {}) {
	if (!measurementId || !/^G-[A-Z0-9]{6,}$/i.test(measurementId)) return "";

	const extra = sanitizeParams({ page_type: pageType, page_slug: pageSlug });
	const params = JSON.stringify(extra);

	return `<script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}', Object.assign({ anonymize_ip: true }, ${params}));

// Cliques de WhatsApp e CTA. Só contexto de página — nunca dado pessoal.
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('a');
  if (!a || !a.href) return;
  if (a.href.indexOf('wa.me') > -1 || a.href.indexOf('api.whatsapp.com') > -1) {
    gtag('event', 'whatsapp_click', {
      page_path: location.pathname,
      link_position: a.className || 'inline'
    });
    return;
  }
  if (a.classList && a.classList.contains('btn')) {
    gtag('event', 'cta_click', {
      page_path: location.pathname,
      cta_text: (a.textContent || '').trim().slice(0, 60)
    });
  }
}, { passive: true });
</script>`;
}

/** Evento específico por tipo de página, disparado no load. */
export function pageEventSnippet(measurementId, { pageType, slug }) {
	if (!measurementId) return "";
	const map = { money: "view_service", blog_post: "blog_view" };
	const evt = map[pageType];
	if (!evt) return "";
	const payload = JSON.stringify(sanitizeParams({ page_path: `/${slug}/`, page_type: pageType }));
	return `<script>window.gtag && gtag('event', '${evt}', ${payload});</script>`;
}
