import test from "node:test";
import assert from "node:assert/strict";

import {
	runGates,
	demandGate,
	intentGate,
	cannibalizationGate,
	sourceGate,
	hallucinationGate,
	originalityGate,
	brandGate,
	technicalGate,
	internalLinkGate,
	spamGate,
	extractQuantClaims,
	titleSimilarity,
	thinnessScore,
	LENGTH_REFERENCE,
} from "../src/gates/index.mjs";
import {
	scoreArticle,
	decide,
	weakestDimensions,
	PUBLISH_THRESHOLD,
	REWORK_THRESHOLD,
	MAX_REWORK_CYCLES,
	DIMENSIONS,
} from "../src/gates/quality-score.mjs";

// Fixture realista de artigo informacional completo: estrutura em seções,
// perguntas com resposta direta (bom para GEO), fontes, links internos e
// contribuição original declarada.
//
// A extensão aqui NÃO existe para bater um mínimo de palavras — o gate de spam
// avalia thinness por vários sinais. Ver os testes de thinness no fim do
// arquivo, que provam que um artigo curto e completo passa.
const corpo = (extra = "") => `
## O que é automação de processos com IA?

Automação de processos com IA é a substituição de etapas manuais e repetitivas
por fluxos que rodam sozinhos, com decisão assistida por modelo. Não é o mesmo
que macro de planilha: o sistema lê contexto, escolhe caminho e registra o que
fez, o que permite auditar depois por que cada decisão foi tomada.

A diferença prática aparece no atendimento. Uma macro responde sempre igual.
Um fluxo com modelo lê o histórico do cliente, entende se é dúvida de preço ou
de prazo, e encaminha para o time certo já com o resumo pronto. O ganho não é
só velocidade: é o operador começar a conversa sabendo o contexto.

## Quando automatizar um processo compensa?

Compensa quando a tarefa é repetitiva, tem regra clara e acontece muitas vezes
por semana. Três condições juntas, não uma. Tarefa repetitiva sem regra clara
vira automação que erra sozinha. Regra clara que roda uma vez por mês não paga
o custo de manter o fluxo funcionando.

Não compensa quando o processo ainda muda toda semana. Nesse caso você
automatiza o desenho errado e paga duas vezes: uma para construir, outra para
refazer quando o processo estabilizar. Processo instável primeiro se estabiliza
no papel, depois vira código.

Também não compensa quando a exceção é a regra. Se metade dos casos precisa de
decisão humana, o fluxo automático vira uma camada a mais para o operador
conferir, e o tempo total sobe em vez de cair.

## Automatizar processos repetitivos exige trocar de sistema?

Não necessariamente. Na maior parte dos casos os sistemas que a empresa já usa
têm API ou webhook, e a automação vive entre eles em vez de substituí-los.
Trocar de sistema é uma decisão de outra natureza, com outro custo e outro
risco, e misturar as duas coisas costuma travar o projeto inteiro.

Quando o sistema atual realmente não expõe dados, o caminho mais barato quase
nunca é substituí-lo de imediato. É criar uma camada de integração que leia o
que dá para ler e escreva o que dá para escrever, e só então avaliar a troca com
dados de uso na mão.

## Como a FlowAI conduz na prática

Mapeamos o processo atual antes de escrever qualquer linha de código. Esse
mapeamento não é diagrama bonito: é levantar quantas vezes cada etapa acontece,
quanto tempo consome e onde ela trava hoje. Sem esse número, qualquer promessa
de ganho é chute.

Depois escolhemos o menor trecho que já devolve tempo, colocamos para rodar e
medimos contra o número levantado no mapeamento. Só então ampliamos. Essa ordem
existe porque automação ampla implantada de uma vez é difícil de depurar: quando
algo dá errado, não se sabe qual etapa causou.

Veja como isso funciona em
[automação de processos com IA](/automacao-de-processos-com-ia/) e como os
fluxos conversam entre si em
[agentes de IA para empresas](/agentes-de-ia-para-empresas/).

- Mapeamento do processo atual, com contagem e tempo por etapa
- Escolha do primeiro trecho, sempre o menor que devolve tempo
- Implantação com medição contra a linha de base
- Ampliação gradual, uma etapa por vez
- Revisão trimestral para aposentar o que deixou de fazer sentido

## O que costuma dar errado

O erro mais comum é automatizar o processo que incomoda em vez do que custa. O
que incomoda é visível e irrita todo dia. O que custa costuma ser silencioso e
aparece só quando alguém soma as horas. Priorizar pelo incômodo entrega alívio
imediato e pouco retorno.

O segundo erro é não medir antes. Sem linha de base, qualquer resultado parece
bom, e a empresa perde a chance de descobrir que o fluxo novo devolveu menos do
que custou manter. Medir antes é o que separa automação de despesa recorrente.

${extra}
`.trim();

