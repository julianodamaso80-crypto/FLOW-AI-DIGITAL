/**
 * Estrutura de dados do quiz de diagnóstico.
 * O fluxo muda conforme a necessidade principal escolhida (ramos).
 *
 * Conteúdo migrado verbatim do site-v8 (site-v8/src/components/quiz/quizData.ts) —
 * mesmas perguntas, mesmos ramos, mesma lógica de classificação.
 */

export const MAIN_CHALLENGES = [
  { id: "oportunidades", label: "Preciso gerar mais oportunidades", branch: "marketing" },
  { id: "vendas", label: "Preciso melhorar minhas vendas", branch: "marketing" },
  { id: "organizar-marketing", label: "Preciso organizar meu marketing", branch: "marketing" },
  { id: "automatizar-atendimento", label: "Preciso automatizar atendimento e follow-up", branch: "ia" },
  { id: "automatizar-processos", label: "Preciso automatizar processos internos", branch: "ia" },
  { id: "crm", label: "Preciso organizar ou substituir meu CRM", branch: "sistema" },
  { id: "integrar", label: "Preciso integrar ferramentas e sistemas", branch: "sistema" },
  { id: "sistema", label: "Preciso desenvolver um sistema personalizado", branch: "sistema" },
  { id: "saas", label: "Preciso criar um SaaS ou produto digital", branch: "sistema" },
  { id: "site-google", label: "Preciso melhorar meu site e minha presença no Google", branch: "marketing" },
  { id: "transformacao", label: "Preciso de uma transformação completa", branch: "completo" },
  { id: "outro", label: "Outro", branch: "completo" },
] as const;

export type Branch = "marketing" | "ia" | "sistema" | "completo";

export interface QuizQuestion {
  id: string;
  label: string;
  type: "options" | "multi" | "text";
  options?: string[];
  optional?: boolean;
  placeholder?: string;
}

const DONT_KNOW = "Ainda não sei";
const TALK_LATER = "Prefiro conversar sobre isso";

/** Perguntas de perfil, comuns a todos os ramos. */
export const PROFILE_QUESTIONS: QuizQuestion[] = [
  {
    id: "segmento",
    label: "Qual é o segmento da empresa?",
    type: "text",
    placeholder: "Ex.: clínica, indústria, serviços B2B, e-commerce…",
  },
  {
    id: "pessoas",
    label: "Quantas pessoas trabalham na empresa?",
    type: "options",
    options: ["Só eu", "2 a 5", "6 a 20", "21 a 50", "51 a 200", "Mais de 200"],
  },
  {
    id: "comercial",
    label: "Quantas pessoas fazem parte do comercial?",
    type: "options",
    options: ["Nenhuma dedicada", "1 a 2", "3 a 5", "6 a 15", "Mais de 15"],
  },
  {
    id: "modelo",
    label: "A empresa atende B2B, B2C ou os dois?",
    type: "options",
    options: ["B2B (empresas)", "B2C (consumidor final)", "Os dois"],
  },
];

