/**
 * Conteúdo real da landing page — extraído do site publicado flowaidigital.com.br
 * e do Manual de Identidade Visual v1.0.
 *
 * REGRA: nada aqui é inventado. Afirmações sem comprovação foram removidas ou
 * reescritas de forma qualitativa (ver CONTEUDO-PENDENTE.md do projeto).
 */

export const HERO = {
  eyebrow: "Marketing · IA · Sistemas sob medida",
  title: "Sua empresa tem marketing.",
  titleAccent: "Falta processo.",
  subtitle:
    "Um squad de agentes de IA para cada etapa do seu comercial — do primeiro contato ao fechamento. Operando todos os dias, com dados reais.",
  ctaPrimary: "Quero parar de perder dinheiro",
  ctaSecondary: "Avaliar minha empresa",
  note: "30 minutos · gratuita · você sai com um plano de ação",
} as const;

/** Os 12 squads do ecossistema — textos originais do site. */
export const SQUADS = [
  { id: "trafego", short: "Tráfego", title: "Tráfego & Campanhas", desc: "Sobem e otimizam campanhas em Meta, Google e YouTube. Sem queimar orçamento." },
  { id: "seo", short: "SEO", title: "SEO & Conteúdo", desc: "Posicionam sua empresa no Google. Blog, keywords, autoridade." },
  { id: "tracking", short: "Tracking", title: "Tracking & Analytics", desc: "Medem cada clique, cada conversão, cada centavo investido." },
  { id: "design", short: "Design", title: "Design & Criativo", desc: "Criam anúncios, artes e páginas que convertem." },
  { id: "copy", short: "Copy", title: "Copywriting & Persuasão", desc: "Escrevem textos que vendem. Anúncios, e-mails, páginas." },
  { id: "social", short: "Social", title: "Social Media", desc: "Gerenciam presença nas redes com estratégia, não com achismo." },
  { id: "email", short: "E-mail", title: "E-mail & Nutrição", desc: "Sequências que aquecem leads frios até virarem clientes." },
  { id: "cro", short: "CRO", title: "CRO & Otimização", desc: "Testam e melhoram cada etapa do funil continuamente." },
  { id: "crm", short: "CRM", title: "Automação & CRM", desc: "Pipeline organizado. Nenhum lead se perde." },
  { id: "sites", short: "Sites", title: "Sites & Landing Pages", desc: "Páginas rápidas, bonitas e que convertem." },
  { id: "vendas", short: "Vendas", title: "Vendas & Fechamento", desc: "Scripts, objeções, follow-up. Do lead ao contrato." },
  { id: "remarketing", short: "Remarketing", title: "Remarketing & Reativação", desc: "Lead frio não é lead perdido. É lead que precisa de outro toque." },
] as const;

export const ECOSYSTEM = {
  eyebrow: "O ecossistema",
  title: "12 squads. Operando juntos como um time.",
  desc: "Cada squad é especializado em uma função do processo comercial. Juntos, operam o ciclo completo — do primeiro contato ao fechamento e à reativação.",
  cta: "Quero esse ecossistema operando",
} as const;

export const PROBLEMS = {
  eyebrow: "O problema",
  title: "Onde sua receita está travando agora.",
  intro:
    "A maioria das empresas investe em marketing. Poucas investem em processo. O resultado:",
  items: [
    "Lead chega e ninguém responde por horas. Ele foi pro concorrente.",
    "Equipe comercial decide no achismo. Sem dado, sem critério.",
    "Ninguém faz follow-up. O lead esfria e some sem uma segunda tentativa.",
    "CRM vazio ou bagunçado. Ninguém sabe onde cada lead está.",
    "Tráfego roda, mas ninguém mede o que converte de verdade.",
    "Remarketing? Não existe. Lead frio é lead esquecido.",
  ],
  cta: "Quero resolver isso agora",
} as const;

