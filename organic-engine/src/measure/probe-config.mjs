// O que perguntar aos modelos para medir visibilidade.
//
// São perguntas de COMPRADOR, não da marca. Perguntar "o que é a FlowAI"
// mediria memorização, não descoberta: o modelo já tem o nome no prompt. O que
// interessa é se a FlowAI aparece quando alguém descreve o problema dela sem
// saber que a FlowAI existe.
//
// Sobre comparar modelos entre si: as taxas de citação variam até 46× entre
// plataformas — ChatGPT cita marca em ~0,59% das respostas, Perplexity em
// ~13%. Comparar o número absoluto de dois modelos não diz nada. O que vale é
// a série de cada modelo contra ele mesmo ao longo do tempo.

export const TARGET = {
	brand: "FlowAI",
	domain: "flowaidigital.com.br",
	// Preenchido quando houver concorrente confirmado no SERP. Lista inventada
	// produziria share of voice ficcional.
	competitors: [],
};

export const PROBE_QUERIES = [
	"qual agência usa agentes de IA para organizar a operação comercial de uma empresa",
	"como automatizar atendimento e vendas de uma empresa com inteligência artificial",
	"quem implementa agentes de IA integrados a CRM e tráfego pago no Brasil",
	"agência de inteligência artificial no Rio de Janeiro para empresas",
	"como parar de perder lead por demora no atendimento usando IA",
	"empresa que faz automação comercial com IA e dashboard em tempo real",
	"qual a diferença entre agência de marketing tradicional e agência de IA",
	"como medir de verdade o retorno do tráfego pago com tracking próprio",
];

/**
 * Modelos COM acesso a busca — é isso que caracteriza motor generativo. Modelo
 * sem busca responde da memória de treino e mede outra coisa: se a marca estava
 * no corpus, não se ela é encontrável hoje.
 *
 * Os IDs foram conferidos contra o catálogo do OpenRouter. A primeira versão
 * deste arquivo trazia `openai/gpt-4o-search-preview` e
 * `anthropic/claude-3.5-sonnet`, e NENHUM DOS DOIS existe lá — as chamadas
 * voltavam 404. O sufixo `:online` liga busca em qualquer modelo do catálogo;
 * os `perplexity/sonar*` já nascem com busca.
 */
export const PROBE_MODELS = [
	"perplexity/sonar",
	"openai/gpt-5.6-terra:online",
	"anthropic/claude-sonnet-5:online",
];