/** Ramos específicos. */
export const BRANCH_QUESTIONS: Record<Branch, QuizQuestion[]> = {
  marketing: [
    {
      id: "canais",
      label: "Quais canais sua empresa usa hoje?",
      type: "multi",
      options: ["Meta Ads (Instagram/Facebook)", "Google Ads", "SEO / blog", "Redes sociais orgânicas", "Indicações", "Nenhum canal ativo", DONT_KNOW],
    },
    {
      id: "investimento-midia",
      label: "Quanto é investido por mês em mídia paga?",
      type: "options",
      options: ["Ainda não invisto", "Até R$ 3 mil", "R$ 3 mil a R$ 10 mil", "R$ 10 mil a R$ 30 mil", "Acima de R$ 30 mil", TALK_LATER],
    },
    {
      id: "leads-mes",
      label: "Quantos leads chegam por mês, aproximadamente?",
      type: "options",
      options: ["Quase nenhum", "Até 30", "30 a 100", "100 a 500", "Mais de 500", DONT_KNOW],
    },
    {
      id: "custo-lead",
      label: "Você sabe quanto custa um lead e quanto custa uma venda?",
      type: "options",
      options: ["Sei os dois", "Sei só o custo por lead", "Não sei nenhum dos dois", DONT_KNOW],
    },
    {
      id: "tempo-resposta",
      label: "Quando um lead chega, em quanto tempo alguém responde?",
      type: "options",
      options: ["Em minutos", "Em algumas horas", "No mesmo dia", "Pode levar dias", "Muitos ficam sem resposta", DONT_KNOW],
    },
    {
      id: "followup",
      label: "Existe follow-up estruturado com quem não responde?",
      type: "options",
      options: ["Sim, com cadência definida", "Depende do vendedor", "Não existe", DONT_KNOW],
    },
    {
      id: "objetivo-marketing",
      label: "Qual é o principal objetivo agora?",
      type: "options",
      options: ["Aumentar volume de leads", "Melhorar a qualidade dos leads", "Converter mais os leads atuais", "Reduzir custo de aquisição", "Estruturar tudo do zero", TALK_LATER],
    },
  ],
  ia: [
    {
      id: "tarefa-automatizar",
      label: "Qual tarefa você mais precisa automatizar?",
      type: "text",
      placeholder: "Ex.: responder WhatsApp, qualificar leads, emitir cobranças…",
    },
    {
      id: "frequencia",
      label: "Com que frequência essa tarefa acontece?",
      type: "options",
      options: ["Várias vezes por dia", "Todos os dias", "Algumas vezes por semana", "Algumas vezes por mês", DONT_KNOW],
    },
    {
      id: "tempo-gasto",
      label: "Quanto tempo da equipe essa tarefa consome?",
      type: "options",
      options: ["Poucas horas por semana", "Algumas horas por dia", "Uma pessoa quase dedicada", "Mais de uma pessoa dedicada", DONT_KNOW],
    },
    {
      id: "envolve",
      label: "O processo envolve o quê?",
      type: "multi",
      options: ["WhatsApp", "E-mail", "Documentos e arquivos", "Planilhas", "CRM ou sistema interno", "Dados confidenciais", DONT_KNOW],
    },
    {
      id: "aprovacao",
      label: "Alguma etapa precisa de aprovação humana?",
      type: "options",
      options: ["Sim, em pontos críticos", "Não, pode ser 100% automática", DONT_KNOW, TALK_LATER],
    },
    {
      id: "resultado-esperado",
      label: "Qual resultado operacional você espera?",
      type: "options",
      options: ["Responder clientes mais rápido", "Liberar tempo da equipe", "Reduzir erros e retrabalho", "Organizar informações", "Tudo isso junto", TALK_LATER],
    },
  ],
  sistema: [
    {
      id: "problema-sistema",
      label: "Qual problema o sistema deve resolver?",
      type: "text",
      placeholder: "Descreva em uma frase o que precisa funcionar melhor…",
    },
    {
      id: "usuarios",
      label: "Quem vai usar o sistema?",
      type: "multi",
      options: ["Equipe interna", "Clientes", "Parceiros/fornecedores", "Só a gestão", DONT_KNOW],
    },
    {
      id: "qtd-usuarios",
      label: "Quantos usuários são esperados?",
      type: "options",
      options: ["Até 5", "5 a 20", "20 a 100", "Mais de 100", DONT_KNOW],
    },
    {
      id: "sistema-atual",
      label: "Existe um sistema hoje?",
      type: "options",
      options: ["Sim, e precisa ser substituído", "Sim, e pode ser integrado", "Só planilhas", "Nada estruturado", DONT_KNOW],
    },
    {
      id: "modulos",
      label: "O que o sistema precisa ter?",
      type: "multi",
      options: ["Painel administrativo", "Funcionar no navegador", "Aplicativo", "Integração com pagamentos", "Integração com WhatsApp", "Integração com outras APIs", DONT_KNOW],
    },
    {
      id: "documentacao",
      label: "Já existe documentação ou protótipo?",
      type: "options",
      options: ["Sim, documentado", "Só rascunhos e ideias", "Nada ainda", TALK_LATER],
    },
    {
      id: "mvp-completo",
      label: "O projeto é um MVP ou um sistema completo?",
      type: "options",
      options: ["MVP para validar", "Sistema completo", DONT_KNOW, TALK_LATER],
    },
  ],
  completo: [
    {
      id: "areas-dor",
      label: "Quais áreas mais doem hoje?",
      type: "multi",
      options: ["Marketing e geração de demanda", "Atendimento", "Comercial e vendas", "Processos internos", "Sistemas e ferramentas", "Dados e relatórios", "Equipe sobrecarregada", DONT_KNOW],
    },
    {
      id: "maior-perda",
      label: "Onde você sente que a empresa mais perde hoje?",
      type: "options",
      options: ["Leads sem atendimento", "Tarefas manuais demais", "Falta de dados para decidir", "Ferramentas que não conversam", "Time sem processo claro", TALK_LATER],
    },
    {
      id: "ferramentas",
      label: "Quais ferramentas a empresa usa hoje?",
      type: "text",
      optional: true,
      placeholder: "Ex.: RD Station, Pipedrive, planilhas, sistema próprio…",
    },
    {
      id: "prioridade-area",
      label: "Se pudesse resolver uma coisa primeiro, qual seria?",
      type: "options",
      options: ["Gerar mais receita", "Organizar a operação", "Automatizar o repetitivo", "Ter dados confiáveis", TALK_LATER],
    },
  ],
};

