// Estudo de prontidão para busca generativa no mercado brasileiro.
//
// O guia do Google (15/05/2026) diz que a única barra que subiu é conteúdo
// não-commodity de primeira mão. E ~84% das citações de IA vêm de fontes de
// terceiros. As duas coisas apontam para o mesmo lugar: dado próprio é o que
// resolve originalidade E o que atrai citação de terceiro.
//
// Este módulo produz esse dado. Mede, em sites brasileiros reais, quantos
// bloqueiam crawler de IA, quantos devolvem 200 com casca vazia e quantos
// declaram entidade. É reprodutível: roda de novo em 90 dias e vira série.
//
// HONESTIDADE METODOLÓGICA É REQUISITO, NÃO ENFEITE.
// Um estudo com amostra obscura ou porcentagem arredondada para ficar bonita
// destrói mais reputação do que a citação constrói. Por isso:
//   - a amostra é rastreável (a query que a formou vai no relatório);
//   - site fora do ar sai do denominador em vez de virar "bloqueio";
//   - o próprio domínio fica fora da amostra;
//   - nada é arredondado para número redondo.

/** Abaixo disto, a página respondeu mas não entregou conteúdo. */
export const MIN_WORDS_REAL_CONTENT = 100;

const semWww = (h) => String(h ?? "").toLowerCase().replace(/^www\./, "");

/** Domínios únicos de um SERP, na ordem em que aparecem. */
export function domainsFromSerp(results = [], { exclude = [] } = {}) {
	const fora = new Set(exclude.map(semWww));
	const vistos = new Set();
	const out = [];
	for (const r of results) {
		let host;
		try {
			host = semWww(new URL(r.url).hostname);
		} catch {
			continue; // URL quebrada não derruba a amostragem
		}
		if (fora.has(host) || vistos.has(host)) continue;
		vistos.add(host);
		out.push(host);
	}
	return out;
}

/**
 * Classifica um site medido.
 *
 * A distinção que dá sentido ao estudo inteiro: **200 não é sucesso**. Uma SPA
 * sem prerender responde 200 e entrega sete palavras ao crawler. É o estado do
 * próprio flowaidigital.com.br hoje — foi medindo isso que o problema apareceu.
 */
export function classifySite({ status, words = 0, hasSchema = false, hasFaq = false } = {}) {
	const base = { status, words, hasSchema, hasFaq };
	if (status === 403 || status === 401) {
		return { ...base, verdict: "BLOCKED", reachable: false };
	}
	if (status >= 500 || !status) {
		return { ...base, verdict: "ERROR", reachable: false };
	}
	if (status >= 400) {
		return { ...base, verdict: "ERROR", reachable: false };
	}
	if (words < MIN_WORDS_REAL_CONTENT) {
		return { ...base, verdict: "EMPTY_SHELL", reachable: true };
	}
	return { ...base, verdict: "OK", reachable: true };
}

const pct = (parte, total) => (total === 0 ? 0 : Math.round((parte / total) * 1000) / 10);

/** Estatísticas da amostra. Site com erro sai do denominador e é registrado. */
export function aggregate(sites = []) {
	const medidos = sites.filter((s) => s.verdict !== "ERROR");
	const n = medidos.length;
	const conta = (v) => medidos.filter((s) => s.verdict === v).length;
	return {
		n,
		excluded: sites.length - n,
		blockedPct: pct(conta("BLOCKED"), n),
		emptyShellPct: pct(conta("EMPTY_SHELL"), n),
		okPct: pct(conta("OK"), n),
		schemaPct: pct(medidos.filter((s) => s.hasSchema).length, n),
		faqPct: pct(medidos.filter((s) => s.hasFaq).length, n),
	};
}

/**
 * Texto do achado, pronto para virar parágrafo citável.
 *
 * Declara n, data e como a amostra foi formada. Sem esses três, o número não é
 * citável — é asserção, e asserção não sobrevive a checagem.
 */
export function formatFindings(a, { date, query, engine = "Google Brasil" } = {}) {
	return [
		`Medição de ${date}: ${a.n} domínios brasileiros que aparecem no ${engine} para "${query}".`,
		a.excluded ? `${a.excluded} site(s) fora do ar foram excluídos do cálculo.` : null,
		`${a.blockedPct}% bloqueiam crawlers de busca generativa por completo.`,
		`${a.emptyShellPct}% respondem HTTP 200 mas entregam menos de ${MIN_WORDS_REAL_CONTENT} palavras ao crawler — casca de aplicação sem conteúdo renderizado.`,
		`${a.okPct}% entregam conteúdo real.`,
		`${a.schemaPct}% declaram entidade em JSON-LD e ${a.faqPct}% publicam FAQ estruturado.`,
	]
		.filter(Boolean)
		.join(" ");
}