const base = {
	slug: "automacao-de-processos-guia",
	title: "Automação de processos com IA: quando vale a pena",
	metaDescription:
		"Quando automatizar um processo com inteligência artificial compensa, quando não compensa, e como decidir isso sem achismo na sua operação.",
	primaryKeyword: "automação de processos",
	secondaryKeywords: ["automatizar processos", "processos repetitivos"],
	intent: "informacional",
	cluster: "ia",
	author: "Juliano Damaso",
	publishedAt: "2026-08-20",
	targetMoneyPage: "/automacao-de-processos-com-ia/",
	demandEvidence: { searchVolume: 720, gscImpressions: 1400 },
	originalContribution: [
		"Critério próprio de decisão entre automatizar agora e esperar o processo estabilizar",
		"Exemplo de sequência de implantação em quatro etapas usada nos projetos da FlowAI",
	],
	sources: [
		{ url: "https://example.gov.br/doc", title: "Doc oficial", sourceTier: 2, confidence: "high", evidence: "" },
	],
	body: corpo(),
};

const ctx = {
	corpus: [],
	knownRoutes: [
		"/automacao-de-processos-com-ia/",
		"/agentes-de-ia-para-empresas/",
		"/blog/",
		"/",
	],
	authorizedClients: [],
};

// ─────────────────────────── caso feliz ─────────────────────────────────

test("artigo bem formado passa em todos os 10 gates", () => {
	const r = runGates(base, ctx);
	const falhas = r.failed.map((f) => `${f.id}: ${f.reason}`);
	assert.deepEqual(falhas, [], `gates reprovaram: ${falhas.join(" | ")}`);
	assert.equal(r.passed, true);
	assert.equal(r.results.length, 10);
});

// ─────────────────────────── demanda ────────────────────────────────────

test("demanda: reprova sem evidência", () => {
	assert.equal(demandGate({ ...base, demandEvidence: null }, {}).passed, false);
});

test("demanda: aceita justificativa estratégica explícita", () => {
	const r = demandGate(
		{ ...base, demandEvidence: { strategicJustification: "página de suporte ao lançamento" } },
		{},
	);
	assert.equal(r.passed, true);
	assert.equal(r.detail.basis, "justificativa estratégica");
});

test("demanda: volume abaixo do mínimo reprova", () => {
	const r = demandGate({ ...base, demandEvidence: { searchVolume: 5, gscImpressions: 2 } }, {});
	assert.equal(r.passed, false);
});

// ─────────────────────────── intenção ───────────────────────────────────

test("intenção: reprova ausente ou inválida", () => {
	assert.equal(intentGate({ ...base, intent: null }).passed, false);
	assert.equal(intentGate({ ...base, intent: "chute" }).passed, false);
});

test("intenção: reprova sem keyword principal", () => {
	assert.equal(intentGate({ ...base, primaryKeyword: null }).passed, false);
});

// ─────────────────────────── canibalização ──────────────────────────────

test("canibalização: reprova quando outra página já responde a mesma intenção", () => {
	const r = cannibalizationGate(base, {
		corpus: [
			{ slug: "outro", title: "Outro título", primaryKeyword: "automação de processos", intent: "informacional" },
		],
	});
	assert.equal(r.passed, false);
	assert.equal(r.detail.decision, "UPDATE_EXISTING");
});

test("canibalização: mesma keyword com intenção diferente é permitida", () => {
	const r = cannibalizationGate(base, {
		corpus: [
			{ slug: "outro", title: "Contratar automação", primaryKeyword: "automação de processos", intent: "comercial" },
		],
	});
	assert.equal(r.passed, true);
});

test("canibalização: título quase idêntico sugere MERGE", () => {
	const r = cannibalizationGate(base, {
		corpus: [
			{
				slug: "quase-igual",
				title: "Automação de processos com IA: quando vale mesmo a pena",
				primaryKeyword: "outra coisa",
				intent: "comercial",
			},
		],
	});
	assert.equal(r.passed, false);
	assert.equal(r.detail.decision, "MERGE");
});

test("titleSimilarity mede sobreposição", () => {
	assert.ok(titleSimilarity("automação de processos com IA", "automação de processos usando IA") > 0.7);
	assert.ok(titleSimilarity("gestão de tráfego pago", "desenvolvimento de sistemas") < 0.3);
});

// ─────────────────────────── fontes ─────────────────────────────────────