/** Perguntas finais, comuns a todos. */
export const FINAL_QUESTIONS: QuizQuestion[] = [
  {
    id: "estrutura",
    label: "O que sua empresa já tem hoje?",
    type: "multi",
    options: ["Site", "CRM", "Tráfego pago ativo", "Tracking configurado", "Equipe de marketing", "Nenhum desses"],
  },
  {
    id: "prazo",
    label: "Quando você pretende iniciar?",
    type: "options",
    options: ["Imediatamente", "Nos próximos 30 dias", "Em 1 a 3 meses", "Ainda estou avaliando", TALK_LATER],
  },
  {
    id: "investimento",
    label: "Qual faixa de investimento está sendo considerada?",
    type: "options",
    options: ["Até R$ 2 mil/mês", "R$ 2 mil a R$ 5 mil/mês", "R$ 5 mil a R$ 15 mil/mês", "Acima de R$ 15 mil/mês", "Projeto fechado (valor único)", DONT_KNOW, TALK_LATER],
  },
  {
    id: "horario",
    label: "Qual o melhor horário para contato?",
    type: "options",
    options: ["Manhã", "Tarde", "Fim do dia", "Qualquer horário"],
  },
];

export const CLASSIFICATIONS: Record<string, { title: string; desc: string; next: string }> = {
  marketing: {
    title: "Marketing e aquisição",
    desc: "Seu principal ganho está em estruturar a geração e a conversão de oportunidades: canais, páginas, tracking e integração com o comercial.",
    next: "Analisar seus canais atuais e desenhar a estrutura de aquisição e medição.",
  },
  ia: {
    title: "IA e automação",
    desc: "Sua operação tem tarefas repetitivas em volume que podem ser automatizadas com IA — liberando a equipe para o que exige gente.",
    next: "Mapear o processo escolhido e desenhar a automação com pontos de supervisão humana.",
  },
  sistema: {
    title: "Sistema personalizado",
    desc: "Seu processo pede software construído sob medida — seja um sistema novo, um CRM adequado ao seu funil ou integrações entre as ferramentas atuais.",
    next: "Mapear o processo e desenhar a arquitetura da solução, com fases e escopo claros.",
  },
  completo: {
    title: "Estrutura completa FlowAI",
    desc: "Os gargalos aparecem em mais de uma frente — o caminho é um plano integrado: marketing, automação e sistemas evoluindo em fases coordenadas.",
    next: "Fazer uma análise da operação completa para priorizar as frentes por impacto.",
  },
};