export const TRACKING = {
  eyebrow: "O tracking que te engana",
  title: "Seu tracking está",
  titleAccent: "mentindo pra você.",
  intro:
    "Você usa Meta Pixel, GTM, Google Analytics, Stape e Facebook CAPI — e ainda assim os números do Meta Ads não batem com os do Google, que não batem com os do seu CRM. E o pior: você toma decisão em cima desses números.",
  old: {
    label: "O jeito antigo",
    title: "Frankenstein de ferramentas",
    desc: "5 ferramentas diferentes. 5 fontes de verdade. Zero integração real.",
    items: [
      { name: "Meta Pixel", note: "iOS 14.5+ bloqueia parte dos eventos" },
      { name: "Google Tag Manager", note: "Tags quebram e ninguém percebe" },
      { name: "Google Analytics 4", note: "Atribuição por amostragem, dados incompletos" },
      { name: "Stape (server-side)", note: "Cobra por evento, fica caro rapidamente" },
      { name: "Facebook CAPI", note: "Configuração manual, quebra a cada mudança" },
    ],
    result:
      "Exemplo do que acontece: o Meta diz 120 vendas, o Google diz 87, o CRM registra 43. Qual é a verdade?",
  },
  next: {
    label: "O jeito FlowAI",
    title: "Ecossistema de alimentação contínua",
    desc: "Um ciclo único. Os dados fluem, a IA aprende, as campanhas se ajustam.",
    items: [
      { name: "Clique no anúncio", note: "ID único gerado · parâmetros capturados" },
      { name: "Captura server-side", note: "First-party, muito menos sujeita a bloqueio" },
      { name: "IA enriquece o dado", note: "Atribuição multi-touch do clique à venda" },
      { name: "Sincronização unificada", note: "CRM + Meta CAPI + Google Enhanced juntos" },
      { name: "Dashboard ao vivo", note: "Uma única fonte de verdade em tempo real" },
      { name: "IA otimiza a campanha", note: "Budget vai pro que converte · pausa o que não converte" },
      { name: "O ciclo recomeça", note: "cada vez mais inteligente" },
    ],
    result:
      "Um número. Uma verdade — e você sabe qual anúncio trouxe cada venda.",
  },
  honesty:
    "Nenhum tracking é imune a bloqueio. O que fazemos é reduzir a perda ao mínimo técnico possível e deixar explícito o que não dá para medir, em vez de fingir precisão total.",
  question: "Quanto você já perdeu decidindo em cima de dados errados?",
  cta: "Quero parar de jogar dinheiro fora",
} as const;

export const PATH = {
  eyebrow: "Como funciona o rastreamento unificado",
  title: "Do primeiro clique à venda fechada. Cada passo rastreado.",
  steps: [
    { name: "Clique no anúncio", note: "ID único gerado" },
    { name: "Landing page", note: "Sessão rastreada" },
    { name: "Formulário", note: "Lead criado no CRM" },
    { name: "Atendimento", note: "Status em tempo real" },
    { name: "Venda fechada", note: "Origem identificada" },
  ],
} as const;

export const AGENTS = {
  eyebrow: "O diferencial",
  title: "Agentes que conversam entre si",
  intro:
    "Em toda agência tradicional, o time de tráfego não fala com o de vendas. O CRM não fala com o atendimento. Aqui, cada agente alimenta o próximo em tempo real.",
  chain: [
    { from: "Agente de Tráfego", to: "Tracking", msg: "Campanha Meta trouxe os leads de hoje. Melhor criativo identificado." },
    { from: "Agente de Tracking", to: "CRM", msg: "Lead chegou por esse criativo. Perfil qualificado, interesse alto." },
    { from: "Agente de CRM", to: "Atendimento", msg: "Responda esse lead agora. Prioridade alta pelo histórico." },
    { from: "Agente de Atendimento", to: "Vendas", msg: "Objeção de preço detectada. Envia o material de comparação." },
    { from: "Agente de Vendas", to: "Dashboard", msg: "Venda fechada. Tempo do lead até o fechamento registrado." },
    { from: "Agente de Dashboard", to: "Tráfego", msg: "Esse criativo tem o melhor retorno. Aumenta budget e pausa o pior." },
  ],
  note: "Exemplo do fluxo de mensagens entre agentes dentro da operação.",
  cta: "Quero meus agentes conversando assim",
} as const;

export const SOLUTION = {
  eyebrow: "A solução",
  title: "Um ecossistema que opera por você.",
  pillars: [
    {
      title: "Agentes conectados",
      desc: "CRM conversa com tráfego, que conversa com tracking, que conversa com SEO. Um alimenta o outro. Decisões tomadas com o dado do vizinho, não no vácuo.",
    },
    {
      title: "Dados em tempo real",
      desc: "Dashboard ao vivo. Você vê cada lead, cada conversão, cada real investido e retornado — no momento em que acontece. Sem esperar relatório no fim do mês.",
    },
    {
      title: "Sem depender de alguém lembrar",
      desc: "Os agentes operam o mesmo processo, no mesmo padrão, todo dia. Sua equipe foca no que só gente resolve.",
    },
  ],
} as const;