test("fontes: número no texto sem fonte reprova", () => {
	const a = { ...base, body: base.body + "\n\nO custo caiu 47% no primeiro trimestre.", sources: [] };
	const r = sourceGate(a, {});
	assert.equal(r.passed, false);
	assert.match(r.reason, /sem nenhuma fonte/);
});

test("fontes: texto sem afirmação quantitativa não exige fonte", () => {
	const r = sourceGate({ ...base, sources: [] }, {});
	assert.equal(r.passed, true);
	assert.equal(r.detail.quantClaims, 0);
});

test("fontes: só blog genérico reprova", () => {
	const a = {
		...base,
		body: base.body + "\n\nA adoção cresceu 30% no período.",
		sources: [{ url: "https://blogseo.com/x", sourceTier: 9, confidence: "low" }],
	};
	assert.equal(sourceGate(a, {}).passed, false);
});

test("extractQuantClaims detecta percentual, valor e multiplicador", () => {
	const c = extractQuantClaims("Subiu 40%. Custou R$ 1.200. Ficou 3x mais rápido. Frase normal.");
	assert.equal(c.length, 3);
});

// ─────────────────────────── alucinação ─────────────────────────────────

test("alucinação: número sem lastro na evidência reprova", () => {
	const a = {
		...base,
		body: base.body + "\n\nEmpresas economizam 62% do tempo com isso.",
		sources: [{ url: "https://x.gov.br", sourceTier: 2, confidence: "high", evidence: "texto sem esse numero" }],
	};
	const r = hallucinationGate(a, {});
	assert.equal(r.passed, false);
});

test("alucinação: número presente na evidência passa", () => {
	const a = {
		...base,
		body: base.body + "\n\nEmpresas economizam 62% do tempo com isso.",
		sources: [{ url: "https://x.gov.br", sourceTier: 2, confidence: "high", evidence: "reducao media de 62% no tempo" }],
	};
	assert.equal(hallucinationGate(a, {}).passed, true);
});

test("alucinação: cliente não autorizado reprova", () => {
	const a = { ...base, body: base.body + "\n\nO cliente Acme Corp teve bons resultados." };
	const r = hallucinationGate(a, { authorizedClients: [] });
	assert.equal(r.passed, false);
	assert.match(JSON.stringify(r.detail), /Acme/);
});

test("alucinação: cliente autorizado passa", () => {
	const a = { ...base, body: base.body + "\n\nO cliente MyiPhone teve bons resultados." };
	assert.equal(hallucinationGate(a, { authorizedClients: ["MyiPhone"] }).passed, true);
});

// ─────────────────────────── originalidade ──────────────────────────────

test("originalidade: sem contribuição declarada reprova", () => {
	assert.equal(originalityGate({ ...base, originalContribution: [] }, {}).passed, false);
});

test("originalidade: contribuição vaga reprova", () => {
	assert.equal(originalityGate({ ...base, originalContribution: ["bom"] }, {}).passed, false);
});

test("originalidade: sobreposição alta com a SERP reprova", () => {
	assert.equal(originalityGate(base, { serpOverlapRatio: 0.95 }).passed, false);
});

// ─────────────────────────── marca ──────────────────────────────────────

test("marca: assunto fora do escopo reprova", () => {
	const a = { ...base, title: "Receita de pão caseiro", metaDescription: "Como fazer pão", body: "Misture a farinha e o fermento com água morna e deixe descansar." };
	assert.equal(brandGate(a).passed, false);
});

test("marca: promessa de resultado garantido reprova", () => {
	const a = { ...base, body: base.body + "\n\nTemos resultado garantido para sua empresa." };
	const r = brandGate(a);
	assert.equal(r.passed, false);
	assert.match(r.reason, /promessa/);
});

test("marca: promessa de primeira posição no Google reprova", () => {
	const a = { ...base, body: base.body + "\n\nColocamos você na primeira posição no Google." };
	assert.equal(brandGate(a).passed, false);
});

test("marca: sem money page reprova", () => {
	assert.equal(brandGate({ ...base, targetMoneyPage: null }).passed, false);
});

// ─────────────────────────── técnico ────────────────────────────────────

test("técnico: title longo demais reprova", () => {
	assert.equal(technicalGate({ ...base, title: "x".repeat(80) }).passed, false);
});

test("técnico: metaDescription longa demais reprova", () => {
	assert.equal(technicalGate({ ...base, metaDescription: "x".repeat(200) }).passed, false);
});

test("técnico: publishedAt no futuro reprova", () => {
	assert.equal(technicalGate({ ...base, publishedAt: "2099-01-01" }).passed, false);
});

