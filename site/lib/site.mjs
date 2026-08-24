// Constantes centrais do site. Fonte única — nada de número ou URL solta nos
// templates. Portado de redesign-v8:site-v8/src/lib/site.ts.

export const SITE_URL = "https://flowaidigital.com.br";
export const SITE_NAME = "FlowAI Digital";

/** Número comercial oficial. Nunca usar o antigo 5521980214882. */
export const WHATSAPP_NUMBER = "5521992208062";
export const WHATSAPP_DISPLAY = "(21) 99220-8062";

/**
 * Perfis oficiais para `sameAs`. Só entra aqui o que estiver CONFIRMADO.
 * O Instagram vinha de site-v9/src/lib/site.ts, mas CONTEUDO-PENDENTE.md
 * registra que o handle ainda precisa de confirmação do dono — por isso
 * `confirmed: false` e ele NÃO é emitido no schema até ser confirmado.
 */
export const PROFILES = [
	{
		url: "https://www.instagram.com/flowaidigital",
		confirmed: false,
		note: "handle assumido no redesign; confirmar com o dono antes de publicar em sameAs",
	},
];

/** Só os confirmados viram sameAs. */
export function confirmedProfiles() {
	return PROFILES.filter((p) => p.confirmed).map((p) => p.url);
}

export const WA_MESSAGES = {
	default:
		"Olá! Conheci a FlowAI pelo site e quero entender qual solução é mais adequada para minha empresa.",
	marketing:
		"Olá! Quero conversar sobre marketing digital para a minha empresa.",
	ia: "Olá! Quero entender como aplicar inteligência artificial na minha operação.",
	sistemas:
		"Olá! Quero conversar sobre o desenvolvimento de um sistema personalizado para minha empresa.",
};

export function buildWaLink(context = "default") {
	const msg = WA_MESSAGES[context] ?? WA_MESSAGES.default;
	return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

/** Garante barra final e prefixo — o site usa trailing slash em tudo. */
export function canonicalFor(path) {
	let p = path.startsWith("/") ? path : `/${path}`;
	if (!p.endsWith("/")) p += "/";
	return `${SITE_URL}${p}`;
}

// ── IndexNow ────────────────────────────────────────────────────────────
//
// O índice do Bing ainda alimenta parte das citações do ChatGPT, e IndexNow
// avisa Bing e parceiros em minutos em vez de esperar rastreamento. O Google
// não usa — descobre por sitemap — então isto cobre o outro lado, não substitui.
//
// A chave é PÚBLICA por desenho: o protocolo prova posse do host servindo o
// próprio valor em /{chave}.txt. O que ela impede é terceiro submeter URL em
// nome do host.

/** 8 a 128 caracteres hexadecimais, como o protocolo exige. */
export function isValidIndexNowKey(key) {
	return /^[a-f0-9]{8,128}$/i.test(String(key ?? ""));
}

/** Arquivo de verificação, ou null quando não há chave — nunca inventamos uma. */
export function indexNowKeyFile(key) {
	if (!isValidIndexNowKey(key)) return null;
	const k = String(key);
	return { name: `${k}.txt`, content: k };
}