export const METHOD = {
  eyebrow: "Como funciona",
  title: "4 passos. Do zero à operação completa.",
  steps: [
    { n: "01", title: "Call de alinhamento", desc: "Entendemos seu negócio, seus números e onde a receita está travando. 30 minutos, sem compromisso." },
    { n: "02", title: "Diagnóstico", desc: "Analisamos cada ponto: tráfego, CRM, automação, follow-up, remarketing. Você recebe um mapa claro do que falta." },
    { n: "03", title: "Implantação", desc: "Montamos a estrutura completa: agentes configurados, CRM organizado, campanhas rodando, dashboard ao vivo." },
    { n: "04", title: "Operação contínua", desc: "Os agentes operam todos os dias. Você acompanha pelo dashboard. Nós otimizamos todo mês." },
  ],
  cta: "Começar pelo passo 1",
} as const;

export const THIRTY = {
  eyebrow: "Call gratuita",
  title: "O que você ganha em 30 minutos.",
  flow: [
    { title: "Início", desc: "Você agenda a call de alinhamento — 30 minutos, gratuita." },
    { title: "Diagnóstico rápido", desc: "Mapeamos sua operação comercial atual em tempo real." },
    { title: "Mapa de vazamento de receita", desc: "Identificamos onde você está perdendo dinheiro hoje." },
    { title: "Análise do funil atual", desc: "Tráfego → Lead → Atendimento → Venda." },
  ],
  branchNo: { label: "Não faz sentido", title: "Recomendações práticas", desc: "Você sai com um plano — mesmo sem contratar." },
  branchYes: { label: "Faz sentido", title: "Proposta personalizada", desc: "Sob medida para o seu negócio." },
  after: [
    { title: "Implantação", desc: "CRM · Tráfego · Tracking · Follow-up · Dashboard." },
    { title: "Operação contínua", desc: "Os agentes operam. Você acompanha pelo dashboard." },
    { title: "Receita previsível", desc: "Mais vendas · Menos esforço · Crescimento sustentável." },
  ],
  cta: "Agendar minha call gratuita",
} as const;

export const FIT = {
  eyebrow: "Pra quem é",
  title: "Se você se reconhece, a FlowAI é pra você.",
  items: [
    "Você investe em tráfego mas não sabe quanto volta de cada campanha",
    "Você tem leads entrando mas ninguém responde rápido o suficiente",
    "Você depende de uma pessoa pra fazer follow-up (e ela esquece)",
    "Seu CRM está vazio, bagunçado ou ninguém usa",
    "Você não tem dashboard — descobre o resultado no final do mês",
    "Você sabe que precisa de processo mas não sabe por onde começar",
  ],
  cta: "É exatamente o meu caso",
} as const;

/** Clientes informados pelo proprietário. Logos pendentes de envio. */
export const CLIENTS = {
  eyebrow: "Quem já opera com a FlowAI",
  title: "Empresas que colocaram processo pra rodar.",
  items: ["My iPhone", "Abraseg", "Fit de Fato", "Análise Web", "21 Go"],
} as const;

export const FAQ = {
  eyebrow: "Dúvidas",
  title: "Perguntas que todo empresário faz.",
  items: [
    { q: "A FlowAI é uma agência de marketing?", a: "Não. Agência entrega lead. A FlowAI entrega processo comercial completo — do primeiro contato até o fechamento — e também constrói os sistemas que sustentam isso." },
    { q: "Funciona pra qualquer tipo de empresa?", a: "Funciona pra qualquer empresa que depende de gerar oportunidades e convertê-las em vendas. Não importa o segmento." },
    { q: "Quanto tempo pra ver resultado?", a: "A implantação leva de 21 a 30 dias. Os primeiros resultados mensuráveis aparecem nos primeiros 45 dias de operação." },
    { q: "Preciso ter equipe técnica?", a: "Não. Nós implantamos tudo. Você acompanha pelo dashboard." },
    { q: "Os agentes substituem minha equipe?", a: "Não substituem. Complementam. Sua equipe foca no que só humanos fazem. Os agentes cuidam da repetição." },
    { q: "Como acompanho os resultados?", a: "Dashboard ao vivo. Você vê leads, conversões, custo por aquisição e receita no momento em que acontecem." },
    { q: "Tem contrato de fidelidade?", a: "Sem fidelidade. Se não estiver funcionando, você sai quando quiser." },
    { q: "E se eu já tenho CRM e tráfego rodando?", a: "Ótimo. Nós integramos com o que você já tem e adicionamos o que falta. Não jogamos fora o que funciona." },
  ],
} as const;

export const FINALE = {
  title: "Cada dia sem processo é receita perdida.",
  desc: "Seus leads estão entrando agora. A pergunta é: quem está respondendo?",
  cta: "Quero parar de perder dinheiro",
  note: "30 minutos · gratuita · sem compromisso",
} as const;
