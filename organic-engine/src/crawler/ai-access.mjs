// Verificação de acesso dos crawlers.
//
// Automatiza a sondagem que revelou o 403 nos bots de IA. Roda como job e
// grava em ai_crawler_checks, para que uma regressão na borda (alguém religar
// o bloqueio no Cloudflare) apareça sozinha em vez de ser descoberta meses
// depois pela queda de citações.
//
// Política (corrigida pelo dono):
//   - OAI-SearchBot e ChatGPT-User: busca do ChatGPT      -> ALLOW
//   - Claude-SearchBot e Claude-User: busca do Claude     -> ALLOW
//   - PerplexityBot e Perplexity-User                     -> ALLOW
//   - Googlebot e Bingbot                                 -> ALLOW
//   - GPTBot e ClaudeBot: treinamento                     -> DENY (intencional)
//   - Google-Extended: NÃO é requisito de AI Overviews    -> DENY (intencional)

export const CRAWLERS = [
	{
		name: "Googlebot",
		expected: "allow",
		ua: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
		purpose: "busca tradicional + AI Overviews (usa o índice normal)",
	},
	{
		name: "Bingbot",
		expected: "allow",
		ua: "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
		purpose: "busca tradicional",
	},
	{
		name: "OAI-SearchBot",
		expected: "allow",
		ua: "Mozilla/5.0 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)",
		purpose: "descoberta e citação no ChatGPT Search",
	},
	{
		name: "ChatGPT-User",
		expected: "allow",
		ua: "Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)",
		purpose: "busca do ChatGPT a pedido do usuário",
	},
	{
		name: "Claude-SearchBot",
		expected: "allow",
		ua: "Mozilla/5.0 (compatible; Claude-SearchBot/1.0; +claudebot@anthropic.com)",
		purpose: "busca do Claude",
	},
	{
		name: "Claude-User",
		expected: "allow",
		ua: "Mozilla/5.0 (compatible; Claude-User/1.0; +claudebot@anthropic.com)",
		purpose: "acesso do Claude a pedido do usuário",
	},
	{
		name: "PerplexityBot",
		expected: "allow",
		ua: "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
		purpose: "indexação do Perplexity",
	},
	{
		name: "Perplexity-User",
		expected: "allow",
		ua: "Mozilla/5.0 (compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)",
		purpose: "acesso do Perplexity a pedido do usuário",
	},
	{
		name: "GPTBot",
		expected: "deny",
		ua: "Mozilla/5.0 (compatible; GPTBot/1.1; +https://openai.com/gptbot)",
		purpose: "treinamento de modelo — bloqueio intencional",
	},
	{
		name: "ClaudeBot",
		expected: "deny",
		ua: "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
		purpose: "treinamento de modelo — bloqueio intencional",
	},
];

/**
 * Tokens que NÃO são crawlers com user-agent próprio: existem só como
 * diretiva no robots.txt. Testá-los por UA dá falso resultado — o Googlebot é
 * quem busca a página, e o token apenas informa que uso é permitido depois.
 * Por isso são verificados lendo o robots.txt, não por requisição.
 */
export const ROBOTS_ONLY_TOKENS = [
	{
		name: "Google-Extended",
		expected: "disallow",
		purpose: "usos de IA do Google além da Busca — não afeta Search nem AI Overviews",
	},
	{
		name: "Applebot-Extended",
		expected: "disallow",
		purpose: "treinamento da Apple",
	},
];

/** Lê o robots.txt e confere as diretivas dos tokens acima. */
export async function checkRobotsTokens(robotsUrl, { fetchImpl = globalThis.fetch, tokens = ROBOTS_ONLY_TOKENS } = {}) {
	const res = await fetchImpl(robotsUrl);
	const txt = await res.text();
	return tokens.map((t) => {
		// bloco "User-agent: X" seguido da primeira diretiva Allow/Disallow
		const re = new RegExp(`User-agent:\\s*${t.name}\\s*\\n(?:[^\\n]*\\n)*?\\s*(Allow|Disallow):\\s*(\\S*)`, "i");
		const m = txt.match(re);
		const directive = m ? `${m[1].toLowerCase()}` : null;
		const passed = t.expected === "disallow" ? directive === "disallow" : directive === "allow";
		return {
			token: t.name,
			expected: t.expected,
			found: directive ?? "ausente",
			purpose: t.purpose,
			passed,
			reason: passed ? null : `esperado ${t.expected}, robots.txt diz "${directive ?? "nada"}"`,
		};
	});
}

