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
		// "domínios que aparecem no Google Brasil" e NÃO "domínios brasileiros":
		// a amostra da primeira execução trouxe youtube.com, lenovo.com e ibm.com.
		// Chamar isso de brasileiro seria imprecisão fácil de desmentir, e um
		// estudo desmentido custa mais do que a citação que ele traria.
		`Medição de ${date}: ${a.n} domínios que rankeiam no ${engine} para "${query}".`,
		a.excluded ? `${a.excluded} site(s) fora do ar foram excluídos do cálculo.` : null,
		`${a.blockedPct}% bloqueiam crawlers de busca generativa por completo.`,
		`${a.emptyShellPct}% respondem HTTP 200 mas entregam menos de ${MIN_WORDS_REAL_CONTENT} palavras ao crawler — casca de aplicação sem conteúdo renderizado.`,
		`${a.okPct}% entregam conteúdo real.`,
		`${a.schemaPct}% declaram entidade em JSON-LD e ${a.faqPct}% publicam FAQ estruturado.`,
	]
		.filter(Boolean)
		.join(" ");
}

/**
 * User-agent da medição.
 *
 * Medir com UA de navegador não responde a pergunta nenhuma. O objeto do estudo
 * é o que o site entrega para um crawler de busca generativa — e vários sites
 * tratam esse UA de forma diferente da que tratam o Chrome.
 *
 * OAI-SearchBot é o crawler de RESPOSTA da OpenAI (o que alimenta citação), não
 * o GPTBot de treino. É o agente cujo acesso realmente importa medir.
 */
export const PROBE_UA =
	"Mozilla/5.0 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)";

const contaPalavras = (html) =>
	String(html ?? "")
		.replace(/<script[\s\S]*?<\/script>/gi, " ")
		.replace(/<style[\s\S]*?<\/style>/gi, " ")
		.replace(/<[^>]*>/g, " ")
		.split(/\s+/)
		.filter(Boolean).length;

/** Mede a home de cada domínio. Uma falha vira ERROR e não derruba o estudo. */
export async function measureDomains(domains = [], { fetchImpl = globalThis.fetch, timeoutMs = 20_000 } = {}) {
	const out = [];
	for (const domain of domains) {
		const url = `https://${domain}/`;
		try {
			const ctrl = new AbortController();
			const t = setTimeout(() => ctrl.abort(), timeoutMs);
			const res = await fetchImpl(url, {
				headers: { "User-Agent": PROBE_UA, Accept: "text/html" },
				redirect: "follow",
				signal: ctrl.signal,
			});
			clearTimeout(t);
			const html = await res.text();
			out.push({
				domain,
				...classifySite({
					status: res.status,
					words: contaPalavras(html),
					hasSchema: /application\/ld\+json/i.test(html),
					hasFaq: /"@type"\s*:\s*"FAQPage"/i.test(html),
				}),
			});
		} catch (err) {
			out.push({ domain, verdict: "ERROR", reachable: false, error: err.message });
		}
	}
	return out;
}