test("técnico: slug inválido reprova", () => {
	assert.equal(technicalGate({ ...base, slug: "Com Espaço" }).passed, false);
});

// ─────────────────────────── links internos ─────────────────────────────

test("links: não apontar a money page reprova", () => {
	const a = { ...base, body: "## t\n\nTexto sem link nenhum para a money page prevista." };
	assert.equal(internalLinkGate(a, ctx).passed, false);
});

test("links: rota inexistente reprova", () => {
	const a = { ...base, body: base.body + "\n\nVeja [isto](/rota-que-nao-existe/)." };
	const r = internalLinkGate(a, ctx);
	assert.equal(r.passed, false);
	assert.match(r.reason, /inexistente/);
});

test("links: excesso reprova", () => {
	const muitos = Array.from({ length: 30 }, () => "[x](/blog/)").join(" ");
	const a = { ...base, body: base.body + "\n\n" + muitos };
	assert.equal(internalLinkGate(a, ctx).passed, false);
});

// ─────────────────────────── spam ───────────────────────────────────────

test("spam: artigo curto reprova", () => {
	assert.equal(spamGate({ ...base, body: "curto demais" }, {}).passed, false);
});

test("spam: keyword stuffing reprova", () => {
	const stuffed = ("automação de processos ".repeat(60) + "texto ".repeat(300)).trim();
	const r = spamGate({ ...base, body: stuffed }, { minWordCount: 100 });
	assert.equal(r.passed, false);
	assert.match(r.reason, /stuffing/);
});

test("spam: parágrafos repetidos reprovam", () => {
	const p = "Este parágrafo tem tamanho suficiente para ser considerado na checagem de repetição interna do artigo.";
	const r = spamGate({ ...base, body: [p, p, p, p, p].join("\n\n") }, { minWordCount: 50 });
	assert.equal(r.passed, false);
});

// ─────────────────────────── orquestração ───────────────────────────────

test("runGates não para no primeiro erro — reporta todos", () => {
	const ruim = { ...base, intent: null, targetMoneyPage: null, demandEvidence: null };
	const r = runGates(ruim, ctx);
	assert.equal(r.passed, false);
	assert.ok(r.failed.length >= 3, `esperava 3+ falhas, veio ${r.failed.length}`);
	assert.equal(r.results.length, 10);
});

test("runGates captura exceção de gate sem derrubar o pipeline", () => {
	const r = runGates({}, {});
	assert.equal(r.passed, false);
	assert.equal(r.results.length, 10);
});

// ─────────────────────────── quality score ──────────────────────────────

test("pesos das dimensões somam 100", () => {
	assert.equal(DIMENSIONS.reduce((s, d) => s + d.weight, 0), 100);
});

test("score fica entre 0 e 100", () => {
	const s = scoreArticle(base);
	assert.ok(s.total >= 0 && s.total <= 100, `total fora da faixa: ${s.total}`);
	assert.equal(s.breakdown.length, 12);
});

test("artigo bom pontua acima do limiar de retrabalho", () => {
	const s = scoreArticle(base);
	assert.ok(s.total >= REWORK_THRESHOLD, `esperava >= ${REWORK_THRESHOLD}, veio ${s.total}`);
});

test("artigo pobre pontua baixo e vai para HOLD", () => {
	const pobre = {
		slug: "x",
		title: "x",
		metaDescription: "x",
		body: "texto curto",
		intent: null,
		sources: [],
		originalContribution: [],
	};
	const s = scoreArticle(pobre);
	assert.ok(s.total < REWORK_THRESHOLD, `esperava < ${REWORK_THRESHOLD}, veio ${s.total}`);
	assert.equal(s.decision, "HOLD");
});

test("decide respeita os três cortes", () => {
	assert.equal(decide(95), "PUBLISH");
	assert.equal(decide(PUBLISH_THRESHOLD), "PUBLISH");
	assert.equal(decide(88), "REWORK");
	assert.equal(decide(REWORK_THRESHOLD), "REWORK");
	assert.equal(decide(70), "HOLD");
});

test("após 3 retrabalhos vira HOLD — não existe loop infinito", () => {
	assert.equal(decide(88, 0), "REWORK");
	assert.equal(decide(88, 2), "REWORK");
	assert.equal(decide(88, MAX_REWORK_CYCLES), "HOLD");
	assert.equal(decide(88, 99), "HOLD");
});

test("weakestDimensions aponta onde retrabalhar", () => {
	const s = scoreArticle({ ...base, sources: [], originalContribution: [] });
	const fracas = weakestDimensions(s, 3);
	assert.equal(fracas.length, 3);
	assert.ok(fracas[0].lost >= fracas[1].lost);
	assert.ok(fracas.some((d) => d.key === "originalContribution"));
});