/** Extrai os sinais de SEO que provam que o bot recebeu conteúdo de verdade. */
export function inspectHtml(html) {
	const text = String(html ?? "");
	const h1 = text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
	const canonical = text.match(/rel="canonical"\s+href="([^"]+)"/i);
	const title = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
	const visible = text
		.replace(/<script[\s\S]*?<\/script>/gi, "")
		.replace(/<style[\s\S]*?<\/style>/gi, "")
		.replace(/<[^>]*>/g, " ");
	return {
		hasH1: Boolean(h1),
		h1: h1 ? h1[1].replace(/<[^>]*>/g, "").trim() : null,
		hasCanonical: Boolean(canonical),
		canonical: canonical ? canonical[1] : null,
		title: title ? title[1].trim() : null,
		wordCount: visible.split(/\s+/).filter(Boolean).length,
	};
}

/**
 * Um resultado passa quando o comportamento bate com o esperado:
 *   allow -> 2xx COM conteúdo (não adianta 200 devolvendo casca vazia)
 *   deny  -> 401/403, ou robots negando
 */
export function evaluate(check) {
	const { expected, statusCode, wordCount } = check;
	if (expected === "allow") {
		const ok = statusCode >= 200 && statusCode < 300;
		if (!ok) return { passed: false, reason: `esperado acesso, veio HTTP ${statusCode}` };
		if ((wordCount ?? 0) < 100) {
			return { passed: false, reason: `HTTP ${statusCode} mas só ${wordCount} palavras — casca sem conteúdo` };
		}
		return { passed: true, reason: null };
	}
	const blocked = statusCode === 403 || statusCode === 401 || statusCode === 429;
	return blocked
		? { passed: true, reason: null }
		: { passed: false, reason: `esperado bloqueio, veio HTTP ${statusCode}` };
}

/** Roda a matriz inteira contra uma URL. `fetchImpl` injetável para teste. */
export async function checkAllCrawlers(url, { fetchImpl = globalThis.fetch, timeoutMs = 20_000, crawlers = CRAWLERS } = {}) {
	const results = [];
	for (const c of crawlers) {
		const started = Date.now();
		try {
			const ctrl = new AbortController();
			const t = setTimeout(() => ctrl.abort(), timeoutMs);
			let res;
			try {
				res = await fetchImpl(url, { headers: { "User-Agent": c.ua }, signal: ctrl.signal });
			} finally {
				clearTimeout(t);
			}
			const html = await res.text();
			const info = inspectHtml(html);
			const check = {
				crawler: c.name,
				userAgent: c.ua,
				url,
				expected: c.expected,
				purpose: c.purpose,
				statusCode: res.status,
				bytes: html.length,
				...info,
				elapsedMs: Date.now() - started,
			};
			const verdict = evaluate(check);
			results.push({ ...check, passed: verdict.passed, reason: verdict.reason });
		} catch (err) {
			results.push({
				crawler: c.name,
				userAgent: c.ua,
				url,
				expected: c.expected,
				statusCode: null,
				bytes: 0,
				hasH1: false,
				hasCanonical: false,
				wordCount: 0,
				passed: false,
				reason: `falha de rede: ${err.message}`,
			});
		}
	}
	return {
		url,
		checkedAt: new Date().toISOString(),
		results,
		passed: results.every((r) => r.passed),
		failures: results.filter((r) => !r.passed),
	};
}

/** Tabela legível para terminal e relatório. */
export function formatMatrix(report) {
	const head = `${"CRAWLER".padEnd(18)} ${"ESPERADO".padEnd(9)} ${"HTTP".padEnd(6)} ${"PALAVRAS".padEnd(9)} RESULTADO`;
	const rows = report.results.map((r) => {
		const status = r.passed ? "ok" : `FALHOU — ${r.reason}`;
		return `${r.crawler.padEnd(18)} ${r.expected.padEnd(9)} ${String(r.statusCode ?? "-").padEnd(6)} ${String(r.wordCount ?? 0).padEnd(9)} ${status}`;
	});
	return [head, "-".repeat(head.length), ...rows].join("\n");
}