test("sem money page derruba brand e conversion relevance", () => {
	const s = scoreArticle({ ...base, targetMoneyPage: null });
	const brand = s.breakdown.find((d) => d.key === "brandRelevance");
	assert.ok(brand.raw < 0.5);
});

// ─────────── thinness: word count deixou de ser hard gate isolado ────────
// O Google não publica mínimo universal de palavras. O corte por extensão é
// heurística interna e só reprova acompanhado de outros sinais fracos.

test("artigo CURTO mas completo passa — 450 palavras não é reprovação", () => {
	const corpoCurto = `
## O que é tracking server-side?

É o envio dos eventos de conversão pelo servidor, em vez do navegador do
visitante. O dado sai da sua infraestrutura direto para a plataforma de
anúncios, sem depender de o navegador permitir o script.

## Quando isso importa?

Importa quando parte das conversões some entre a plataforma e o CRM. Bloqueio
de cookie, bloqueador de anúncio e limitação de navegador derrubam parte dos
eventos enviados pelo lado do cliente. O envio pelo servidor não sofre esses
bloqueios da mesma forma.

## Isso recupera todas as conversões?

Não. Recupera parte. Quem promete atribuição integral está vendendo o que não
existe — sempre haverá perda por consentimento, janela de atribuição e
identificação incompleta. Veja como tratamos isso em
[tracking e analytics](/tracking-e-analytics/).

- Evento sai do servidor, não do navegador
- Menos perda por bloqueio de script
- Exige infraestrutura própria de tagging
${"palavra ".repeat(330)}
`.trim();

	const artigo = {
		...base,
		intent: "informacional",
		body: corpoCurto,
		secondaryKeywords: ["tracking server-side", "conversões"],
		sources: [
			{ url: "https://a.gov.br", sourceTier: 2, confidence: "high", evidence: "" },
			{ url: "https://b.gov.br", sourceTier: 2, confidence: "high", evidence: "" },
		],
		originalContribution: [
			"Explicação de por que a recuperação é parcial, com os três motivos concretos",
			"Critério de quando o custo de infraestrutura de tagging se paga",
		],
		targetMoneyPage: "/tracking-e-analytics/",
	};
	const palavras = artigo.body.split(/\s+/).filter(Boolean).length;
	assert.ok(palavras < 600, `fixture deveria ter menos de 600 palavras, tem ${palavras}`);

	const r = spamGate(artigo, {});
	assert.equal(r.passed, true, `curto mas completo foi reprovado: ${r.reason}`);
});

test("artigo raso reprova por SOMA de sinais, não por extensão isolada", () => {
	const r = spamGate(
		{
			...base,
			intent: "informacional",
			body: "Texto curto sem estrutura nenhuma e sem nada de relevante aqui.",
			secondaryKeywords: ["a", "b"],
			sources: [],
			originalContribution: [],
		},
		{},
	);
	assert.equal(r.passed, false);
	assert.match(r.reason, /conteúdo raso/);
	assert.ok(r.detail.sinaisFracos.length >= 3, "deveria apontar múltiplos sinais fracos");
});

test("thinnessScore usa referência por intenção, não número fixo", () => {
	const corpo = `## T\n\n${"palavra ".repeat(400)}`;
	const transacional = thinnessScore({ intent: "transacional", body: corpo }, {});
	const informacional = thinnessScore({ intent: "informacional", body: corpo }, {});
	assert.equal(transacional.referencia, LENGTH_REFERENCE.transacional);
	assert.equal(informacional.referencia, LENGTH_REFERENCE.informacional);
	// mesma extensão é menos "thin" para intenção objetiva
	assert.ok(
		transacional.score < informacional.score,
		"a referência por intenção não está sendo aplicada",
	);
});

test("keyword stuffing continua reprovando direto — é manipulação", () => {
	const stuffed = ("automação de processos ".repeat(60) + "texto ".repeat(300)).trim();
	const r = spamGate({ ...base, body: stuffed }, {});
	assert.equal(r.passed, false);
	assert.match(r.reason, /stuffing/);
});

test("artigo longo porém vazio não escapa por ser longo", () => {
	const r = spamGate(
		{
			...base,
			intent: "informacional",
			body: "palavra ".repeat(2000),
			secondaryKeywords: ["x", "y"],
			sources: [],
			originalContribution: [],
		},
		{},
	);
	assert.equal(r.passed, false, "2000 palavras sem estrutura, fonte ou contribuição deveria reprovar");
});
