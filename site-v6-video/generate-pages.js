#!/usr/bin/env node
/**
 * FlowAI Digital — Page Generator
 * Generates all internal pages + 50 blog posts
 * Run: node generate-pages.js
 */

const fs = require('fs');
const path = require('path');

const SITE_DIR = __dirname;
const DOMAIN = 'https://flowaidigital.com.br';

// ══════════════════════════════════════════════════════════════
// NAV HTML (shared across all pages)
// ══════════════════════════════════════════════════════════════
function nav(currentPage) {
  return `<nav id="nav" class="scrolled">
  <div class="nav__inner">
    <a href="/" class="nav__logo">
      <span class="nav__logo-dot" aria-hidden="true"></span>
      Flow<span style="color:var(--green)">AI</span>
    </a>
    <div class="nav__links">
      <a href="/#solucao">Solução</a>
      <a href="/#como-funciona">Como Funciona</a>
      <a href="/#agentes">Agentes</a>
      <a href="/casos/">Casos</a>
      <a href="/blog/" ${currentPage === 'blog' ? 'style="color:var(--green)"' : ''}>Blog</a>
      <a href="/sobre/">Sobre</a>
      <a href="/diagnostico-de-receita/" class="btn btn--primary" style="padding:10px 18px;font-size:0.82rem">Diagnóstico Gratuito</a>
    </div>
  </div>
</nav>`;
}

// ══════════════════════════════════════════════════════════════
// FOOTER HTML
// ══════════════════════════════════════════════════════════════
function footer() {
  return `<footer>
  <div class="container">
    <div class="footer__inner">
      <div class="footer__logo">Flow<span>AI</span> Digital</div>
      <p class="footer__copy">© 2026 FlowAI Digital. Todos os direitos reservados. Rio de Janeiro, RJ.</p>
      <div class="footer__links">
        <a href="/sobre/">Sobre</a>
        <a href="/blog/">Blog</a>
        <a href="/casos/">Casos</a>
        <a href="/clinicas-odontologicas/">Odonto</a>
        <a href="/clinicas-esteticas/">Estética</a>
        <a href="/imobiliarias/">Imobiliárias</a>
      </div>
    </div>
  </div>
</footer>`;
}

// ══════════════════════════════════════════════════════════════
// PAGE TEMPLATE
// ══════════════════════════════════════════════════════════════
function pageHTML({ title, metaDesc, canonical, schema, breadcrumbs, body, currentPage, ogImage }) {
  const bc = breadcrumbs.map((b, i) => i < breadcrumbs.length - 1
    ? `<a href="${b.url}">${b.name}</a><span class="breadcrumb__sep">›</span>`
    : `<span>${b.name}</span>`
  ).join('');

  const bcSchema = {
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((b, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": b.name,
      "item": b.url ? `${DOMAIN}${b.url}` : undefined
    }))
  };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#080c12">
  <title>${title}</title>
  <meta name="description" content="${metaDesc}">
  <link rel="canonical" href="${DOMAIN}${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="FlowAI Digital">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${metaDesc}">
  <meta property="og:url" content="${DOMAIN}${canonical}">
  <meta property="og:locale" content="pt_BR">${ogImage ? `\n  <meta property="og:image" content="${ogImage}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${metaDesc}">${ogImage ? `\n  <meta name="twitter:image" content="${ogImage}">` : ''}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/styles.css">
  <link rel="stylesheet" href="/css/pages.css">
  <script type="application/ld+json">
  ${JSON.stringify([schema, bcSchema], null, 2)}
  </script>
</head>
<body>
${nav(currentPage)}

<main>
  <div class="breadcrumb container">${bc}</div>
${body}
</main>

${footer()}
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════
// CLUSTER CONFIG
// ══════════════════════════════════════════════════════════════
const CLUSTERS = {
  odonto: { label: 'Clínicas Odontológicas', css: 'odonto', color: '#00e5a0' },
  estetica: { label: 'Clínicas Estéticas', css: 'estetica', color: '#a78bfa' },
  imobiliaria: { label: 'Imobiliárias', css: 'imobiliaria', color: '#fbbf24' },
  'engenharia-vendas': { label: 'Engenharia de Vendas', css: 'engenharia', color: '#60a5fa' },
  'ia-automacao': { label: 'IA & Automação', css: 'ia', color: '#f472b6' }
};

// ══════════════════════════════════════════════════════════════
// IMAGE BANK — unique Unsplash images per post (no repeats)
// ══════════════════════════════════════════════════════════════
const IMAGES = {
  // ── ODONTO (15) ──
  'processo-comercial-clinica-odontologica': 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1200&h=630&fit=crop&q=80',
  'como-converter-leads-em-pacientes': 'https://images.unsplash.com/photo-1606811842243-af7e16970c1f?w=1200&h=630&fit=crop&q=80',
  'funil-de-vendas-clinica-odontologica': 'https://images.unsplash.com/photo-1542744095-0d53267d353e?w=1200&h=630&fit=crop&q=80',
  'como-reduzir-no-show-clinica-odontologica': 'https://images.unsplash.com/photo-1591174425156-fd472f354be4?w=1200&h=630&fit=crop&q=80',
  'remarketing-para-clinicas-odontologicas': 'https://images.unsplash.com/photo-1581521911838-451ec295edf3?w=1200&h=630&fit=crop&q=80',
  'crm-para-clinica-odontologica': 'https://images.unsplash.com/photo-1643660526741-094639fbe53a?w=1200&h=630&fit=crop&q=80',
  'captacao-de-pacientes-odontologia': 'https://images.unsplash.com/photo-1560181275-a65519fd0ec1?w=1200&h=630&fit=crop&q=80',
  'como-aumentar-faturamento-clinica-odontologica': 'https://images.unsplash.com/photo-1728342057908-7f6c4a3262f8?w=1200&h=630&fit=crop&q=80',
  'scripts-de-vendas-clinica-odontologica': 'https://images.unsplash.com/photo-1556741533-6e6a62bd8b49?w=1200&h=630&fit=crop&q=80',
  'follow-up-automatico-clinica-odontologica': 'https://images.unsplash.com/photo-1653566031535-bcf33e1c2893?w=1200&h=630&fit=crop&q=80',
  'taxa-de-conversao-clinica-odontologica': 'https://images.unsplash.com/photo-1606811811225-10635e4c9a39?w=1200&h=630&fit=crop&q=80',
  'marketing-digital-clinica-odontologica-que-funciona': 'https://images.unsplash.com/photo-1633675254245-efd890d087b8?w=1200&h=630&fit=crop&q=80',
  'por-que-clinica-odontologica-perde-pacientes': 'https://images.unsplash.com/photo-1588398071967-cca88cd3240b?w=1200&h=630&fit=crop&q=80',
  'quanto-custa-captar-paciente-clinica-odontologica': 'https://images.unsplash.com/photo-1619691249147-c5689d88016b?w=1200&h=630&fit=crop&q=80',
  'whatsapp-para-clinica-odontologica': 'https://images.unsplash.com/photo-1611746872915-64382b5c76da?w=1200&h=630&fit=crop&q=80',
  'agente-ia-clinica-odontologica': 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=630&fit=crop&q=80',
  // ── ESTÉTICA (10) ──
  'processo-comercial-clinica-estetica': 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200&h=630&fit=crop&q=80',
  'como-vender-procedimentos-esteticos': 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=1200&h=630&fit=crop&q=80',
  'captacao-pacientes-clinica-estetica': 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=1200&h=630&fit=crop&q=80',
  'crm-para-clinica-estetica': 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&h=630&fit=crop&q=80',
  'remarketing-clinica-estetica': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&h=630&fit=crop&q=80',
  'funil-de-vendas-estetica': 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=1200&h=630&fit=crop&q=80',
  'como-reduzir-cancelamentos-clinica-estetica': 'https://images.unsplash.com/photo-1629909615032-72afb4e5610c?w=1200&h=630&fit=crop&q=80',
  'scripts-vendas-procedimentos-esteticos': 'https://images.unsplash.com/photo-1519824145371-296894a0daa9?w=1200&h=630&fit=crop&q=80',
  'taxa-conversao-clinica-estetica': 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=1200&h=630&fit=crop&q=80',
  'follow-up-clinica-estetica': 'https://images.unsplash.com/photo-1540555700478-4be289fbec6d?w=1200&h=630&fit=crop&q=80',
  // ── IMOBILIÁRIA (10) ──
  'processo-comercial-imobiliaria': 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&h=630&fit=crop&q=80',
  'como-converter-leads-imobiliarios': 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=630&fit=crop&q=80',
  'crm-para-imobiliarias': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=630&fit=crop&q=80',
  'funil-de-vendas-imobiliaria': 'https://images.unsplash.com/photo-1582407947092-740aaa0bfbda?w=1200&h=630&fit=crop&q=80',
  'follow-up-automatico-imobiliaria': 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=1200&h=630&fit=crop&q=80',
  'como-qualificar-leads-imobiliarios': 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=1200&h=630&fit=crop&q=80',
  'remarketing-para-imobiliarias': 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&h=630&fit=crop&q=80',
  'scripts-vendas-corretores': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=630&fit=crop&q=80',
  'taxa-conversao-imobiliaria': 'https://images.unsplash.com/photo-1460317442991-0ec209397118?w=1200&h=630&fit=crop&q=80',
  'automacao-vendas-imobiliaria': 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=1200&h=630&fit=crop&q=80',
  // ── ENGENHARIA DE VENDAS (10) ──
  'o-que-e-engenharia-de-vendas': 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=630&fit=crop&q=80',
  'engenharia-de-receita-o-que-e': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=630&fit=crop&q=80',
  'como-montar-processo-comercial-do-zero': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=630&fit=crop&q=80',
  'diferenca-marketing-engenharia-vendas': 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=1200&h=630&fit=crop&q=80',
  'por-que-sua-empresa-perde-leads': 'https://images.unsplash.com/photo-1590402494587-44b71d7772f6?w=1200&h=630&fit=crop&q=80',
  'como-medir-roi-processo-comercial': 'https://images.unsplash.com/photo-1543286386-713bdd548da4?w=1200&h=630&fit=crop&q=80',
  'funil-vendas-b2c-guia-completo': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=630&fit=crop&q=80',
  'como-criar-scripts-vendas-eficientes': 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200&h=630&fit=crop&q=80',
  'follow-up-automatico-guia-completo': 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=1200&h=630&fit=crop&q=80',
  'como-aumentar-taxa-de-conversao': 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1200&h=630&fit=crop&q=80',
  // ── IA E AUTOMAÇÃO (5) ──
  'agentes-ia-para-vendas': 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&h=630&fit=crop&q=80',
  'automacao-comercial-inteligencia-artificial': 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&h=630&fit=crop&q=80',
  'chatbot-vs-agente-ia-diferenca': 'https://images.unsplash.com/photo-1531746790095-6c46f1dee3c6?w=1200&h=630&fit=crop&q=80',
  'como-ia-melhora-processo-comercial': 'https://images.unsplash.com/photo-1555255707-c07966088b7b?w=1200&h=630&fit=crop&q=80',
  'futuro-automacao-vendas-ia': 'https://images.unsplash.com/photo-1636690513351-0af1763f6237?w=1200&h=630&fit=crop&q=80',
  // ── INTERNAL PAGES ──
  'page-clinicas-odontologicas': 'https://images.unsplash.com/photo-1629909615184-74f495363b67?w=1200&h=630&fit=crop&q=80',
  'page-clinicas-esteticas': 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200&h=630&fit=crop&q=80',
  'page-imobiliarias': 'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=1200&h=630&fit=crop&q=80',
  'page-sobre': 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=630&fit=crop&q=80',
  'page-diagnostico': 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200&h=630&fit=crop&q=80',
  'page-casos': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=630&fit=crop&q=80',
  'page-blog': 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=1200&h=630&fit=crop&q=80',
};

// ══════════════════════════════════════════════════════════════
// 50 BLOG POSTS DATA
// ══════════════════════════════════════════════════════════════
const BLOG_POSTS = [
  // ── CLUSTER ODONTO (15) ──
  { slug: "processo-comercial-clinica-odontologica", title: "Processo Comercial para Clínica Odontológica: Guia Completo", metaDesc: "Monte um processo comercial completo para sua clínica odontológica. Do primeiro contato ao fechamento — 7 etapas práticas que aumentam conversão.", keyword: "processo comercial clínica odontológica", cluster: "odonto", readTime: 12,
    content: `<h2>Por que sua clínica precisa de um processo comercial?</h2><p>A maioria das clínicas odontológicas investe em tráfego pago mas não tem um processo definido para converter leads em pacientes. O resultado? Leads respondem, mas ninguém faz follow-up. Pacientes pedem orçamento e somem. A recepcionista improvisa cada atendimento.</p><p><strong>Um processo comercial estruturado resolve isso.</strong> Ele define exatamente o que acontece em cada etapa — do primeiro contato ao fechamento — eliminando improvisação e maximizando conversão.</p><h2>As 7 etapas do processo comercial odontológico</h2><h3>1. Captação de leads qualificados</h3><p>Tudo começa com a geração de leads. Mas não qualquer lead — leads qualificados que realmente precisam do seu serviço. As fontes mais eficientes para clínicas odontológicas são Google Ads (busca ativa), Meta Ads (demanda latente), e conteúdo orgânico no Instagram.</p><h3>2. Resposta em menos de 5 minutos</h3><p>Estudos mostram que responder um lead nos primeiros 5 minutos aumenta em 21x a chance de conversão. A maioria das clínicas leva horas ou até dias para responder. Com automação, sua clínica responde instantaneamente — 24 horas por dia.</p><h3>3. Qualificação automática</h3><p>Nem todo lead é um paciente potencial. O processo de qualificação identifica automaticamente quem tem perfil, urgência e capacidade financeira para o tratamento. Leads não qualificados entram em nutrição; qualificados avançam para agendamento.</p><h3>4. Agendamento sem atrito</h3><p>O agendamento deve ser simples e imediato. Links de agendamento, confirmação automática por WhatsApp, e lembretes reduzem no-shows em até 40%.</p><h3>5. Apresentação do tratamento</h3><p>Na consulta, o dentista apresenta o plano de tratamento. Aqui entram scripts testados, materiais visuais e técnicas de comunicação que aumentam a aceitação do orçamento.</p><h3>6. Follow-up pós-orçamento</h3><p>70% dos pacientes não fecham na primeira consulta. Um follow-up estruturado — com sequência de mensagens, respostas a objeções e ofertas de condições especiais — recupera até 35% desses pacientes.</p><h3>7. Reativação e remarketing</h3><p>Pacientes que não fecharam há 30, 60 ou 90 dias recebem campanhas de reativação. Pacientes que já trataram recebem lembretes de manutenção. Isso aumenta o LTV e reduz o custo de aquisição.</p><h2>O que muda com um processo estruturado?</h2><p>Clínicas que implementam um processo comercial completo reportam em média: <strong>3x mais conversão</strong> de leads em pacientes, <strong>40% menos no-show</strong>, e <strong>aumento de 60% no faturamento</strong> em 90 dias — sem aumentar o investimento em tráfego.</p><blockquote>O problema da maioria das clínicas não é gerar leads. É o que acontece depois que o lead chega.</blockquote><h2>Como a FlowAI implementa isso</h2><p>A FlowAI Digital opera todo esse processo usando 129 agentes de IA especializados. Cada agente cuida de uma etapa específica — resposta, qualificação, agendamento, follow-up, remarketing — funcionando 24 horas por dia, 7 dias por semana. Sua equipe foca no que importa: atender o paciente na cadeira.</p>` },

  { slug: "como-converter-leads-em-pacientes", title: "Como Converter Leads em Pacientes na Odontologia", metaDesc: "Descubra por que sua clínica perde leads e como converter até 3x mais em pacientes com processo comercial, automação e follow-up estruturado.", keyword: "converter leads em pacientes odontologia", cluster: "odonto", readTime: 10,
    content: `<h2>O problema: leads que nunca viram pacientes</h2><p>Sua clínica investe R$ 3.000, R$ 5.000 ou mais em tráfego pago todo mês. Os leads chegam. Mas a conversão é baixa — 5%, 10% no máximo. O que está acontecendo entre o clique no anúncio e a cadeira do dentista?</p><p>Na maioria dos casos, o problema está em 3 pontos: <strong>tempo de resposta</strong>, <strong>qualificação</strong> e <strong>follow-up</strong>.</p><h2>Tempo de resposta: o fator #1</h2><p>Pesquisas da Harvard Business Review mostram que empresas que respondem em menos de 5 minutos têm 21x mais chances de qualificar o lead. Na odontologia, isso é ainda mais crítico — o paciente que busca "implante dentário" está comparando 3-4 clínicas simultaneamente. Quem responde primeiro, fecha.</p><p>A realidade? A maioria das clínicas leva 2-4 horas para responder. Nesse tempo, o concorrente já agendou a avaliação.</p><h2>Qualificação: separar curiosos de pacientes reais</h2><p>Nem todo lead quer (ou pode) fazer o tratamento agora. O processo de qualificação identifica automaticamente 3 fatores: necessidade real, urgência e capacidade financeira. Leads qualificados vão direto para agendamento. Os demais entram em nutrição — uma sequência de conteúdo que mantém sua clínica no topo da mente até o momento certo.</p><h2>Follow-up: a mina de ouro ignorada</h2><p>85% das clínicas fazem no máximo 1 tentativa de contato. Dados mostram que são necessários entre 5 e 7 toques para converter um lead em paciente. A cada follow-up não feito, você está jogando dinheiro no lixo.</p><p>Um follow-up eficiente combina WhatsApp, e-mail e remarketing — com mensagens personalizadas para cada estágio do funil.</p><h2>O framework de conversão em 5 passos</h2><h3>Passo 1: Resposta instantânea automatizada</h3><p>Use automação para enviar a primeira mensagem em menos de 2 minutos. A mensagem deve ser personalizada com o nome do lead e o tratamento de interesse.</p><h3>Passo 2: Qualificação em 3 perguntas</h3><p>Pergunte: qual tratamento procura, qual a urgência, e se tem convênio ou vai particular. Isso filtra 60% dos leads não qualificados.</p><h3>Passo 3: Agendamento imediato</h3><p>Para leads qualificados, ofereça agendamento no mesmo momento. Quanto mais etapas entre "eu quero" e "está agendado", mais leads você perde.</p><h3>Passo 4: Confirmação e lembrete</h3><p>Envie confirmação imediata + lembrete 24h antes + lembrete 2h antes. Isso reduz no-show em até 40%.</p><h3>Passo 5: Sequência de follow-up para quem não agendou</h3><p>7 toques em 14 dias. Alterne entre conteúdo educacional, depoimentos de pacientes e ofertas de condições especiais.</p><h2>Resultados esperados</h2><p>Clínicas que implementam esse framework reportam aumento de conversão de 8-12% para 25-35% em 60 dias. O segredo não é gastar mais em tráfego — é parar de desperdiçar os leads que já chegam.</p>` },

  { slug: "funil-de-vendas-clinica-odontologica", title: "Funil de Vendas para Clínica Odontológica: Guia Prático", metaDesc: "Aprenda a criar um funil de vendas completo para sua clínica odontológica. Da captação ao fechamento com etapas claras e métricas.", keyword: "funil de vendas clínica odontológica", cluster: "odonto", readTime: 11,
    content: `<h2>O que é um funil de vendas odontológico?</h2><p>Um funil de vendas é a representação visual do caminho que um lead percorre até se tornar paciente da sua clínica. Cada etapa tem uma taxa de conversão, e otimizar essas taxas é o que separa clínicas que crescem das que ficam estagnadas.</p><h2>As 5 etapas do funil odontológico</h2><h3>Topo do Funil: Atração</h3><p>Aqui o objetivo é gerar visibilidade e atrair pessoas que precisam de tratamento odontológico. Canais principais: Google Ads (pacientes buscando ativamente), Instagram (construção de autoridade), e Google Meu Negócio (SEO local).</p><p><strong>Métrica-chave:</strong> Custo por lead (CPL). Meta: R$ 15-40 dependendo do tratamento.</p><h3>Meio do Funil: Qualificação</h3><p>O lead respondeu ao anúncio. Agora precisa ser qualificado: tem perfil? Tem urgência? Tem orçamento? Essa triagem pode ser 100% automatizada, poupando tempo da recepção.</p><p><strong>Métrica-chave:</strong> Taxa de qualificação. Meta: 40-60% dos leads.</p><h3>Meio do Funil: Agendamento</h3><p>Leads qualificados precisam virar consultas agendadas. A conversão aqui depende de velocidade (agendar no mesmo dia do contato) e simplicidade (menos cliques = mais agendamentos).</p><p><strong>Métrica-chave:</strong> Taxa de agendamento. Meta: 60-80% dos qualificados.</p><h3>Fundo do Funil: Consulta e Fechamento</h3><p>Na cadeira, o dentista apresenta o plano de tratamento. Scripts estruturados, apresentações visuais e opções de pagamento facilitam o fechamento.</p><p><strong>Métrica-chave:</strong> Taxa de aceite de orçamento. Meta: 50-70%.</p><h3>Pós-Funil: Retenção e Indicação</h3><p>Paciente que tratou vira fonte de receita recorrente (manutenções, novos tratamentos) e de indicações. Automatize lembretes de retorno e programas de indicação.</p><p><strong>Métrica-chave:</strong> LTV (Lifetime Value) e NPS.</p><h2>Como calcular o ROI do seu funil</h2><p>Exemplo prático: se você investe R$ 5.000/mês em tráfego, gera 200 leads, qualifica 100, agenda 70, e fecha 40 pacientes com ticket médio de R$ 2.000 — seu faturamento é R$ 80.000. ROI de 16x.</p><p>Agora imagine melhorar cada etapa em 20%. Os mesmos R$ 5.000 geram R$ 138.000. Isso é engenharia de receita.</p><h2>O erro mais comum</h2><p>A maioria das clínicas só olha para o topo do funil — "preciso de mais leads". Mas se o funil está vazando no meio (follow-up inexistente, qualificação manual, agendamento lento), mais leads só significa mais desperdício.</p><blockquote>Não aumente o investimento em tráfego até que cada etapa do funil esteja otimizada. Primeiro pare de vazar, depois aumente a torneira.</blockquote>` },

  { slug: "como-reduzir-no-show-clinica-odontologica", title: "Como Reduzir No-Show em Clínica Odontológica: 7 Táticas", metaDesc: "Reduza faltas em até 40% na sua clínica odontológica com automação de lembretes, confirmação por WhatsApp e gestão inteligente de agenda.", keyword: "reduzir no-show clínica odontológica", cluster: "odonto", readTime: 8,
    content: `<h2>O custo invisível do no-show</h2><p>Cada paciente que falta representa em média R$ 300-800 de receita perdida (considerando o tempo do dentista, da cadeira ocupada e da oportunidade perdida). Se sua clínica tem 20% de no-show e atende 40 pacientes/semana, são 8 faltas — até R$ 6.400/semana no lixo.</p><h2>7 táticas comprovadas para reduzir faltas</h2><h3>1. Confirmação automática por WhatsApp</h3><p>Envie confirmação imediatamente após o agendamento com data, horário e endereço. Peça que o paciente confirme respondendo "1". Pacientes que confirmam têm 60% menos chance de faltar.</p><h3>2. Lembrete 24 horas antes</h3><p>Mensagem automática: "Olá [nome], amanhã às [hora] é sua consulta na [clínica]. Confirma?" Simples, direto, eficaz.</p><h3>3. Lembrete 2 horas antes</h3><p>Um último toque: "Estamos te esperando às [hora]! Qualquer imprevisto, avise pelo WhatsApp." Isso dá ao paciente a chance de reagendar ao invés de simplesmente não aparecer.</p><h3>4. Lista de espera automática</h3><p>Quando um paciente cancela, o sistema automaticamente oferece o horário para pacientes da lista de espera. Isso preenche buracos que seriam receita perdida.</p><h3>5. Política de cancelamento clara</h3><p>Comunique na hora do agendamento: cancelamentos devem ser feitos com 24h de antecedência. Não precisa cobrar multa — só ter a regra clara já reduz faltas em 15%.</p><h3>6. Facilite o reagendamento</h3><p>Se o paciente não pode ir, torne o reagendamento tão fácil quanto uma mensagem de WhatsApp. Quanto mais difícil reagendar, mais gente simplesmente falta sem avisar.</p><h3>7. Pré-consulta com valor</h3><p>Envie antes da consulta um conteúdo que aumente o comprometimento: "Prepare-se para sua avaliação" com instruções, o que esperar, e depoimentos de pacientes satisfeitos.</p><h2>Automação é a chave</h2><p>Fazer tudo isso manualmente é impossível com volume. A automação cuida dos lembretes, confirmações, lista de espera e reagendamentos — sem sobrecarregar sua recepção.</p>` },

  { slug: "remarketing-para-clinicas-odontologicas", title: "Remarketing para Clínicas Odontológicas: Guia Completo", metaDesc: "Aprenda a usar remarketing para reativar leads e pacientes que não fecharam na sua clínica odontológica. Estratégias práticas com WhatsApp e Meta Ads.", keyword: "remarketing clínicas odontológicas", cluster: "odonto", readTime: 9,
    content: `<h2>O que é remarketing odontológico?</h2><p>Remarketing é a estratégia de reimpactar pessoas que já tiveram contato com sua clínica mas não converteram. Pode ser um lead que pediu informações e não agendou, um paciente que fez avaliação mas não fechou o tratamento, ou alguém que visitou seu site mas não entrou em contato.</p><p><strong>Por que isso importa?</strong> Porque reativar um lead existente custa 5-7x menos que gerar um novo. Sua base de leads "perdidos" é uma mina de ouro.</p><h2>3 tipos de remarketing para clínicas</h2><h3>1. Remarketing por WhatsApp (mais eficiente)</h3><p>Sequência automatizada para leads que não responderam ou não agendaram. Exemplo: Dia 1 — mensagem de valor. Dia 3 — depoimento de paciente. Dia 7 — oferta de condição especial. Dia 14 — última chamada.</p><h3>2. Remarketing por Meta Ads</h3><p>Crie audiências personalizadas com quem visitou seu site, interagiu no Instagram ou está na sua lista de leads. Mostre anúncios específicos para cada estágio do funil.</p><h3>3. Remarketing por E-mail</h3><p>Para leads que forneceram e-mail, crie sequências de nutrição com conteúdo educacional sobre os tratamentos de interesse, casos de sucesso e condições de pagamento.</p><h2>Segmentação: a chave do remarketing eficiente</h2><p>Não envie a mesma mensagem para todos. Segmente por: tratamento de interesse (implante, ortodontia, estética), estágio do funil (lead frio, avaliação feita, orçamento pendente), e tempo desde o último contato (7 dias, 30 dias, 90 dias).</p><h2>Resultados esperados</h2><p>Clínicas que implementam remarketing estruturado recuperam entre 15% e 35% dos leads "perdidos" — sem gastar um centavo a mais em tráfego pago.</p>` },

  { slug: "crm-para-clinica-odontologica", title: "CRM para Clínica Odontológica: Como Escolher e Usar", metaDesc: "Guia completo de CRM para clínicas odontológicas. Como escolher, configurar e usar para aumentar conversão e organizar seu processo comercial.", keyword: "CRM clínica odontológica", cluster: "odonto", readTime: 10,
    content: `<h2>Por que sua clínica precisa de um CRM?</h2><p>CRM (Customer Relationship Management) é o sistema que organiza todo o relacionamento com seus pacientes e leads. Sem CRM, informações ficam espalhadas em WhatsApp, planilhas, cadernos e na memória da recepcionista.</p><p>O resultado? Leads se perdem, follow-ups não acontecem, e você não sabe qual campanha gerou qual paciente.</p><h2>O que um CRM odontológico deve ter</h2><h3>Funil visual de pacientes</h3><p>Veja em tempo real quantos leads estão em cada etapa: novo contato, qualificado, avaliação agendada, orçamento enviado, tratamento em andamento.</p><h3>Integração com WhatsApp</h3><p>Todas as conversas centralizadas. Histórico completo de cada paciente. Templates de mensagens para cada etapa.</p><h3>Automação de follow-up</h3><p>Regras automáticas: "se lead não respondeu em 24h, enviar mensagem X". "Se orçamento pendente há 3 dias, enviar mensagem Y".</p><h3>Dashboard de métricas</h3><p>Custo por lead, taxa de conversão por etapa, receita por campanha, ROI. Dados que permitem decisões inteligentes.</p><h2>CRM genérico vs. CRM odontológico</h2><p>CRMs genéricos (Pipedrive, HubSpot) funcionam mas precisam de customização. CRMs odontológicos (Dental Office, Simples Dental, Clinicorp) já vêm com funil adaptado, mas geralmente são limitados em automação de vendas.</p><p><strong>A melhor abordagem:</strong> usar um CRM configurado especificamente para o processo comercial da sua clínica — com etapas, automações e métricas personalizadas para odontologia.</p><h2>Erros comuns na implementação</h2><ul><li>Comprar o CRM e não alimentar com dados</li><li>Não treinar a equipe para usar diariamente</li><li>Não definir as etapas do funil antes de configurar</li><li>Não integrar com as fontes de leads (Google Ads, Instagram, site)</li><li>Olhar o CRM como "mais uma ferramenta" ao invés de "o centro da operação"</li></ul>` },

  { slug: "captacao-de-pacientes-odontologia", title: "Captação de Pacientes para Clínica Odontológica em 2026", metaDesc: "Estratégias atualizadas de captação de pacientes para clínicas odontológicas. Google Ads, Instagram, SEO local e automação que geram resultado.", keyword: "captação de pacientes odontologia", cluster: "odonto", readTime: 11,
    content: `<h2>O cenário da captação de pacientes em 2026</h2><p>O mercado odontológico está mais competitivo do que nunca. Só no Brasil, existem mais de 350.000 dentistas para uma população de 215 milhões. A diferença entre clínicas que lotam a agenda e as que têm cadeira vazia não é a qualidade técnica — é a capacidade de captar e converter pacientes de forma consistente.</p><h2>Os 5 canais mais eficientes para captar pacientes</h2><h3>1. Google Ads — Busca Ativa</h3><p>Pacientes buscando "implante dentário zona sul", "dentista emergência" ou "clareamento dental preço" têm alta intenção de compra. Google Ads captura essa demanda ativa. Custo médio por lead: R$ 20-50.</p><h3>2. Meta Ads (Instagram/Facebook) — Demanda Latente</h3><p>Anúncios no Instagram geram demanda que o paciente ainda não sabia que tinha. Funciona melhor para procedimentos estéticos (clareamento, lentes, harmonização). Custo médio por lead: R$ 8-25.</p><h3>3. Google Meu Negócio — SEO Local</h3><p>Sua ficha no Google Maps é gratuita e aparece para buscas locais. Otimize: fotos profissionais, respostas a avaliações, posts semanais, informações completas. Gera leads com custo zero.</p><h3>4. Instagram Orgânico — Autoridade</h3><p>Conteúdo educacional (antes/depois, explicação de procedimentos, bastidores) constrói confiança. Não gera leads imediatos, mas reduz o custo de conversão porque o paciente já chega confiando.</p><h3>5. Indicação Estruturada</h3><p>Programa formal de indicação: paciente indica amigo, ambos ganham benefício. Automatize com mensagem pós-tratamento e link de indicação. O custo de aquisição mais baixo que existe.</p><h2>O erro fatal da captação</h2><p>Investir em captação sem ter processo comercial é jogar dinheiro fora. De nada adianta gerar 200 leads/mês se 170 são perdidos por falta de resposta rápida, qualificação e follow-up.</p><blockquote>Captação sem processo é desperdício. Primeiro monte o processo, depois aumente a captação.</blockquote>` },

  { slug: "como-aumentar-faturamento-clinica-odontologica", title: "Como Aumentar o Faturamento da Clínica Odontológica", metaDesc: "7 estratégias práticas para aumentar o faturamento da sua clínica odontológica sem aumentar investimento em tráfego. Processo, dados e automação.", keyword: "aumentar faturamento clínica odontológica", cluster: "odonto", readTime: 10,
    content: `<h2>Faturamento = Volume × Ticket × Frequência</h2><p>Para aumentar o faturamento da sua clínica, você só precisa melhorar 3 variáveis: volume de pacientes, ticket médio por tratamento, e frequência de retorno.</p><h2>7 estratégias que funcionam</h2><h3>1. Pare de perder leads</h3><p>Se sua clínica converte 10% dos leads e você melhorar para 25%, triplicou o faturamento sem gastar mais em tráfego. A primeira ação é implementar resposta automática em menos de 5 minutos.</p><h3>2. Aumente o ticket com apresentação estruturada</h3><p>Dentistas que usam apresentação visual do plano de tratamento (fotos, simulações, comparativos) têm aceite de orçamento 40% maior. Não é sobre vender mais caro — é sobre comunicar melhor o valor.</p><h3>3. Ofereça condições de pagamento</h3><p>Parcelamento em 12x, desconto para pagamento à vista, pacotes de tratamento. Remova a barreira financeira e mais pacientes fecham.</p><h3>4. Recupere orçamentos pendentes</h3><p>70% dos pacientes que pedem orçamento não fecham na hora. Mas 35% deles fecham se receberem follow-up estruturado nos dias seguintes. Automatize essa sequência.</p><h3>5. Implemente recall de manutenção</h3><p>Limpeza semestral, check-up anual, manutenção de implantes. Lembretes automáticos trazem pacientes de volta sem custo de aquisição.</p><h3>6. Cross-sell inteligente</h3><p>Paciente que fez clareamento tem perfil para lentes de contato dental. Paciente de ortodontia pode se interessar por clareamento pós-tratamento. Ofereça o próximo passo naturalmente.</p><h3>7. Programa de indicação</h3><p>Cada paciente satisfeito pode trazer 2-3 novos pacientes. Automatize o pedido de indicação após o tratamento concluído com sucesso.</p>` },

  { slug: "scripts-de-vendas-clinica-odontologica", title: "Scripts de Vendas para Clínica Odontológica que Convertem", metaDesc: "Scripts prontos para WhatsApp, telefone e recepção que aumentam a conversão da sua clínica odontológica. Testados e aprovados em clínicas reais.", keyword: "scripts de vendas clínica odontológica", cluster: "odonto", readTime: 9,
    content: `<h2>Por que sua clínica precisa de scripts?</h2><p>Script não é robotizar o atendimento — é garantir que informações essenciais sejam comunicadas em toda interação. Sem script, cada atendente improvisa. Com script, toda a equipe comunica valor de forma consistente.</p><h2>Script 1: Primeira resposta no WhatsApp</h2><p>"Olá, [nome]! Tudo bem? Aqui é a [nome] da [Clínica]. Vi que você se interessou por [tratamento]. Que bom que nos procurou! Para te direcionar da melhor forma, posso fazer algumas perguntinhas rápidas?"</p><p><strong>Por que funciona:</strong> personaliza, demonstra atenção, e abre caminho para qualificação sem parecer interrogatório.</p><h2>Script 2: Qualificação em 3 perguntas</h2><p>1. "Qual tratamento você está procurando?" 2. "É algo que você gostaria de resolver em breve?" 3. "Você tem convênio ou seria particular?"</p><p>Com essas 3 respostas, você sabe se o lead é quente ou frio, e qual o próximo passo.</p><h2>Script 3: Agendamento</h2><p>"Ótimo, [nome]! Temos horário disponível [data/hora]. A avaliação é completa e sem compromisso — o doutor vai analisar seu caso e apresentar as melhores opções. Posso agendar?"</p><h2>Script 4: Follow-up para quem não respondeu</h2><p>Dia 1: "[Nome], não sei se viu minha mensagem. Ainda tem interesse em [tratamento]?" Dia 3: "Muitos pacientes tinham a mesma dúvida sobre [tratamento]. Posso te mandar um vídeo explicando?" Dia 7: "[Nome], última chamada! Temos uma condição especial essa semana para [tratamento]."</p><h2>Script 5: Pós-orçamento</h2><p>"[Nome], tudo bem? Queria saber se ficou alguma dúvida sobre o plano de tratamento que o doutor apresentou. Muitos pacientes têm dúvidas sobre [objeção comum] — posso esclarecer?"</p><h2>Regras de ouro para scripts</h2><ul><li>Personalize sempre com o nome do paciente</li><li>Nunca pressione — oriente e facilite</li><li>Responda objeções com empatia antes de argumentar</li><li>Use áudio no WhatsApp para humanizar (quando apropriado)</li><li>Teste, meça e ajuste constantemente</li></ul>` },

  { slug: "follow-up-automatico-clinica-odontologica", title: "Follow-up Automático para Clínica Odontológica", metaDesc: "Como montar uma sequência de follow-up automático que recupera até 35% dos leads perdidos na sua clínica odontológica. Passo a passo.", keyword: "follow-up automático clínica odontológica", cluster: "odonto", readTime: 8,
    content: `<h2>O dinheiro está no follow-up</h2><p>85% das clínicas fazem apenas 1 tentativa de contato com o lead. Apenas 1. Enquanto isso, dados mostram que são necessários 5-7 toques para converter. Se você não está fazendo follow-up, está deixando até 70% da receita na mesa.</p><h2>Anatomia de uma sequência de follow-up eficiente</h2><h3>Dia 0 — Resposta imediata (< 5 min)</h3><p>Mensagem automática no WhatsApp assim que o lead entra. Personalizada com nome e tratamento de interesse.</p><h3>Dia 1 — Segundo contato</h3><p>Se não respondeu, envie: "Oi [nome], não sei se viu minha mensagem de ontem. Ainda posso te ajudar com [tratamento]?"</p><h3>Dia 3 — Conteúdo de valor</h3><p>Envie algo educacional: vídeo explicando o tratamento, depoimento de paciente, ou infográfico com antes/depois.</p><h3>Dia 7 — Gatilho de escassez</h3><p>"[Nome], temos uma condição especial para [tratamento] até sexta. Quer que eu reserve um horário?"</p><h3>Dia 14 — Última mensagem</h3><p>"[Nome], vou fechar seu atendimento por aqui. Se no futuro precisar, é só me chamar. Desejo saúde!" Paradoxalmente, essa mensagem de "despedida" é a que mais gera respostas.</p><h2>Por que automação e não manual?</h2><p>Com 50+ leads/mês, é fisicamente impossível fazer follow-up manual consistente. A recepcionista esquece, prioriza quem está na frente, e o lead esfria. Automação garante que TODO lead receba TODA a sequência, sem exceção.</p><h2>Resultados reais</h2><p>Clínicas que implementam follow-up automático de 5 toques reportam recuperação de 25-35% dos leads que seriam perdidos. Em uma clínica que gera 100 leads/mês, são 25-35 pacientes extras — sem gastar mais em tráfego.</p>` },

  { slug: "taxa-de-conversao-clinica-odontologica", title: "Taxa de Conversão em Clínica Odontológica: Benchmarks", metaDesc: "Qual a taxa de conversão ideal para clínica odontológica? Benchmarks por etapa do funil, como calcular e como melhorar cada indicador.", keyword: "taxa de conversão clínica odontológica", cluster: "odonto", readTime: 8,
    content: `<h2>Benchmarks de conversão por etapa</h2><p>Sem saber os números do seu funil, você está navegando no escuro. Aqui estão os benchmarks de mercado para clínicas odontológicas:</p><h3>Lead → Qualificado: 40-60%</h3><p>De todos os leads que entram, 40-60% devem ser qualificados (têm perfil, interesse e capacidade). Se está abaixo de 40%, o problema está na segmentação do tráfego.</p><h3>Qualificado → Agendado: 60-80%</h3><p>De todos os qualificados, 60-80% devem agendar avaliação. Se está abaixo, o problema está na velocidade de resposta ou no processo de agendamento.</p><h3>Agendado → Compareceu: 70-85%</h3><p>A taxa de comparecimento saudável é 70-85%. Abaixo disso, faltam lembretes e confirmação automatizada.</p><h3>Compareceu → Fechou: 50-70%</h3><p>Metade a dois terços dos pacientes que comparecem devem fechar tratamento. Se está abaixo, o problema está na apresentação do plano de tratamento ou nas condições de pagamento.</p><h2>Como calcular sua taxa geral</h2><p>Taxa geral = (Pacientes que fecharam ÷ Total de leads) × 100. A taxa saudável geral é 15-30%. Se sua clínica está abaixo de 15%, há vazamentos significativos no funil.</p><h2>Como melhorar cada etapa</h2><ul><li><strong>Lead → Qualificado:</strong> Melhore a segmentação dos anúncios. Leads mais qualificados na entrada = menos desperdício.</li><li><strong>Qualificado → Agendado:</strong> Resposta em < 5 min + agendamento no mesmo contato.</li><li><strong>Agendado → Compareceu:</strong> Confirmação + 2 lembretes + facilidade para reagendar.</li><li><strong>Compareceu → Fechou:</strong> Scripts de apresentação + condições de pagamento + follow-up pós-orçamento.</li></ul>` },

  { slug: "marketing-digital-clinica-odontologica-que-funciona", title: "Marketing Digital para Clínica Odontológica que Funciona", metaDesc: "Chega de marketing que só gera curtidas. Descubra o marketing digital que realmente traz pacientes para sua clínica odontológica. Estratégia completa.", keyword: "marketing digital clínica odontológica", cluster: "odonto", readTime: 11,
    content: `<h2>O problema do marketing odontológico atual</h2><p>A maioria das clínicas confunde marketing com "postar no Instagram". Investem em fotos bonitas, reels virais e stories diários — mas a agenda continua vazia. Por quê? Porque marketing sem processo comercial é branding, não geração de receita.</p><h2>O framework que funciona: Captação + Processo + Dados</h2><h3>Pilar 1: Captação direcionada</h3><p>Invista em canais que geram leads com intenção real. Google Ads para quem já está buscando. Meta Ads para procedimentos estéticos de alto ticket. SEO local para aparecer no Google Maps.</p><h3>Pilar 2: Processo comercial</h3><p>Todo lead que entra precisa percorrer um caminho definido: resposta rápida → qualificação → agendamento → consulta → follow-up. Sem esse processo, os leads do pilar 1 são desperdiçados.</p><h3>Pilar 3: Dados e otimização</h3><p>Meça tudo: custo por lead, taxa de conversão por etapa, custo por consulta agendada, ROI por campanha. Sem dados, você não sabe o que funciona e o que desperdiça dinheiro.</p><h2>O que não funciona (e todo mundo faz)</h2><ul><li>Postar todos os dias no Instagram sem CTA claro</li><li>Contratar agência que "entrega leads" mas não se responsabiliza pela conversão</li><li>Fazer anúncios genéricos ("venha conhecer nossa clínica")</li><li>Investir em tráfego sem ter CRM configurado</li><li>Medir sucesso por curtidas e seguidores ao invés de pacientes e receita</li></ul><h2>A diferença entre agência e engenharia de receita</h2><p>Agência entrega leads e relatórios. Engenharia de receita opera o processo completo — do clique ao fechamento. A agência te mostra quantos leads gerou. A engenharia te mostra quantos pacientes fecharam e quanto de receita entrou.</p>` },

  { slug: "por-que-clinica-odontologica-perde-pacientes", title: "7 Motivos por que Sua Clínica Perde Pacientes (e Soluções)", metaDesc: "Descubra os 7 motivos mais comuns que fazem clínicas odontológicas perderem pacientes e leads. Diagnóstico prático com soluções imediatas.", keyword: "clínica odontológica perde pacientes", cluster: "odonto", readTime: 9,
    content: `<h2>Você está perdendo pacientes e talvez nem saiba</h2><p>A maioria das clínicas não tem visibilidade sobre quantos pacientes perdem em cada etapa. Sem dados, o problema é invisível. Aqui estão os 7 motivos mais comuns — e suas soluções.</p><h3>1. Demora na resposta</h3><p><strong>Problema:</strong> Lead envia mensagem e espera horas para receber resposta. <strong>Impacto:</strong> 78% dos pacientes fecham com quem responde primeiro. <strong>Solução:</strong> Automação de primeira resposta em < 2 minutos.</p><h3>2. Ausência de follow-up</h3><p><strong>Problema:</strong> Paciente pede orçamento, não fecha, e ninguém mais entra em contato. <strong>Impacto:</strong> 70% dos orçamentos pendentes são recuperáveis com follow-up. <strong>Solução:</strong> Sequência automática de 5 toques em 14 dias.</p><h3>3. No-show alto</h3><p><strong>Problema:</strong> 20-30% dos agendados não comparecem. <strong>Impacto:</strong> Receita perdida + tempo ocioso. <strong>Solução:</strong> Confirmação + 2 lembretes + lista de espera automática.</p><h3>4. Apresentação fraca do tratamento</h3><p><strong>Problema:</strong> Dentista explica o tratamento verbalmente sem apoio visual. <strong>Impacto:</strong> Paciente não entende o valor e acha caro. <strong>Solução:</strong> Apresentação visual + simulação + comparativos.</p><h3>5. Sem CRM — informações perdidas</h3><p><strong>Problema:</strong> Conversas em vários WhatsApps, sem histórico centralizado. <strong>Impacto:</strong> Leads esquecidos, informações perdidas, zero rastreabilidade. <strong>Solução:</strong> CRM configurado com funil de pacientes.</p><h3>6. Sem remarketing</h3><p><strong>Problema:</strong> Paciente que não fechou é esquecido para sempre. <strong>Impacto:</strong> Base de leads desperdiçada. <strong>Solução:</strong> Campanhas de reativação para 30, 60 e 90 dias.</p><h3>7. Zero dados</h3><p><strong>Problema:</strong> Não sabe custo por lead, taxa de conversão, ROI por campanha. <strong>Impacto:</strong> Decisões no chute. <strong>Solução:</strong> Dashboard com métricas em tempo real.</p>` },

  { slug: "quanto-custa-captar-paciente-clinica-odontologica", title: "Quanto Custa Captar um Paciente? Benchmarks Odonto 2026", metaDesc: "Descubra o custo real de captação de pacientes em clínicas odontológicas. Benchmarks por tratamento, canal e região. Dados atualizados.", keyword: "custo captação paciente clínica odontológica", cluster: "odonto", readTime: 8,
    content: `<h2>O custo que ninguém calcula</h2><p>A maioria das clínicas sabe quanto gasta em tráfego, mas não sabe quanto custa efetivamente colocar um paciente na cadeira. Esse número — o CAC (Custo de Aquisição de Cliente) — é o indicador mais importante do seu negócio.</p><h2>Como calcular o CAC da sua clínica</h2><p><strong>CAC = Investimento total em marketing ÷ Número de pacientes que fecharam</strong></p><p>Se você investiu R$ 5.000 em tráfego e fechou 20 pacientes, seu CAC é R$ 250. Simples. Mas o número real precisa incluir: valor do tráfego + custo da ferramenta/CRM + tempo da equipe de atendimento.</p><h2>Benchmarks por tratamento</h2><h3>Clareamento dental: CAC R$ 80-150</h3><p>Alto volume, ticket menor (R$ 800-1.500). Funciona bem com Meta Ads.</p><h3>Implante dentário: CAC R$ 200-500</h3><p>Volume menor, ticket alto (R$ 3.000-8.000). Google Ads converte melhor.</p><h3>Ortodontia/Alinhadores: CAC R$ 150-300</h3><p>Volume médio, ticket médio-alto (R$ 4.000-12.000). Mix de Google + Meta.</p><h3>Lentes de contato dental: CAC R$ 120-250</h3><p>Demanda crescente, ticket alto (R$ 8.000-25.000). Instagram é o canal principal.</p><h2>Quando o CAC é alto demais?</h2><p>Regra prática: o CAC deve ser no máximo 20-25% do ticket médio do tratamento. Se seu CAC para implante é R$ 500 e o ticket é R$ 5.000, está saudável (10%). Se o CAC para clareamento é R$ 200 e o ticket é R$ 1.000, está alto (20%) — precisa otimizar.</p><h2>Como reduzir o CAC</h2><ul><li>Melhorar a taxa de conversão do funil (mais pacientes com o mesmo investimento)</li><li>Implementar remarketing (reativar leads sem custo adicional)</li><li>Programa de indicação (CAC próximo de zero)</li><li>SEO local (leads orgânicos = custo zero)</li></ul>` },

  { slug: "whatsapp-para-clinica-odontologica", title: "WhatsApp para Clínica Odontológica: Guia de Atendimento", metaDesc: "Como usar o WhatsApp profissionalmente na sua clínica odontológica. Templates, automação, etiqueta e estratégias que aumentam conversão.", keyword: "WhatsApp clínica odontológica", cluster: "odonto", readTime: 9,
    content: `<h2>WhatsApp é o canal #1 — use direito</h2><p>90% dos leads de clínicas odontológicas chegam pelo WhatsApp. Mas a maioria das clínicas trata o WhatsApp como chat pessoal — sem organização, sem templates, sem automação. Isso custa caro.</p><h2>WhatsApp Business vs. API</h2><p><strong>WhatsApp Business (gratuito):</strong> Funciona para clínicas com até 30 leads/mês. Tem catálogo, mensagens automáticas básicas e etiquetas.</p><p><strong>WhatsApp Business API:</strong> Para clínicas com 50+ leads/mês. Permite automação avançada, integração com CRM, chatbots e múltiplos atendentes no mesmo número.</p><h2>5 templates essenciais</h2><h3>1. Boas-vindas automática</h3><p>"Olá! Bem-vindo à [Clínica]. Sou a [nome], vou te atender. Como posso ajudar? 1. Agendar consulta 2. Saber sobre tratamentos 3. Falar sobre valores"</p><h3>2. Confirmação de agendamento</h3><p>"Agendamento confirmado! [Tratamento] dia [data] às [hora]. Endereço: [endereço]. Dúvidas? É só responder aqui."</p><h3>3. Lembrete 24h</h3><p>"Oi [nome]! Lembrando que amanhã às [hora] é sua consulta. Confirma? Responda SIM ou me avise se precisar reagendar."</p><h3>4. Follow-up pós-orçamento</h3><p>"[Nome], tudo bem? Queria saber se ficou alguma dúvida sobre o orçamento. Temos condição especial para pagamento à vista. Posso te contar?"</p><h3>5. Pós-tratamento</h3><p>"[Nome], como está se sentindo após o [tratamento]? Qualquer dúvida, estamos aqui. Se ficou satisfeito, ficaríamos muito felizes com sua avaliação no Google."</p><h2>Regras de ouro</h2><ul><li>Responda em menos de 5 minutos (automação resolve)</li><li>Use o nome do paciente sempre</li><li>Não envie áudios longos (máximo 30 segundos)</li><li>Não envie mensagens fora do horário comercial (a não ser automáticas)</li><li>Centralize todas as conversas em um único número profissional</li></ul>` },

  { slug: "agente-ia-clinica-odontologica", title: "Agentes de IA para Clínica Odontológica: O Futuro é Agora", metaDesc: "Como agentes de IA estão revolucionando o atendimento em clínicas odontológicas. Qualificação, agendamento e follow-up 24h automatizados.", keyword: "agente IA clínica odontológica", cluster: "odonto", readTime: 10,
    content: `<h2>O que são agentes de IA?</h2><p>Agentes de IA são sistemas inteligentes que executam tarefas específicas de forma autônoma. Diferente de chatbots simples (que seguem roteiros fixos), agentes de IA entendem contexto, tomam decisões e aprendem com cada interação.</p><p>No contexto de uma clínica odontológica, agentes de IA podem: responder leads instantaneamente, qualificar pacientes com perguntas inteligentes, agendar consultas, enviar lembretes, fazer follow-up e até reativar pacientes inativos.</p><h2>Chatbot vs. Agente de IA: a diferença</h2><h3>Chatbot tradicional</h3><p>Segue um fluxo rígido de perguntas e respostas. Se o paciente faz algo fora do roteiro, o bot trava. Parece robótico. Frustra o paciente.</p><h3>Agente de IA</h3><p>Entende linguagem natural. Se o paciente escreve "quero arrumar meu sorriso" em vez de "quero lentes de contato", o agente entende a intenção e direciona corretamente. Conversa como humano.</p><h2>5 funções de agentes de IA em clínicas</h2><h3>1. Resposta instantânea 24/7</h3><p>Lead entra às 23h de domingo? O agente responde imediatamente, qualifica e agenda para segunda-feira. Sem perder o lead.</p><h3>2. Qualificação inteligente</h3><p>O agente faz as perguntas certas, na ordem certa, adaptando o tom conforme a resposta do paciente.</p><h3>3. Agendamento automático</h3><p>Integrado com a agenda da clínica, o agente oferece horários disponíveis e confirma automaticamente.</p><h3>4. Follow-up personalizado</h3><p>Sequências de mensagens adaptadas ao comportamento do lead: respondeu mas não agendou? Agendou mas não compareceu? Fez avaliação mas não fechou? Cada cenário tem um tratamento diferente.</p><h3>5. Reativação de base</h3><p>Agentes podem contactar automaticamente pacientes inativos há 3, 6 ou 12 meses com ofertas relevantes de manutenção ou novos tratamentos.</p><h2>O resultado: operação 24/7 pelo custo de meio funcionário</h2><p>Uma equipe de agentes de IA opera seu processo comercial completo — do primeiro contato ao remarketing — 24 horas por dia, 7 dias por semana. O custo? Menos que um funcionário CLT. A eficiência? Superior à de uma equipe de 5 pessoas.</p>` },

  // ── CLUSTER ESTÉTICA (10) ──
  { slug: "processo-comercial-clinica-estetica", title: "Processo Comercial para Clínica de Estética: Guia 2026", metaDesc: "Monte um processo comercial completo para sua clínica de estética. Da captação ao fechamento de procedimentos de alto ticket.", keyword: "processo comercial clínica estética", cluster: "estetica", readTime: 11,
    content: `<h2>Estética é venda consultiva de alto ticket</h2><p>Diferente de outros segmentos de saúde, a estética vende desejo — não necessidade. Isso muda completamente o processo comercial. O paciente não está com dor; está insatisfeito com algo visual. A abordagem precisa ser empática, visual e aspiracional.</p><h2>O funil de vendas na estética</h2><h3>Atração: Instagram é rei</h3><p>Na estética, o Instagram é responsável por 60-70% dos leads. Antes e depois, depoimentos em vídeo e bastidores de procedimentos geram interesse e confiança. Invista em produção visual de qualidade.</p><h3>Qualificação: perfil + expectativa</h3><p>Na estética, a qualificação vai além de orçamento. Precisa entender: qual é a insatisfação real? A expectativa é realista? Qual o histórico de procedimentos anteriores? Isso evita pacientes insatisfeitos no futuro.</p><h3>Consulta: a experiência importa</h3><p>A consulta de avaliação na estética é uma experiência de venda. Ambiente premium, atenção personalizada, simulação digital do resultado, e apresentação visual do plano. O paciente precisa SE VER com o resultado antes de fechar.</p><h3>Follow-up: timing é tudo</h3><p>Procedimentos estéticos são decisões emocionais. O follow-up precisa manter o desejo vivo sem parecer insistente. Use conteúdo visual (mais antes/depois), depoimentos de pacientes similares e condições de pagamento.</p><h2>Ticket médio e LTV na estética</h2><p>Harmonização facial: R$ 2.000-8.000. Bioestimuladores: R$ 1.500-4.000. Skincare personalizado: R$ 500-1.500/mês. O grande diferencial é o LTV: pacientes de estética voltam a cada 4-6 meses para manutenção, gerando receita recorrente previsível.</p>` },

  { slug: "como-vender-procedimentos-esteticos", title: "Como Vender Procedimentos Estéticos de Alto Ticket", metaDesc: "Técnicas de venda consultiva para procedimentos estéticos. Como apresentar valor, lidar com objeções e fechar tratamentos de R$ 5.000+.", keyword: "vender procedimentos estéticos", cluster: "estetica", readTime: 10,
    content: `<h2>Venda na estética é venda de transformação</h2><p>Você não vende toxina botulínica — vende confiança. Não vende preenchimento — vende autoestima. Quando o profissional entende que está vendendo transformação, a conversa sobre preço muda completamente.</p><h2>O framework DESIRE para estética</h2><h3>D — Descobrir a insatisfação real</h3><p>Pergunte: "O que te incomoda quando se olha no espelho?" A resposta revela a motivação emocional por trás da busca pelo procedimento.</p><h3>E — Empatizar genuinamente</h3><p>"Muitas das nossas pacientes se sentiam exatamente assim antes do tratamento." Valide o sentimento antes de oferecer a solução.</p><h3>S — Simular o resultado</h3><p>Use simulação digital, fotos de pacientes com perfil similar, ou até mesmo demonstrações com preenchimento temporário. O paciente precisa SE VER com o resultado.</p><h3>I — Informar com transparência</h3><p>Explique o procedimento, duração, recuperação e resultados esperados. Transparência constrói confiança. Nunca prometa resultados irreais.</p><h3>R — Resolver objeções</h3><p>As objeções mais comuns: preço (ofereça parcelamento), medo da dor (explique o processo), resultado artificial (mostre cases naturais).</p><h3>E — Encaminhar para o fechamento</h3><p>"Podemos agendar seu procedimento para qual semana?" Não pergunte SE quer fazer — pergunte QUANDO.</p><h2>A apresentação visual faz a diferença</h2><p>Clínicas que usam apresentação visual (iPad com portfólio, simulação 3D, álbum de antes/depois categorizado por procedimento) têm aceite de orçamento 50% maior. O investimento em apresentação se paga no primeiro mês.</p>` },

  { slug: "captacao-pacientes-clinica-estetica", title: "Captação de Pacientes para Clínica de Estética em 2026", metaDesc: "Estratégias de captação de pacientes para clínicas de estética. Instagram, Google Ads, influencers e automação para lotar sua agenda.", keyword: "captação pacientes clínica estética", cluster: "estetica", readTime: 10,
    content: `<h2>Onde estão os pacientes de estética?</h2><p>O paciente de estética tem um perfil específico: 70% mulheres, 25-55 anos, renda média-alta, ativas em redes sociais. Isso define onde e como você deve captar.</p><h2>Os 4 canais que mais convertem</h2><h3>1. Instagram Ads (60% dos leads)</h3><p>Criativos com antes/depois, vídeos de procedimentos e depoimentos em vídeo. Segmentação por interesse em beleza, skincare e bem-estar. Custo por lead: R$ 8-20.</p><h3>2. Google Ads (20% dos leads)</h3><p>Captures quem busca ativamente: "harmonização facial [cidade]", "preenchimento labial preço", "botox [bairro]". Custo por lead: R$ 25-60, mas com alta intenção.</p><h3>3. Micro-influencers locais (10% dos leads)</h3><p>Parcerias com influencers de 5k-50k seguidores na sua cidade. Ofereça procedimento em troca de conteúdo genuíno. O ROI de micro-influencers é 3-5x maior que influencers grandes.</p><h3>4. Indicação estruturada (10% dos leads)</h3><p>Programa "Indique e ganhe": paciente indica amiga, ambas ganham desconto no próximo procedimento. Automatize com link de indicação pós-procedimento.</p><h2>Conteúdo que atrai pacientes de estética</h2><ul><li>Antes e depois (o mais poderoso — com autorização do paciente)</li><li>Bastidores do procedimento (desmistifica e reduz medo)</li><li>Depoimentos em vídeo (prova social real)</li><li>Conteúdo educacional ("diferença entre botox e preenchimento")</li><li>Tendências ("o que está em alta na estética em 2026")</li></ul>` },

  { slug: "crm-para-clinica-estetica", title: "CRM para Clínica de Estética: Organize e Venda Mais", metaDesc: "Como usar CRM na sua clínica de estética para organizar leads, automatizar follow-up e aumentar conversão de procedimentos.", keyword: "CRM clínica estética", cluster: "estetica", readTime: 8,
    content: `<h2>Estética precisa de CRM diferente</h2><p>O CRM de uma clínica de estética precisa rastrear informações que CRMs genéricos não contemplam: histórico de procedimentos, intervalos de manutenção, preferências pessoais, fotos de evolução e sensibilidade a preço.</p><h2>Funcionalidades essenciais</h2><h3>Funil visual personalizado</h3><p>Etapas: Lead Novo → Interesse Qualificado → Avaliação Agendada → Orçamento Apresentado → Procedimento Agendado → Em Tratamento → Manutenção.</p><h3>Automação de manutenção</h3><p>Toxina botulínica dura 4-6 meses. Preenchimento, 12-18 meses. O CRM deve enviar automaticamente lembretes de retorno com antecedência: "Já faz 5 meses do seu botox. Hora de agendar a manutenção?"</p><h3>Portfólio de pacientes</h3><p>Fotos de antes/depois organizadas por procedimento e tipo de paciente. Útil na consulta para mostrar resultados similares.</p><h3>Segmentação para campanhas</h3><p>Agrupe pacientes por: procedimento realizado, ticket médio, frequência de visita. Isso permite campanhas segmentadas: "Para quem já fez harmonização: conheça nosso protocolo de skincare complementar."</p><h2>O impacto nos números</h2><p>Clínicas de estética com CRM configurado reportam: 30% mais retorno para manutenção, 25% mais cross-sell de procedimentos complementares, e 40% menos leads perdidos.</p>` },

  { slug: "remarketing-clinica-estetica", title: "Remarketing para Clínica de Estética: Recupere Pacientes", metaDesc: "Estratégias de remarketing para recuperar pacientes que não fecharam na sua clínica de estética. WhatsApp, Meta Ads e e-mail marketing.", keyword: "remarketing clínica estética", cluster: "estetica", readTime: 8,
    content: `<h2>O paciente de estética decide emocionalmente</h2><p>Procedimentos estéticos são compras emocionais — o paciente quer, mas encontra razões para adiar. O remarketing mantém o desejo vivo e oferece o empurrão final para a decisão.</p><h2>Remarketing por WhatsApp</h2><p>Sequência para quem fez avaliação e não fechou: Dia 2 — "Ficou alguma dúvida sobre o procedimento?" Dia 5 — Antes/depois de paciente com perfil similar. Dia 10 — Condição especial válida por 48h. Dia 20 — Conteúdo educacional sobre o procedimento.</p><h2>Remarketing por Meta Ads</h2><p>Crie audiência personalizada com quem visitou páginas de procedimentos no seu site ou interagiu com posts sobre tratamentos específicos. Mostre depoimentos em vídeo e antes/depois.</p><h2>Remarketing sazonal</h2><p>Estética tem sazonalidade forte: verão (corpo), inverno (rosto/peeling), festas de fim de ano (geral). Planeje campanhas de reativação alinhadas com cada estação.</p><h2>Reativação de base inativa</h2><p>Pacientes que não voltam há 6+ meses: "Sentimos sua falta! Temos novidades em [procedimento]. Que tal uma avaliação atualizada? Agendamento exclusivo para pacientes VIP."</p>` },

  { slug: "funil-de-vendas-estetica", title: "Funil de Vendas para Estética: Do Instagram à Cadeira", metaDesc: "Construa um funil de vendas eficiente para sua clínica de estética. Da captação no Instagram ao fechamento de procedimentos de alto ticket.", keyword: "funil de vendas estética", cluster: "estetica", readTime: 9,
    content: `<h2>O funil da estética tem características únicas</h2><p>Na estética, o funil é mais emocional e visual que em outros segmentos. O paciente compra aspiração, não solução de problema. Isso exige uma abordagem diferente em cada etapa.</p><h2>Etapa 1: Atração visual</h2><p>Instagram é o topo do funil. Conteúdo que funciona: transformações impactantes (antes/depois), bastidores humanizados, depoimentos emocionais, tendências e novidades. O objetivo não é vender — é despertar o desejo.</p><h2>Etapa 2: Captura de interesse</h2><p>Do conteúdo para o contato: link na bio, botão de WhatsApp, formulário no anúncio. Quanto menos cliques entre o desejo e o contato, mais leads.</p><h2>Etapa 3: Qualificação empática</h2><p>Na estética, qualificar é entender a motivação emocional. "O que gostaria de mudar?" revela mais que "qual procedimento deseja". Use essa informação para personalizar toda a jornada.</p><h2>Etapa 4: Experiência na consulta</h2><p>A consulta é o momento da verdade. Ambiente premium, atenção exclusiva, simulação do resultado, e apresentação do plano com opções de investimento. É venda consultiva, não venda de balcão.</p><h2>Etapa 5: Fechamento e pós</h2><p>Facilite o fechamento: parcelamento, combo de procedimentos, programa de fidelidade. Após o procedimento: foto de resultado, mensagem de cuidado, e convite para avaliar no Google.</p>` },

  { slug: "como-reduzir-cancelamentos-clinica-estetica", title: "Como Reduzir Cancelamentos em Clínica de Estética", metaDesc: "7 estratégias para reduzir cancelamentos e no-shows na sua clínica de estética. Automação, comunicação e gestão de agenda inteligente.", keyword: "reduzir cancelamentos clínica estética", cluster: "estetica", readTime: 7,
    content: `<h2>O impacto dos cancelamentos na estética</h2><p>Procedimentos estéticos ocupam slots longos (1-3 horas). Um cancelamento de última hora significa R$ 1.000-5.000 de receita perdida que dificilmente é reposta no mesmo dia.</p><h2>7 estratégias anti-cancelamento</h2><h3>1. Pré-pagamento parcial</h3><p>Solicite sinal de 20-30% no agendamento de procedimentos acima de R$ 1.000. Pacientes que pagam antecipado cancelam 70% menos.</p><h3>2. Confirmação em 3 etapas</h3><p>Confirmação imediata + lembrete 48h antes + confirmação final 24h antes. Se não confirmar na última etapa, libere o horário para lista de espera.</p><h3>3. Conteúdo pré-procedimento</h3><p>Envie 2 dias antes: "Dicas de preparo para seu [procedimento]". Isso aumenta o comprometimento emocional com o agendamento.</p><h3>4. Lista de espera VIP</h3><p>Mantenha lista de pacientes interessados em horários de última hora. Cancelos viram oportunidades.</p><h3>5. Política clara e gentil</h3><p>Comunique no agendamento: "Para garantir o melhor atendimento, pedimos que cancelamentos sejam feitos com 48h de antecedência."</p><h3>6. Facilidade para reagendar</h3><p>Ofereça reagendamento imediato ao invés de cancelamento. "Não pode nessa data? Posso mover para [alternativas]?"</p><h3>7. Relacionamento contínuo</h3><p>Pacientes que se sentem valorizados cancelam menos. Mensagens de aniversário, novidades exclusivas e programa VIP fortalecem o vínculo.</p>` },

  { slug: "scripts-vendas-procedimentos-esteticos", title: "Scripts de Vendas para Procedimentos Estéticos", metaDesc: "Scripts testados para vender procedimentos estéticos de alto ticket. WhatsApp, consulta e follow-up com abordagem consultiva.", keyword: "scripts vendas procedimentos estéticos", cluster: "estetica", readTime: 8,
    content: `<h2>A abordagem na estética é diferente</h2><p>Na estética, pressão espanta. A abordagem deve ser empática, consultiva e aspiracional. Você não está "vendendo" — está ajudando a paciente a realizar um desejo.</p><h2>Script: Primeira resposta (WhatsApp)</h2><p>"Oi, [nome]! Que bom que nos procurou. Vi que você se interessou por [procedimento]. É um dos mais procurados! Posso te contar um pouco mais sobre como funciona e tirar suas dúvidas?"</p><h2>Script: Qualificação empática</h2><p>"Para te orientar da melhor forma: o que te motivou a buscar [procedimento]? Já fez algo parecido antes?"</p><h2>Script: Convite para consulta</h2><p>"Cada rosto/corpo é único, então o ideal é fazer uma avaliação personalizada. O [doutor/a] vai analisar seu caso e mostrar como ficaria o resultado. A avaliação é sem compromisso — quer agendar?"</p><h2>Script: Follow-up pós-consulta</h2><p>"[Nome], tudo bem? Queria saber como você está se sentindo sobre o plano que conversamos. Vi que ficou encantada com a simulação! Temos condição especial para agendar até [data]."</p><h2>Script: Reativação de paciente</h2><p>"[Nome], quanto tempo! Lembrei de você porque chegou [novidade/procedimento novo] que combina muito com seu perfil. Quer saber mais?"</p>` },

  { slug: "taxa-conversao-clinica-estetica", title: "Taxa de Conversão em Clínica de Estética: Benchmarks", metaDesc: "Benchmarks de taxa de conversão para clínicas de estética por etapa do funil. Como calcular e melhorar cada indicador.", keyword: "taxa conversão clínica estética", cluster: "estetica", readTime: 7,
    content: `<h2>Benchmarks da estética</h2><h3>Lead → Qualificado: 30-50%</h3><p>A estética gera muitos leads curiosos (especialmente via Instagram). A taxa de qualificação tende a ser menor que odontologia. Solução: melhorar a qualificação na etapa de anúncio.</p><h3>Qualificado → Avaliação agendada: 50-70%</h3><p>Leads qualificados na estética têm boa taxa de agendamento — o desejo já existe. O desafio é converter rápido antes que o impulso passe.</p><h3>Agendado → Compareceu: 65-80%</h3><p>No-show na estética tende a ser um pouco maior por ser decisão emocional. Confirmação em 3 etapas é essencial.</p><h3>Compareceu → Fechou: 40-60%</h3><p>Depende muito da experiência na consulta e da apresentação visual. Clínicas com simulação digital convertem 20% mais.</p><h2>Taxa geral saudável: 10-20%</h2><p>Considerando o funil completo, 10-20% de conversão lead-to-patient é saudável na estética. Abaixo de 10%, há vazamentos significativos.</p>` },

  { slug: "follow-up-clinica-estetica", title: "Follow-up para Clínica de Estética: Sequência Completa", metaDesc: "Como montar uma sequência de follow-up para clínica de estética que converte sem parecer insistente. Templates e automação.", keyword: "follow-up clínica estética", cluster: "estetica", readTime: 7,
    content: `<h2>Follow-up na estética: sutileza é a chave</h2><p>O paciente de estética não gosta de pressão. O follow-up precisa ser elegante, visual e aspiracional — nunca agressivo.</p><h2>Sequência de 5 toques</h2><h3>Toque 1 (Dia 2): Dúvidas</h3><p>"[Nome], tudo bem? Queria saber se ficou alguma dúvida sobre [procedimento]. Estou aqui para esclarecer qualquer ponto."</p><h3>Toque 2 (Dia 5): Prova social</h3><p>Envie foto ou vídeo de resultado de paciente com perfil similar (com autorização). "Olha o resultado da [paciente] que fez o mesmo procedimento que conversamos."</p><h3>Toque 3 (Dia 8): Conteúdo educacional</h3><p>Artigo ou vídeo explicando o procedimento em detalhes. "Separei esse conteúdo porque explica exatamente como funciona e os cuidados pós."</p><h3>Toque 4 (Dia 12): Condição especial</h3><p>"[Nome], temos uma condição especial para [procedimento] válida até [data]. Inclui [benefício]. Quer que eu reserve para você?"</p><h3>Toque 5 (Dia 18): Despedida elegante</h3><p>"[Nome], vou deixar seu atendimento em aberto. Quando sentir que é o momento, é só me chamar. Desejo que se sinta linda todos os dias!"</p>` },

  // ── CLUSTER IMOBILIÁRIA (10) ──
  { slug: "processo-comercial-imobiliaria", title: "Processo Comercial para Imobiliária: Guia Completo 2026", metaDesc: "Monte um processo comercial eficiente para sua imobiliária. Da captação de leads à venda fechada com CRM, automação e scripts.", keyword: "processo comercial imobiliária", cluster: "imobiliaria", readTime: 11,
    content: `<h2>O problema das imobiliárias: muitos leads, poucas vendas</h2><p>Imobiliárias investem pesado em portais (ZAP, OLX, Viva Real) e tráfego pago. Os leads chegam aos montes. Mas a conversão é baixíssima — 1-3% na maioria dos casos. O problema não é captação. É processo.</p><h2>O funil imobiliário em 6 etapas</h2><h3>1. Captação multicanal</h3><p>Portais imobiliários, Google Ads, Meta Ads, site próprio, indicações. Cada canal tem um perfil de lead diferente — e deve ter um tratamento diferente.</p><h3>2. Resposta imediata (< 5 minutos)</h3><p>No mercado imobiliário, o lead consulta 3-5 imobiliárias ao mesmo tempo. Quem responde primeiro agenda a visita. Automação é obrigatória.</p><h3>3. Qualificação BANT</h3><p>Budget (orçamento), Authority (quem decide), Need (necessidade real), Timeline (prazo). Qualifique antes de investir tempo com visitas.</p><h3>4. Visitas direcionadas</h3><p>Com a qualificação feita, direcione para imóveis que realmente fazem sentido. Menos visitas, mais assertivas, maior taxa de proposta.</p><h3>5. Negociação estruturada</h3><p>Scripts de negociação para cada objeção: preço, localização, tamanho, financiamento. O corretor não improvisa — segue um processo testado.</p><h3>6. Pós-venda e indicação</h3><p>Cliente satisfeito indica. Automatize o pedido de indicação 30 dias após a entrega das chaves.</p><h2>Por que imobiliárias precisam de CRM</h2><p>Sem CRM, o corretor guarda leads no WhatsApp pessoal e leva embora quando sai. Com CRM, os leads são da imobiliária — e todo o histórico fica registrado.</p>` },

  { slug: "como-converter-leads-imobiliarios", title: "Como Converter Leads Imobiliários: De 2% para 10%", metaDesc: "Triplique a conversão de leads na sua imobiliária com resposta rápida, qualificação automática e follow-up estruturado.", keyword: "converter leads imobiliários", cluster: "imobiliaria", readTime: 10,
    content: `<h2>A taxa de conversão média é vergonhosa</h2><p>A maioria das imobiliárias converte entre 1-3% dos leads. Isso significa que para cada 100 leads gerados, 97-99 são desperdiçados. Com ticket médio de venda de R$ 300.000-500.000, cada lead perdido custa caro.</p><h2>Os 3 pontos de vazamento</h2><h3>Vazamento 1: Tempo de resposta</h3><p>Estudo da Associação dos Corretores mostra que 50% dos leads imobiliários são abandonados sem nenhuma resposta. Os outros 50% demoram em média 6 horas para receber retorno. O comprador já visitou 2 imóveis do concorrente.</p><h3>Vazamento 2: Qualificação inexistente</h3><p>O corretor pega o lead, agenda visita sem qualificar, perde 2 horas mostrando imóvel errado. Lead desengaja. Corretor desmotiva.</p><h3>Vazamento 3: Follow-up abandonado</h3><p>Imóvel é compra de alto envolvimento. O ciclo de decisão é 30-120 dias. Se você não mantém contato durante esse período, perde a venda para quem manteve.</p><h2>O framework de conversão 10%</h2><ul><li>Resposta automática em < 3 minutos (WhatsApp + SMS)</li><li>Qualificação em 5 perguntas antes da primeira visita</li><li>Matching automático: lead qualificado → imóveis compatíveis</li><li>Follow-up de 30 dias com 8 toques progressivos</li><li>Nurturing de 120 dias para leads de ciclo longo</li></ul>` },

  { slug: "crm-para-imobiliarias", title: "CRM para Imobiliárias: Como Escolher e Implementar", metaDesc: "Guia completo de CRM para imobiliárias. Funcionalidades essenciais, comparativo de ferramentas e como implementar sem travar a equipe.", keyword: "CRM para imobiliárias", cluster: "imobiliaria", readTime: 9,
    content: `<h2>Imobiliária sem CRM é avião sem painel</h2><p>Você não sabe quantos leads entraram, quantos foram atendidos, quantos visitaram, quantos fizeram proposta. Sem CRM, cada corretor é uma caixa-preta.</p><h2>Funcionalidades obrigatórias</h2><h3>Integração com portais</h3><p>ZAP, OLX, Viva Real, Chaves na Mão. Leads entram automaticamente no CRM com a fonte identificada.</p><h3>Distribuição automática de leads</h3><p>Leads distribuídos por rodízio, especialidade (tipo de imóvel) ou região. Sem briga entre corretores.</p><h3>Funil visual de vendas</h3><p>Etapas: Lead Novo → Qualificado → Visita Agendada → Visita Realizada → Proposta → Negociação → Venda Fechada.</p><h3>Histórico completo de interações</h3><p>Todas as mensagens, ligações, visitas e propostas registradas. Se o corretor sai, o relacionamento fica.</p><h3>Automação de follow-up</h3><p>Regras: "Se lead não respondeu em 24h → enviar mensagem automática". "Se visita foi há 3 dias sem proposta → enviar comparativo de imóveis similares".</p><h3>Dashboard de performance</h3><p>Métricas por corretor, por canal, por tipo de imóvel. Quem converte mais? Qual canal tem melhor ROI? Onde está o gargalo?</p>` },

  { slug: "funil-de-vendas-imobiliaria", title: "Funil de Vendas para Imobiliária: Guia Prático 2026", metaDesc: "Como construir um funil de vendas imobiliário eficiente. Etapas, métricas, automação e como parar de perder compradores.", keyword: "funil de vendas imobiliária", cluster: "imobiliaria", readTime: 10,
    content: `<h2>O funil imobiliário é mais longo que você pensa</h2><p>A compra de um imóvel leva em média 60-120 dias da primeira busca ao fechamento. Muitas imobiliárias tratam como se fosse decisão de 1 semana — e perdem o comprador para quem teve paciência de acompanhar o processo.</p><h2>As 7 etapas do funil imobiliário</h2><h3>1. Descoberta (Dia 1-7)</h3><p>O comprador começa a pesquisar. Visita portais, busca no Google, olha Instagram. Seu imóvel precisa aparecer aqui.</p><h3>2. Interesse (Dia 7-14)</h3><p>O comprador seleciona 5-10 opções e pede informações. Resposta rápida e qualificação definem quem avança.</p><h3>3. Visita (Dia 14-30)</h3><p>Visitas presenciais ou tours virtuais. A experiência da visita é crucial — imóvel limpo, bem iluminado, corretor preparado.</p><h3>4. Comparação (Dia 30-60)</h3><p>O comprador compara opções. Aqui o follow-up faz a diferença: envie comparativos, informações do bairro, condições de financiamento.</p><h3>5. Proposta (Dia 45-75)</h3><p>O comprador faz proposta. Negociação de preço, condições, prazos. Script de negociação estruturado evita concessões desnecessárias.</p><h3>6. Fechamento (Dia 60-120)</h3><p>Documentação, financiamento, vistoria. Acompanhamento próximo evita que a venda caia por burocracia.</p><h3>7. Pós-venda</h3><p>Entrega das chaves, boas-vindas, pedido de indicação. O ciclo recomeça.</p>` },

  { slug: "follow-up-automatico-imobiliaria", title: "Follow-up Automático para Imobiliária: Sequência Completa", metaDesc: "Como montar uma sequência de follow-up automático que mantém o comprador engajado por 120 dias. Templates para WhatsApp e e-mail.", keyword: "follow-up automático imobiliária", cluster: "imobiliaria", readTime: 8,
    content: `<h2>120 dias de follow-up: a maratona que vende</h2><p>O ciclo de compra imobiliária é longo. Sem follow-up consistente durante todo o processo, o comprador esfria e fecha com outro corretor que manteve contato.</p><h2>Sequência para as primeiras 2 semanas</h2><p><strong>Dia 0:</strong> Resposta imediata + qualificação. <strong>Dia 1:</strong> Envio de opções compatíveis com o perfil. <strong>Dia 3:</strong> "Viu as opções? Qual mais te interessou?" <strong>Dia 5:</strong> Convite para visita. <strong>Dia 7:</strong> Informação sobre o bairro/região. <strong>Dia 10:</strong> Novos imóveis compatíveis. <strong>Dia 14:</strong> "Está avançando na busca? Posso ajudar com financiamento?"</p><h2>Sequência mensal (dia 15-120)</h2><p>Após as 2 semanas iniciais, envie 1 contato por semana: novos imóveis, informações de mercado, dicas de financiamento, comparativos de bairros. Mantenha-se presente sem ser invasivo.</p><h2>Automação é obrigatória</h2><p>Com 50+ leads ativos simultaneamente em diferentes estágios do funil, é impossível fazer follow-up manual consistente. A automação garante que nenhum lead é esquecido.</p>` },

  { slug: "como-qualificar-leads-imobiliarios", title: "Como Qualificar Leads Imobiliários em 5 Perguntas", metaDesc: "Framework de qualificação rápida para leads imobiliários. 5 perguntas que separam compradores reais de curiosos em menos de 3 minutos.", keyword: "qualificar leads imobiliários", cluster: "imobiliaria", readTime: 7,
    content: `<h2>Qualificação evita perda de tempo</h2><p>Cada visita custa tempo e dinheiro. Visitar imóvel com lead não qualificado é o maior desperdício de uma imobiliária. 5 perguntas resolvem isso.</p><h2>As 5 perguntas essenciais</h2><h3>1. "Qual tipo de imóvel procura?"</h3><p>Apartamento, casa, comercial, terreno. Quantos quartos, garagens. Isso filtra 30% dos leads que estão no imóvel errado.</p><h3>2. "Qual região de preferência?"</h3><p>Bairro, cidade, proximidade de escola/trabalho. Leads com região definida são mais sérios.</p><h3>3. "Qual sua faixa de investimento?"</h3><p>Não pergunte "quanto quer gastar" — pergunte a faixa. Isso é menos invasivo e já filtra incompatibilidade.</p><h3>4. "Em quanto tempo pretende se mudar?"</h3><p>Até 30 dias = urgente (prioridade máxima). 1-3 meses = planejando (follow-up ativo). 6+ meses = pesquisando (nurturing longo).</p><h3>5. "Vai financiar ou pagar à vista?"</h3><p>Compradores com financiamento pré-aprovado são significativamente mais propensos a fechar. Se precisa de aprovação, ajude a iniciar o processo.</p><h2>Automatize a qualificação</h2><p>Essas 5 perguntas podem ser feitas automaticamente via WhatsApp assim que o lead entra. O corretor recebe o lead já qualificado, com perfil, região, budget e timeline definidos.</p>` },

  { slug: "remarketing-para-imobiliarias", title: "Remarketing para Imobiliárias: Recupere Compradores", metaDesc: "Estratégias de remarketing para recuperar compradores que não fecharam. Meta Ads, e-mail, WhatsApp e portais imobiliários.", keyword: "remarketing imobiliárias", cluster: "imobiliaria", readTime: 8,
    content: `<h2>O comprador que não fechou hoje pode fechar em 60 dias</h2><p>No mercado imobiliário, "não" raramente significa "nunca". Geralmente significa "não agora" ou "não esse imóvel". Remarketing mantém sua imobiliária presente durante todo o ciclo de decisão.</p><h2>4 canais de remarketing imobiliário</h2><h3>1. WhatsApp com novidades</h3><p>Envie novos imóveis que combinem com o perfil do comprador. "Vi esse imóvel e lembrei do que você procura. Quer dar uma olhada?"</p><h3>2. Meta Ads com audiência personalizada</h3><p>Crie audiência de quem visitou seu site ou interagiu com anúncios nos últimos 90 dias. Mostre imóveis novos e depoimentos de compradores satisfeitos.</p><h3>3. E-mail com curadoria</h3><p>Newsletter semanal com imóveis selecionados para cada perfil de comprador. Inclua dicas de financiamento e informações de mercado.</p><h3>4. Alertas de preço</h3><p>"Um imóvel que você visitou teve redução de preço." Ou: "Novo imóvel na região que você procura, dentro da sua faixa." Esses alertas têm taxa de abertura de 40%+.</p>` },

  { slug: "scripts-vendas-corretores", title: "Scripts de Vendas para Corretores de Imóveis", metaDesc: "Scripts prontos para corretores: primeiro contato, qualificação, visita, negociação e fechamento. Testados no mercado imobiliário.", keyword: "scripts vendas corretores imóveis", cluster: "imobiliaria", readTime: 9,
    content: `<h2>Corretor com script vende mais</h2><p>Script não engessa — liberta. O corretor não precisa pensar no que dizer a cada interação. Foca na escuta e no relacionamento enquanto o processo garante que tudo importante é comunicado.</p><h2>Script: Primeiro contato</h2><p>"Olá, [nome]! Sou o [corretor] da [imobiliária]. Vi seu interesse no [imóvel/tipo]. Ótima escolha de região! Para te ajudar da melhor forma, posso fazer algumas perguntas rápidas?"</p><h2>Script: Convite para visita</h2><p>"Com base no que me contou, tenho [X] opções que combinam perfeitamente. A melhor forma de decidir é conhecer pessoalmente. Temos disponibilidade [data] às [hora]. Funciona para você?"</p><h2>Script: Pós-visita</h2><p>"[Nome], como foi a impressão? Qual dos imóveis mais chamou atenção? [Se positivo]: Quer que eu levante as condições de financiamento para esse? [Se negativo]: O que faltou? Tenho outras opções que podem se encaixar melhor."</p><h2>Script: Negociação de preço</h2><p>"Entendo que o valor é um ponto importante. Vou conversar com o proprietário para encontrar a melhor condição. Qual seria o valor que funciona para vocês? Assim consigo negociar com mais clareza."</p><h2>Script: Fechamento</h2><p>"[Nome], consegui [condição negociada]. Isso resolve o ponto que tínhamos? [Se sim]: Ótimo! Vamos formalizar para garantir o imóvel — outros interessados também estão em negociação."</p>` },

  { slug: "taxa-conversao-imobiliaria", title: "Taxa de Conversão Imobiliária: Benchmarks por Etapa", metaDesc: "Benchmarks de conversão para imobiliárias por etapa do funil. Como calcular e melhorar cada indicador para vender mais imóveis.", keyword: "taxa conversão imobiliária", cluster: "imobiliaria", readTime: 7,
    content: `<h2>Benchmarks do mercado imobiliário</h2><h3>Lead → Qualificado: 20-35%</h3><p>Leads de portais têm qualificação mais baixa (muitos curiosos). Leads de Google Ads têm qualificação mais alta (busca ativa).</p><h3>Qualificado → Visita: 40-60%</h3><p>Qualificados que agendam visita. Velocidade de resposta e disponibilidade de horários são os fatores críticos.</p><h3>Visita → Proposta: 20-35%</h3><p>Depende do match entre perfil do comprador e imóvel visitado. Qualificação bem feita aumenta essa taxa drasticamente.</p><h3>Proposta → Venda: 40-60%</h3><p>Depende da negociação e da agilidade na documentação. Scripts de negociação e apoio em financiamento fazem diferença.</p><h2>Taxa geral saudável: 3-8%</h2><p>De lead a venda fechada. A maioria das imobiliárias está em 1-3%. Chegar a 5-8% com processo estruturado é plenamente viável e representa 2-3x mais vendas com o mesmo investimento em leads.</p>` },

  { slug: "automacao-vendas-imobiliaria", title: "Automação de Vendas para Imobiliária: O Que Automatizar", metaDesc: "O que automatizar no processo de vendas da sua imobiliária para vender mais com menos esforço. Guia prático de automação imobiliária.", keyword: "automação vendas imobiliária", cluster: "imobiliaria", readTime: 8,
    content: `<h2>O que automatizar (e o que não automatizar)</h2><p>Automação na imobiliária não substitui o corretor — amplifica sua capacidade. Automatize o operacional para que o corretor foque no relacional.</p><h2>Automatize:</h2><h3>Primeira resposta</h3><p>Mensagem automática em < 3 minutos com agradecimento + qualificação inicial. O corretor assume com o lead já qualificado.</p><h3>Distribuição de leads</h3><p>Leads distribuídos automaticamente por rodízio ou especialidade. Sem espera, sem conflito.</p><h3>Follow-up de rotina</h3><p>Sequências automáticas para leads que não responderam, compradores que visitaram mas não fizeram proposta, e clientes em fase de documentação.</p><h3>Alertas de novos imóveis</h3><p>Quando um imóvel novo entra no portfólio que combina com o perfil de leads ativos, notificação automática.</p><h3>Lembretes e confirmações</h3><p>Confirmação de visita, lembrete de reunião, follow-up pós-visita.</p><h2>Não automatize:</h2><ul><li>A visita presencial (o fator humano é insubstituível)</li><li>A negociação de preço (requer sensibilidade)</li><li>O fechamento (momento de celebração e confiança)</li><li>Situações de conflito ou insatisfação (requer empatia real)</li></ul>` },

  // ── CLUSTER ENGENHARIA DE VENDAS (10) ──
  { slug: "o-que-e-engenharia-de-vendas", title: "O Que é Engenharia de Vendas e Por Que Sua Empresa Precisa", metaDesc: "Entenda o que é engenharia de vendas, como difere de marketing e vendas tradicionais, e por que empresas que implementam crescem 3x mais.", keyword: "o que é engenharia de vendas", cluster: "engenharia-vendas", readTime: 10,
    content: `<h2>Além do marketing, além das vendas</h2><p>Marketing gera leads. Vendas fecha negócios. Mas entre esses dois pontos existe um abismo que a maioria das empresas ignora: o processo comercial. Engenharia de vendas é a disciplina que projeta, constrói e opera esse processo de ponta a ponta.</p><h2>A analogia da fábrica</h2><p>Imagine uma fábrica sem processo de produção. Cada funcionário improvisa. Não há esteira, não há controle de qualidade, não há medição. O resultado é imprevisível. Agora imagine que essa "fábrica" é o seu comercial.</p><p>Engenharia de vendas aplica ao processo comercial os mesmos princípios que a engenharia de produção aplica a uma fábrica: processo definido, métricas em cada etapa, automação do repetitivo, e melhoria contínua baseada em dados.</p><h2>Os 4 pilares da engenharia de vendas</h2><h3>1. Processo</h3><p>Cada etapa definida: o que acontece, quem faz, quando faz, e qual o critério para avançar para a próxima etapa.</p><h3>2. Dados</h3><p>Métricas em tempo real: taxa de conversão por etapa, tempo médio em cada estágio, custo por aquisição, ROI por canal.</p><h3>3. Automação</h3><p>Tudo que é repetitivo é automatizado: primeira resposta, qualificação, follow-up, lembretes, relatórios.</p><h3>4. Otimização contínua</h3><p>Dados alimentam melhorias. O que funciona é ampliado. O que não funciona é ajustado. O processo melhora toda semana.</p><h2>A diferença nos resultados</h2><p>Empresas com processo comercial estruturado crescem 3x mais rápido que empresas que dependem de vendedores individuais. Não porque os vendedores são melhores — mas porque o sistema garante consistência.</p>` },

  { slug: "engenharia-de-receita-o-que-e", title: "Engenharia de Receita: O Que É e Como Funciona", metaDesc: "Engenharia de receita vai além de marketing e vendas. Descubra como essa abordagem integra captação, processo comercial e dados para gerar receita previsível.", keyword: "engenharia de receita", cluster: "engenharia-vendas", readTime: 9,
    content: `<h2>De leads a receita: a mudança de paradigma</h2><p>O mercado está cheio de empresas que "geram leads". Agências de marketing, ferramentas de automação, plataformas de anúncios. Mas gerar leads não gera receita. O que gera receita é o processo que transforma leads em clientes pagantes.</p><p><strong>Engenharia de receita</strong> é a abordagem que integra captação, processo comercial e análise de dados em um sistema único com um objetivo: gerar receita previsível e crescente.</p><h2>Os 3 componentes</h2><h3>Captação inteligente</h3><p>Não é sobre gastar mais em tráfego. É sobre investir nos canais certos, com as mensagens certas, para o público certo. E medir o retorno de cada real investido.</p><h3>Processo comercial operado</h3><p>Cada lead que entra percorre um caminho definido. Resposta rápida, qualificação, agendamento, follow-up, remarketing. Nenhum lead é desperdiçado.</p><h3>Dashboard de previsibilidade</h3><p>Em tempo real: quantos leads entraram, quantos foram qualificados, quantos agendaram, quantos fecharam, quanto de receita gerou. Isso permite prever o faturamento do próximo mês com precisão.</p><h2>Por que "engenharia"?</h2><p>Porque é projetada, construída e operada como um sistema de engenharia — não como "tentativa e erro" de marketing. Há processo, há medição, há melhoria contínua. O resultado é previsibilidade.</p>` },

  { slug: "como-montar-processo-comercial-do-zero", title: "Como Montar um Processo Comercial do Zero: Passo a Passo", metaDesc: "Guia prático para montar um processo comercial do zero. 8 etapas para sair do caos para um sistema que gera receita previsível.", keyword: "como montar processo comercial", cluster: "engenharia-vendas", readTime: 12,
    content: `<h2>Do caos ao processo em 8 etapas</h2><p>Se hoje seu comercial funciona na base da improvisação — cada vendedor faz do seu jeito, leads se perdem, não há métricas — este guia é para você.</p><h3>Etapa 1: Mapeie o estado atual</h3><p>Antes de construir, entenda onde está. Quantos leads entram por mês? De quais fontes? Quanto tempo leva para responder? Qual a taxa de conversão? Se não sabe, esse é o primeiro problema.</p><h3>Etapa 2: Defina as etapas do funil</h3><p>Crie etapas claras com critérios de passagem: Lead Novo → Qualificado → Reunião Agendada → Proposta Enviada → Negociação → Fechado. Adapte ao seu negócio.</p><h3>Etapa 3: Implemente um CRM</h3><p>Todo lead precisa estar registrado em um sistema. Não em planilha, não no WhatsApp pessoal, não na cabeça do vendedor. CRM é a espinha dorsal do processo.</p><h3>Etapa 4: Crie scripts para cada etapa</h3><p>Primeiro contato, qualificação, agendamento, apresentação, follow-up, negociação. Scripts não robotizam — padronizam a excelência.</p><h3>Etapa 5: Automatize o repetitivo</h3><p>Primeira resposta, lembretes, follow-up de rotina, relatórios. Libere a equipe para o que exige julgamento humano.</p><h3>Etapa 6: Defina métricas e metas</h3><p>Taxa de conversão por etapa, tempo médio em cada estágio, custo por aquisição. O que não é medido não é gerenciado.</p><h3>Etapa 7: Treine a equipe</h3><p>Processo sem adesão é documento. Treine, acompanhe, ajuste. O processo serve a equipe, não o contrário.</p><h3>Etapa 8: Otimize semanalmente</h3><p>Revise os dados toda semana. Onde está o gargalo? Qual etapa tem maior perda? O que pode ser melhorado? Melhoria contínua é o que separa processos bons de processos excelentes.</p>` },

  { slug: "diferenca-marketing-engenharia-vendas", title: "Marketing vs. Engenharia de Vendas: Qual a Diferença?", metaDesc: "Entenda a diferença entre marketing digital e engenharia de vendas. Por que leads não pagam boletos e o que realmente gera receita.", keyword: "diferença marketing engenharia de vendas", cluster: "engenharia-vendas", readTime: 8,
    content: `<h2>Leads não pagam boletos. Clientes pagam.</h2><p>Marketing gera leads. Engenharia de vendas gera receita. Parece sutil, mas a diferença é enorme.</p><h2>O que o marketing faz (e não faz)</h2><p><strong>Faz:</strong> Gera visibilidade, atrai público, captura leads, constrói marca. <strong>Não faz:</strong> Qualifica leads, agenda reuniões, faz follow-up, fecha vendas, retém clientes.</p><h2>O que a engenharia de vendas faz</h2><p>Opera o processo comercial COMPLETO — da captação ao fechamento e além. Não para quando o lead chega. Só para quando a receita entra.</p><h2>A analogia do restaurante</h2><p>Marketing é o que traz as pessoas para a porta do restaurante: fachada bonita, avaliações no Google, promoções. Engenharia de vendas é o que acontece dentro: recepção, serviço, cardápio, experiência, conta. De nada adianta lotar a porta se dentro é um caos.</p><h2>Quando usar cada um</h2><ul><li><strong>Seu problema é visibilidade?</strong> Marketing resolve.</li><li><strong>Seu problema é conversão?</strong> Engenharia de vendas resolve.</li><li><strong>A maioria dos negócios?</strong> Precisa dos dois trabalhando juntos.</li></ul><p>O erro mais comum é achar que mais marketing resolve o problema de conversão. Não resolve. Resolve processo.</p>` },

  { slug: "por-que-sua-empresa-perde-leads", title: "Por Que Sua Empresa Perde Leads (E Como Parar)", metaDesc: "5 motivos pelos quais sua empresa perde leads e desperdiça o investimento em marketing. Diagnóstico prático com soluções imediatas.", keyword: "empresa perde leads", cluster: "engenharia-vendas", readTime: 8,
    content: `<h2>Você está jogando dinheiro fora</h2><p>Se sua empresa investe em tráfego pago e converte menos de 15% dos leads, tem um vazamento sério no processo comercial. Aqui estão os 5 motivos mais comuns.</p><h3>1. Demora na resposta</h3><p>Leads que não são contactados em 5 minutos têm 10x menos chance de converter. Se sua equipe leva horas, está perdendo 80% das oportunidades na porta de entrada.</p><h3>2. Sem qualificação</h3><p>Tratar todos os leads igual desperdiça tempo com quem não tem perfil e neglicencia quem está pronto para comprar.</p><h3>3. Sem follow-up</h3><p>O primeiro "não" raramente é definitivo. Mas sem follow-up estruturado, cada "não" vira um lead perdido para sempre.</p><h3>4. Sem CRM</h3><p>Leads em WhatsApp pessoal, planilhas, e-mails. Nenhuma visão centralizada. Nenhum histórico. Nenhuma previsibilidade.</p><h3>5. Sem dados</h3><p>Se você não sabe a taxa de conversão de cada etapa, não sabe onde está perdendo. E se não sabe onde perde, não pode corrigir.</p><h2>A solução não é mais leads</h2><p>A solução é parar de perder os que já tem. Um processo comercial bem montado pode triplicar sua conversão com zero aumento no investimento em tráfego.</p>` },

  { slug: "como-medir-roi-processo-comercial", title: "Como Medir o ROI do Seu Processo Comercial", metaDesc: "Aprenda a calcular o ROI real do seu processo comercial. Métricas essenciais, fórmulas práticas e como apresentar para a diretoria.", keyword: "ROI processo comercial", cluster: "engenharia-vendas", readTime: 8,
    content: `<h2>Se não mede, não existe</h2><p>A maioria das empresas não sabe o retorno real do investimento em processo comercial. Sabe quanto gasta em tráfego, mas não sabe quanto cada etapa do processo contribui para a receita.</p><h2>As 5 métricas essenciais</h2><h3>1. CAC — Custo de Aquisição de Cliente</h3><p>Total investido em marketing + vendas ÷ número de clientes novos. Se o CAC é maior que o lucro do primeiro pedido, você precisa de LTV alto para compensar.</p><h3>2. Taxa de conversão por etapa</h3><p>Lead → Qualificado → Agendado → Proposta → Fechado. Identificar qual etapa tem maior perda revela onde investir melhoria.</p><h3>3. Ciclo de venda</h3><p>Tempo médio de lead a fechamento. Reduzir o ciclo aumenta o volume sem aumentar a equipe.</p><h3>4. LTV — Lifetime Value</h3><p>Receita total que um cliente gera ao longo do relacionamento. Se o LTV é 10x o CAC, seu processo é saudável.</p><h3>5. ROI geral</h3><p>(Receita gerada - Investimento total) ÷ Investimento total × 100. Acima de 300% é excelente para processo comercial.</p><h2>Como apresentar para a diretoria</h2><p>"Investimos R$ X no processo comercial (CRM + automação + equipe). Geramos R$ Y em receita nova. ROI de Z%. Cada real investido retornou R$ W."</p>` },

  { slug: "funil-vendas-b2c-guia-completo", title: "Funil de Vendas B2C: Guia Completo para 2026", metaDesc: "Tudo sobre funil de vendas B2C: etapas, métricas, ferramentas e como construir um funil que converte para negócios que vendem para consumidor final.", keyword: "funil de vendas B2C", cluster: "engenharia-vendas", readTime: 11,
    content: `<h2>B2C: volume alto, decisão rápida</h2><p>Diferente do B2B, o funil B2C lida com alto volume de leads, decisão emocional e ciclos curtos. Isso exige automação robusta e comunicação ágil.</p><h2>As 4 fases do funil B2C</h2><h3>Fase 1: Atração em escala</h3><p>Google Ads, Meta Ads, TikTok, conteúdo orgânico. O objetivo é gerar volume de leads qualificados a um custo viável. No B2C, volume importa.</p><h3>Fase 2: Conversão imediata</h3><p>Landing pages otimizadas, formulários simples, WhatsApp click-to-chat. Quanto menos atrito, mais leads. No B2C, cada clique a mais perde 20% do público.</p><h3>Fase 3: Nutrição e follow-up</h3><p>Nem todo lead converte na primeira interação. Automação de WhatsApp, e-mail e remarketing mantêm o interesse vivo até o momento da compra.</p><h3>Fase 4: Fechamento e recompra</h3><p>Facilite o pagamento, ofereça garantias, reduza o risco percebido. Após a compra, programe recompra e indicação.</p><h2>Métricas B2C essenciais</h2><ul><li>CPL (Custo por Lead): R$ 5-50 dependendo do segmento</li><li>Taxa de conversão geral: 5-20%</li><li>CAC (Custo de Aquisição): deve ser < 25% do ticket</li><li>LTV/CAC: acima de 3x é saudável</li></ul>` },

  { slug: "como-criar-scripts-vendas-eficientes", title: "Como Criar Scripts de Vendas que Realmente Convertem", metaDesc: "Framework para criar scripts de vendas eficientes para qualquer segmento. Estrutura, exemplos e erros comuns que matam conversão.", keyword: "criar scripts de vendas", cluster: "engenharia-vendas", readTime: 9,
    content: `<h2>Script bom = conversa natural + processo garantido</h2><p>O objetivo do script não é robotizar o vendedor. É garantir que informações essenciais sejam comunicadas em toda interação, independente de quem atende.</p><h2>A estrutura AIDA para scripts</h2><h3>A — Atenção</h3><p>Primeira frase que captura. Personalize com nome e contexto. "Oi [nome], vi que você se interessou por [produto/serviço]. Ótima escolha!"</p><h3>I — Interesse</h3><p>Faça perguntas que revelem a necessidade. "O que te motivou a buscar isso?" A resposta guia todo o resto da conversa.</p><h3>D — Desejo</h3><p>Conecte seu produto à necessidade revelada. Use prova social, resultados de outros clientes, e benefícios específicos.</p><h3>A — Ação</h3><p>Convite claro para o próximo passo. "Posso agendar?" / "Quer que eu envie a proposta?" / "Qual forma de pagamento prefere?"</p><h2>Regras de ouro</h2><ul><li>Personalize sempre — use o nome e o contexto</li><li>Pergunte mais do que fale — escuta ativa vende mais</li><li>Antecipe objeções — tenha resposta pronta para as 5 mais comuns</li><li>Teste variações — A/B test em scripts dobra conversão</li><li>Treine a equipe — script no papel não vende, script praticado sim</li></ul>` },

  { slug: "follow-up-automatico-guia-completo", title: "Follow-up Automático: O Guia Definitivo para Vendas", metaDesc: "Tudo sobre follow-up automático: por que funciona, como montar sequências, ferramentas e templates prontos para qualquer segmento.", keyword: "follow-up automático", cluster: "engenharia-vendas", readTime: 10,
    content: `<h2>80% das vendas acontecem entre o 5º e o 12º contato</h2><p>Esse dado da National Sales Executive Association é ignorado por 90% das empresas, que desistem no 1º ou 2º contato. O follow-up é literalmente onde está o dinheiro.</p><h2>Por que automático?</h2><p>Porque humanos esquecem, ficam ocupados, priorizam o urgente sobre o importante. Automação garante consistência. Todo lead recebe toda a sequência, sem exceção.</p><h2>Anatomia da sequência perfeita</h2><h3>Toque 1 (imediato): Boas-vindas</h3><p>Reconheça o interesse, apresente-se, faça a primeira pergunta de qualificação.</p><h3>Toque 2 (24h): Valor</h3><p>Envie algo útil: conteúdo relevante, caso de sucesso, resposta a dúvida comum.</p><h3>Toque 3 (72h): Prova social</h3><p>Depoimento de cliente, resultado alcançado, número impactante.</p><h3>Toque 4 (7 dias): Oferta</h3><p>Condição especial, bônus por tempo limitado, convite para ação.</p><h3>Toque 5 (14 dias): Despedida estratégica</h3><p>"Vou fechar seu atendimento por aqui. Se no futuro precisar, estou disponível." Paradoxalmente, esse toque gera as maiores taxas de resposta.</p><h2>Regra de ouro: valor > frequência</h2><p>Cada mensagem deve entregar valor, não apenas cobrar resposta. Se toda mensagem é "e aí, vai comprar?", você está spammando, não fazendo follow-up.</p>` },

  { slug: "como-aumentar-taxa-de-conversao", title: "Como Aumentar a Taxa de Conversão do Seu Negócio", metaDesc: "10 táticas comprovadas para aumentar a taxa de conversão do seu processo comercial. De 5% para 25% sem aumentar investimento em tráfego.", keyword: "aumentar taxa de conversão", cluster: "engenharia-vendas", readTime: 10,
    content: `<h2>Conversão > Volume</h2><p>Dobrar a taxa de conversão tem o mesmo efeito que dobrar o investimento em tráfego — mas sem custo adicional. É a alavanca mais poderosa que existe em vendas.</p><h2>10 táticas que funcionam</h2><h3>1. Responda em menos de 5 minutos</h3><p>Sozinha, essa mudança pode dobrar sua conversão. Implemente automação de primeira resposta.</p><h3>2. Qualifique antes de investir tempo</h3><p>Pare de tratar todos os leads igual. Qualifique e priorize quem tem perfil, urgência e orçamento.</p><h3>3. Implemente follow-up de 5 toques</h3><p>A maioria desiste no 1º contato. 5 toques em 14 dias recupera 25-35% dos leads perdidos.</p><h3>4. Use scripts testados</h3><p>Padronize a comunicação da equipe. Teste variações. Escale o que funciona.</p><h3>5. Ofereça prova social</h3><p>Depoimentos, casos de estudo, números. Pessoas compram o que outros já compraram com sucesso.</p><h3>6. Reduza atrito no agendamento/compra</h3><p>Cada clique a mais perde 20% do público. Simplifique ao máximo.</p><h3>7. Trate objeções proativamente</h3><p>Antecipe as 5 objeções mais comuns e tenha respostas prontas antes que o cliente pergunte.</p><h3>8. Implemente urgência real</h3><p>Vagas limitadas, condição por tempo limitado, bônus exclusivo. Urgência real (não fabricada) acelera decisão.</p><h3>9. Meça cada etapa</h3><p>Identifique onde está o gargalo. Concentre esforço de melhoria na etapa de maior perda.</p><h3>10. Otimize semanalmente</h3><p>Revise dados toda semana. Melhoria contínua de 2% por semana = 170% de melhoria em um ano.</p>` },

  // ── CLUSTER IA E AUTOMAÇÃO (5) ──
  { slug: "agentes-ia-para-vendas", title: "Agentes de IA para Vendas: O Guia Completo 2026", metaDesc: "Como agentes de IA estão transformando o processo de vendas. Qualificação, follow-up e atendimento 24h automatizados com inteligência.", keyword: "agentes IA vendas", cluster: "ia-automacao", readTime: 11,
    content: `<h2>O que são agentes de IA para vendas?</h2><p>Agentes de IA são sistemas inteligentes que executam tarefas do processo comercial de forma autônoma: responder leads, qualificar prospects, agendar reuniões, fazer follow-up e até negociar. Diferente de chatbots simples, agentes de IA entendem contexto, aprendem com dados e tomam decisões.</p><h2>O que agentes de IA fazem melhor que humanos</h2><h3>Velocidade</h3><p>Respondem em segundos, 24/7. Enquanto um SDR atende 1 lead por vez, um agente atende 50 simultaneamente.</p><h3>Consistência</h3><p>Todo lead recebe o mesmo nível de atendimento. Sem dias ruins, sem esquecimentos, sem viés.</p><h3>Escala</h3><p>50 leads ou 5.000 — o custo não muda significativamente. A operação escala sem contratar.</p><h3>Dados</h3><p>Cada interação é registrada, analisada e usada para otimizar. O agente fica melhor a cada conversa.</p><h2>O que humanos fazem melhor</h2><ul><li>Negociações complexas com múltiplas variáveis</li><li>Relacionamento de longo prazo de alto valor</li><li>Situações emocionais que exigem empatia genuína</li><li>Decisões estratégicas que requerem contexto amplo</li></ul><h2>O modelo híbrido ideal</h2><p>Agentes de IA cuidam de: primeira resposta, qualificação, agendamento, follow-up, remarketing. Humanos cuidam de: consultas, negociações, fechamentos, relacionamento estratégico. Cada um no que é melhor.</p>` },

  { slug: "automacao-comercial-inteligencia-artificial", title: "Automação Comercial com IA: O Que Muda em 2026", metaDesc: "Como a inteligência artificial está transformando a automação comercial. Da resposta ao lead até o fechamento — o que já é possível automatizar.", keyword: "automação comercial inteligência artificial", cluster: "ia-automacao", readTime: 9,
    content: `<h2>Automação + IA: a combinação que muda tudo</h2><p>Automação tradicional segue regras fixas: "se lead não respondeu em 24h, enviar mensagem X". Automação com IA vai além: analisa o contexto, personaliza a mensagem e decide o melhor momento e canal para cada lead individualmente.</p><h2>O que muda com IA na automação</h2><h3>De templates fixos para mensagens personalizadas</h3><p>IA analisa o perfil do lead, o histórico da conversa e o comportamento (páginas visitadas, e-mails abertos) para gerar mensagens únicas e relevantes.</p><h3>De horário fixo para timing inteligente</h3><p>IA identifica o melhor horário para cada lead com base em padrões de resposta. Lead que responde à noite recebe mensagem à noite.</p><h3>De fluxo linear para decisão dinâmica</h3><p>Em vez de uma sequência fixa, IA decide o próximo passo com base no comportamento: lead engajou com conteúdo de preço? Enviar proposta. Lead visualizou mas não respondeu? Enviar depoimento.</p><h2>Aplicações práticas já disponíveis</h2><ul><li>Qualificação automática por conversação natural</li><li>Agendamento inteligente com integração de calendário</li><li>Follow-up adaptativo baseado em comportamento</li><li>Análise preditiva de probabilidade de fechamento</li><li>Relatórios automáticos com insights acionáveis</li></ul>` },

  { slug: "chatbot-vs-agente-ia-diferenca", title: "Chatbot vs. Agente de IA: Qual a Diferença Real?", metaDesc: "Entenda a diferença entre chatbot tradicional e agente de IA. Capacidades, limitações e qual escolher para seu processo comercial.", keyword: "chatbot vs agente IA", cluster: "ia-automacao", readTime: 7,
    content: `<h2>Não é a mesma coisa</h2><p>Muitas empresas acham que chatbot e agente de IA são sinônimos. Não são. A diferença é como comparar calculadora com computador — ambos fazem contas, mas um é infinitamente mais capaz.</p><h2>Chatbot tradicional</h2><ul><li>Segue fluxos pré-definidos (árvore de decisão)</li><li>Respostas fixas para perguntas previstas</li><li>Se o usuário sai do roteiro, trava ou dá resposta genérica</li><li>Não aprende com interações</li><li>Experiência robótica e frustrante</li></ul><h2>Agente de IA</h2><ul><li>Entende linguagem natural (contexto, intenção, nuance)</li><li>Gera respostas personalizadas para cada situação</li><li>Lida com perguntas inesperadas naturalmente</li><li>Aprende e melhora com cada conversa</li><li>Experiência próxima de conversar com humano</li></ul><h2>Exemplo prático</h2><p><strong>Paciente escreve:</strong> "quero arrumar meu sorriso mas tenho medo"</p><p><strong>Chatbot:</strong> "Você gostaria de: 1) Clareamento 2) Lentes 3) Ortodontia" (ignorou o medo)</p><p><strong>Agente IA:</strong> "Entendo seu receio! Muitos dos nossos pacientes sentiam o mesmo antes do tratamento. Posso te contar como funciona e tirar suas dúvidas? Qual aspecto do seu sorriso gostaria de melhorar?"</p><h2>Quando usar cada um</h2><p><strong>Chatbot:</strong> Perguntas frequentes simples (horário, endereço, preços tabelados). <strong>Agente de IA:</strong> Qualquer interação que envolva qualificação, venda consultiva ou relacionamento.</p>` },

  { slug: "como-ia-melhora-processo-comercial", title: "Como a IA Melhora Seu Processo Comercial: 7 Aplicações", metaDesc: "7 aplicações práticas de inteligência artificial que melhoram cada etapa do processo comercial. Da captação ao pós-venda.", keyword: "IA processo comercial", cluster: "ia-automacao", readTime: 9,
    content: `<h2>IA não substitui o processo — potencializa</h2><p>Inteligência artificial sem processo é ferramenta sem propósito. Processo sem IA é lento e limitado. Juntos, são imbatíveis.</p><h2>7 aplicações práticas</h2><h3>1. Resposta instantânea inteligente</h3><p>IA responde leads em segundos com mensagens personalizadas que parecem escritas por humano. A velocidade garante que você seja o primeiro a responder.</p><h3>2. Qualificação conversacional</h3><p>Em vez de formulários frios, IA qualifica através de conversa natural. Extrai perfil, necessidade, orçamento e timeline sem parecer interrogatório.</p><h3>3. Scoring preditivo de leads</h3><p>IA analisa dados do lead (fonte, comportamento, respostas) e atribui probabilidade de conversão. Equipe prioriza quem tem mais chance de fechar.</p><h3>4. Follow-up adaptativo</h3><p>Sequência de follow-up que muda baseada no comportamento. Lead abriu o e-mail mas não respondeu? Próximo toque é diferente de quem nem abriu.</p><h3>5. Análise de sentimento</h3><p>IA identifica se o lead está entusiasmado, hesitante ou desinteressado pela linguagem usada. Adapta o tom e a estratégia automaticamente.</p><h3>6. Previsão de receita</h3><p>Com base nos dados do funil, IA projeta a receita dos próximos 30, 60 e 90 dias com precisão crescente.</p><h3>7. Otimização contínua</h3><p>IA identifica padrões: qual script converte mais? Qual horário tem mais resposta? Qual canal gera leads melhores? E ajusta automaticamente.</p>` },

  { slug: "futuro-automacao-vendas-ia", title: "O Futuro da Automação de Vendas com IA em 2026", metaDesc: "Como a IA está moldando o futuro das vendas. Tendências, tecnologias emergentes e como se preparar para a transformação do processo comercial.", keyword: "futuro automação vendas IA", cluster: "ia-automacao", readTime: 10,
    content: `<h2>A terceira onda da automação de vendas</h2><p><strong>Primeira onda (2010-2018):</strong> CRMs e e-mail marketing. Organizou dados e automatizou comunicação em massa.</p><p><strong>Segunda onda (2018-2024):</strong> Chatbots e automação de fluxo. Automatizou interações simples e sequências fixas.</p><p><strong>Terceira onda (2024+):</strong> Agentes de IA autônomos. Executam tarefas complexas do processo comercial com autonomia e inteligência.</p><h2>O que já é realidade em 2026</h2><h3>Agentes que conversam como humanos</h3><p>IA generativa permite conversas naturais, empáticas e contextuais. O lead não percebe que está falando com IA.</p><h3>Operação comercial 24/7</h3><p>Equipes de agentes de IA operam o processo comercial completo sem intervalo. Leads de madrugada são atendidos com a mesma qualidade das 10h da manhã.</p><h3>Hiperpersonalização</h3><p>Cada lead recebe comunicação única baseada em seu perfil, comportamento e momento. Não é segmentação por grupo — é personalização individual.</p><h2>O que está por vir</h2><ul><li><strong>Agentes multimodais:</strong> IA que envia áudios, vídeos e imagens personalizadas</li><li><strong>Negociação autônoma:</strong> IA que negocia preços dentro de parâmetros definidos</li><li><strong>Previsão de churn:</strong> IA que identifica clientes em risco antes de cancelarem</li><li><strong>Orchestration de vendas:</strong> IA que coordena múltiplos agentes e canais simultaneamente</li></ul><h2>Como se preparar</h2><p>O primeiro passo não é comprar IA — é ter processo. IA sem processo é como motor de Ferrari num Fusca. Monte o processo, depois automatize com IA. E comece agora — quem esperar vai competir com quem já implementou.</p>` },
];

// ══════════════════════════════════════════════════════════════
// GENERATE BLOG INDEX PAGE
// ══════════════════════════════════════════════════════════════
function generateBlogIndex() {
  const cards = BLOG_POSTS.map(p => {
    const cl = CLUSTERS[p.cluster];
    const img = IMAGES[p.slug] || '';
    return `      <a href="/blog/${p.slug}/" class="blog-card">
        ${img ? `<img src="${img.replace('w=1200&h=630', 'w=600&h=340')}" alt="${p.title}" class="blog-card__img" loading="lazy">` : ''}
        <span class="blog-card__cluster blog-card__cluster--${cl.css}">${cl.label}</span>
        <h3 class="blog-card__title">${p.title}</h3>
        <p class="blog-card__desc">${p.metaDesc}</p>
        <span class="blog-card__link">Ler artigo →</span>
      </a>`;
  }).join('\n');

  const filters = Object.entries(CLUSTERS).map(([key, val]) =>
    `<button class="blog-filter" data-cluster="${key}">${val.label}</button>`
  ).join('\n      ');

  const body = `
  <section class="page-hero">
    <div class="container">
      <span class="eyebrow">Blog FlowAI</span>
      <h1 class="page-hero__title">Engenharia de Receita<br>na prática.</h1>
      <p class="page-hero__sub">Conteúdo prático sobre processo comercial, automação de vendas e IA para clínicas odontológicas, estéticas e imobiliárias.</p>
      <div class="blog-filters">
        <button class="blog-filter active" data-cluster="all">Todos</button>
        ${filters}
      </div>
    </div>
  </section>
  <section class="section">
    <div class="container">
      <div class="blog-grid" id="blogGrid">
${cards}
      </div>
    </div>
  </section>`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "Blog FlowAI Digital",
    "description": "Conteúdo sobre engenharia de vendas, processo comercial e automação com IA.",
    "url": `${DOMAIN}/blog/`,
    "publisher": { "@type": "Organization", "name": "FlowAI Digital" }
  };

  const html = pageHTML({
    title: "Blog | FlowAI Digital — Engenharia de Receita na Prática",
    metaDesc: "Conteúdo prático sobre processo comercial, automação de vendas e IA para clínicas odontológicas, estéticas e imobiliárias.",
    canonical: "/blog/",
    schema,
    breadcrumbs: [{ name: "Home", url: "/" }, { name: "Blog" }],
    body,
    currentPage: 'blog'
  });

  // Add filter JS
  const filterJS = `
<script>
document.querySelectorAll('.blog-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.blog-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const cluster = btn.dataset.cluster;
    document.querySelectorAll('.blog-card').forEach(card => {
      if (cluster === 'all') { card.style.display = ''; return; }
      const cardCluster = card.querySelector('.blog-card__cluster');
      const match = cardCluster && cardCluster.classList.contains('blog-card__cluster--' + {
        'odonto':'odonto','estetica':'estetica','imobiliaria':'imobiliaria',
        'engenharia-vendas':'engenharia','ia-automacao':'ia'
      }[cluster]);
      card.style.display = match ? '' : 'none';
    });
  });
});
</script>`;

  return html.replace('</body>', filterJS + '\n</body>');
}

// ══════════════════════════════════════════════════════════════
// GENERATE INDIVIDUAL BLOG POST
// ══════════════════════════════════════════════════════════════
function generateBlogPost(post) {
  const cl = CLUSTERS[post.cluster];
  const img = IMAGES[post.slug] || '';

  // Find 3 related posts from same cluster
  const related = BLOG_POSTS
    .filter(p => p.cluster === post.cluster && p.slug !== post.slug)
    .slice(0, 3);

  const relatedHTML = related.map(r => {
    const rcl = CLUSTERS[r.cluster];
    const rimg = IMAGES[r.slug] || '';
    return `<a href="/blog/${r.slug}/" class="blog-card">
        ${rimg ? `<img src="${rimg}" alt="${r.title}" class="blog-card__img" loading="lazy">` : ''}
        <span class="blog-card__cluster blog-card__cluster--${rcl.css}">${rcl.label}</span>
        <h3 class="blog-card__title">${r.title}</h3>
        <span class="blog-card__link">Ler artigo →</span>
      </a>`;
  }).join('\n      ');

  const body = `
  <section class="page-hero">
    <div class="container">
      <span class="blog-card__cluster blog-card__cluster--${cl.css}" style="display:inline-block;margin-bottom:16px">${cl.label}</span>
      <h1 class="page-hero__title">${post.title}</h1>
      <div class="article-meta">
        <span>📖 ${post.readTime} min de leitura</span>
        <span>📅 2026</span>
        <span>✍️ FlowAI Digital</span>
      </div>
    </div>
  </section>
  ${img ? `<div class="article-hero-img container"><img src="${img}" alt="${post.title}" loading="eager" style="width:100%;max-width:780px;margin:0 auto 0;display:block;border-radius:16px;border:1px solid var(--border)"></div>` : ''}
  <article class="page-content">
    ${post.content}

    <div class="page-cta">
      <h3>Quer implementar isso na sua empresa?</h3>
      <p>A FlowAI Digital opera todo o processo comercial com 129 agentes de IA especializados. Agende seu Diagnóstico de Receita gratuito.</p>
      <a href="/diagnostico-de-receita/" class="btn btn--primary">Agendar Diagnóstico Gratuito →</a>
    </div>

    <div class="related-posts">
      <h2>Leia também</h2>
      <div class="related-grid">
      ${relatedHTML}
      </div>
    </div>
  </article>`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.metaDesc,
    "url": `${DOMAIN}/blog/${post.slug}/`,
    "datePublished": "2026-04-01",
    "author": { "@type": "Organization", "name": "FlowAI Digital" },
    "publisher": { "@type": "Organization", "name": "FlowAI Digital" },
    "mainEntityOfPage": `${DOMAIN}/blog/${post.slug}/`,
    "image": img || undefined
  };

  return pageHTML({
    title: `${post.title} | Blog FlowAI Digital`,
    metaDesc: post.metaDesc,
    canonical: `/blog/${post.slug}/`,
    schema,
    ogImage: img,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Blog", url: "/blog/" },
      { name: post.title }
    ],
    body,
    currentPage: 'blog'
  });
}

// ══════════════════════════════════════════════════════════════
// GENERATE INTERNAL PAGES
// ══════════════════════════════════════════════════════════════
const INTERNAL_PAGES = [
  {
    dir: "clinicas-odontologicas",
    title: "Engenharia de Receita para Clínicas Odontológicas | FlowAI",
    metaDesc: "Processo comercial completo para clínicas odontológicas. 129 agentes de IA operam captação, qualificação, agendamento e follow-up 24h.",
    eyebrow: "Clínicas Odontológicas",
    h1: "Sua clínica gera leads.<br>A FlowAI transforma em pacientes.",
    sub: "Operamos o processo comercial completo da sua clínica odontológica — do primeiro contato ao fechamento e à reativação. Com 129 agentes de IA especializados.",
    content: `<h2>O problema que resolve</h2><p>Sua clínica investe em tráfego, os leads chegam, mas a conversão é baixa. Leads demoram para ser respondidos, follow-up não acontece, orçamentos ficam pendentes para sempre. O resultado? Dinheiro investido que não vira receita.</p><h2>O que a FlowAI faz pela sua clínica</h2><div class="service-grid"><div class="service-card"><div class="service-card__icon">⚡</div><h3>Resposta em < 5 min</h3><p>Agentes de IA respondem cada lead instantaneamente, 24 horas por dia. Nenhum lead espera.</p></div><div class="service-card"><div class="service-card__icon">🎯</div><h3>Qualificação automática</h3><p>Separamos curiosos de pacientes reais automaticamente. Sua equipe foca em quem vai fechar.</p></div><div class="service-card"><div class="service-card__icon">📅</div><h3>Agendamento sem atrito</h3><p>Leads qualificados são agendados automaticamente com confirmação e lembretes.</p></div><div class="service-card"><div class="service-card__icon">🔄</div><h3>Follow-up estruturado</h3><p>Sequência de 7 toques para leads que não fecharam. Recuperamos até 35% dos orçamentos pendentes.</p></div><div class="service-card"><div class="service-card__icon">📊</div><h3>Dashboard de receita</h3><p>Custo por paciente, taxa de conversão por etapa, ROI de cada campanha. Dados em tempo real.</p></div><div class="service-card"><div class="service-card__icon">🔁</div><h3>Remarketing e reativação</h3><p>Leads antigos e pacientes inativos são reativados automaticamente com campanhas personalizadas.</p></div></div><h2>Resultados que entregamos</h2><p>Clínicas que implementam a operação FlowAI reportam em média: <strong>3x mais conversão</strong> de leads em pacientes, <strong>40% menos no-show</strong>, e <strong>aumento de 60% no faturamento</strong> em 90 dias.</p><blockquote>Não vendemos ferramenta. Não entregamos relatório. Operamos o processo comercial completo — e nosso resultado é a sua receita.</blockquote>`
  },
  {
    dir: "clinicas-esteticas",
    title: "Engenharia de Receita para Clínicas de Estética | FlowAI",
    metaDesc: "Processo comercial para clínicas de estética. Captação, qualificação e follow-up automatizados para procedimentos de alto ticket.",
    eyebrow: "Clínicas de Estética",
    h1: "Procedimentos de alto ticket<br>merecem processo de alto nível.",
    sub: "Operamos o processo comercial da sua clínica de estética — do primeiro contato no Instagram ao fechamento de harmonizações, bioestimuladores e protocolos premium.",
    content: `<h2>Estética é venda consultiva — não venda de balcão</h2><p>O paciente de estética compra desejo, não necessidade. A abordagem precisa ser empática, visual e aspiracional. Pressão espanta. Processo converte.</p><h2>O que operamos na sua clínica</h2><div class="service-grid"><div class="service-card"><div class="service-card__icon">📸</div><h3>Captação visual</h3><p>Campanhas no Instagram e Google otimizadas para procedimentos estéticos de alto ticket.</p></div><div class="service-card"><div class="service-card__icon">💬</div><h3>Atendimento empático</h3><p>Agentes de IA treinados para a linguagem da estética. Entendem motivação emocional e qualificam com sutileza.</p></div><div class="service-card"><div class="service-card__icon">✨</div><h3>Follow-up aspiracional</h3><p>Sequência de conteúdo visual (antes/depois, depoimentos) que mantém o desejo vivo sem parecer insistente.</p></div><div class="service-card"><div class="service-card__icon">🔄</div><h3>Recall de manutenção</h3><p>Lembretes automáticos para retorno de botox (4-6 meses), preenchimento (12-18 meses) e protocolos.</p></div><div class="service-card"><div class="service-card__icon">💎</div><h3>Cross-sell inteligente</h3><p>Sugestão automática de procedimentos complementares baseada no histórico do paciente.</p></div><div class="service-card"><div class="service-card__icon">📊</div><h3>Métricas premium</h3><p>ROI por procedimento, LTV por paciente, taxa de retorno para manutenção.</p></div></div><h2>O resultado</h2><p>Clínicas de estética com operação FlowAI aumentam o LTV em 40% (mais retornos para manutenção) e recuperam 25% dos orçamentos pendentes com follow-up estruturado.</p>`
  },
  {
    dir: "imobiliarias",
    title: "Engenharia de Receita para Imobiliárias | FlowAI",
    metaDesc: "Processo comercial para imobiliárias. Resposta imediata, qualificação BANT, follow-up de 120 dias e CRM integrado com portais.",
    eyebrow: "Imobiliárias",
    h1: "Muitos leads, poucas vendas?<br>O problema é processo.",
    sub: "Operamos o processo comercial da sua imobiliária — da resposta instantânea ao lead até o fechamento. CRM integrado com portais, qualificação automática e follow-up de 120 dias.",
    content: `<h2>A imobiliária que responde primeiro, vende</h2><p>O comprador consulta 3-5 imobiliárias ao mesmo tempo. 50% dos leads nunca recebem resposta. Os outros 50% esperam horas. Com FlowAI, seu lead é respondido em menos de 3 minutos — 24 horas por dia.</p><h2>O que operamos na sua imobiliária</h2><div class="service-grid"><div class="service-card"><div class="service-card__icon">⚡</div><h3>Resposta em < 3 min</h3><p>Todo lead de portal, Google ou redes recebe resposta instantânea com qualificação inicial.</p></div><div class="service-card"><div class="service-card__icon">🎯</div><h3>Qualificação BANT</h3><p>Budget, Authority, Need, Timeline. O corretor recebe o lead já qualificado e direcionado.</p></div><div class="service-card"><div class="service-card__icon">🏠</div><h3>Matching de imóveis</h3><p>Lead qualificado é automaticamente cruzado com imóveis compatíveis do portfólio.</p></div><div class="service-card"><div class="service-card__icon">🔄</div><h3>Follow-up de 120 dias</h3><p>O ciclo imobiliário é longo. Mantemos contato durante todo o período de decisão.</p></div><div class="service-card"><div class="service-card__icon">📱</div><h3>CRM integrado</h3><p>Integração com ZAP, OLX, Viva Real. Todos os leads centralizados com funil visual.</p></div><div class="service-card"><div class="service-card__icon">📊</div><h3>Performance por corretor</h3><p>Métricas individuais: leads atendidos, tempo de resposta, taxa de conversão, vendas.</p></div></div><h2>De 2% para 8% de conversão</h2><p>Imobiliárias com processo FlowAI triplicam a taxa de conversão — sem aumentar investimento em portais ou tráfego pago.</p>`
  },
  {
    dir: "sobre",
    title: "Sobre a FlowAI Digital | Engenharia de Receita",
    metaDesc: "Conheça a FlowAI Digital. Empresa de engenharia de receita baseada no Rio de Janeiro. Operamos o processo comercial completo com 129 agentes de IA.",
    eyebrow: "Sobre a FlowAI",
    h1: "Não somos agência.<br>Somos engenharia.",
    sub: "A FlowAI Digital nasceu de uma constatação: empresas não têm problema de tráfego. Têm problema de processo. Operamos o processo comercial completo com inteligência artificial.",
    content: `<h2>Nossa história</h2><p>A FlowAI Digital foi fundada no Rio de Janeiro com uma missão clara: transformar a forma como empresas de serviço convertem leads em receita. Enquanto o mercado vendia "mais leads", nós percebemos que o problema real era o que acontecia DEPOIS que o lead chegava.</p><p>Desenvolvemos uma operação baseada em 129 agentes de IA especializados que operam o processo comercial completo — do primeiro contato ao fechamento e à reativação. Não entregamos ferramenta. Não entregamos relatório. Operamos. E nosso resultado é a receita do cliente.</p><h2>Nossos valores</h2><div class="about-values"><div class="about-value"><div class="about-value__icon">🎯</div><h3>Receita, não relatório</h3><p>Nosso KPI é a receita do cliente, não métricas de vaidade. Se o cliente não cresce, nós não tivemos sucesso.</p></div><div class="about-value"><div class="about-value__icon">⚙️</div><h3>Processo, não improviso</h3><p>Cada decisão é baseada em dados. Cada etapa é definida. Cada resultado é medido. Engenharia, não achismo.</p></div><div class="about-value"><div class="about-value__icon">🤖</div><h3>IA como operação</h3><p>IA não é ferramenta — é a equipe que opera 24/7. 129 agentes especializados trabalhando sem pausa.</p></div></div><h2>Para quem servimos</h2><p>Atendemos três nichos onde a dor de conversão é mais aguda: <strong>clínicas odontológicas</strong> (nosso nicho primário), <strong>clínicas de estética</strong> e <strong>imobiliárias</strong>. Cada nicho tem processo comercial adaptado às suas particularidades.</p><h2>Onde estamos</h2><p>Baseados no Rio de Janeiro, operamos remotamente para clientes em todo o Brasil. Nossa operação é 100% digital — os agentes de IA não precisam de escritório.</p>`
  },
  {
    dir: "diagnostico-de-receita",
    title: "Diagnóstico de Receita Gratuito | FlowAI Digital",
    metaDesc: "Agende seu Diagnóstico de Receita gratuito. Em 30 minutos mapeamos onde sua empresa está perdendo receita e como corrigir. Sem compromisso.",
    eyebrow: "Diagnóstico Gratuito",
    h1: "30 minutos.<br>Você sai com um plano.",
    sub: "Mapeamos os pontos de vazamento de receita no seu processo comercial atual. Você recebe um diagnóstico real — mesmo que não feche com a FlowAI.",
    content: `<h2>O que é o Diagnóstico de Receita?</h2><p>Uma conversa de 30 minutos onde analisamos seu processo comercial atual e identificamos exatamente onde você está perdendo receita. Não é pitch de vendas. É diagnóstico real com recomendações acionáveis.</p><h2>O que você descobre</h2><div class="service-grid"><div class="service-card"><div class="service-card__icon">🔍</div><h3>Onde estão os vazamentos</h3><p>Identificamos em qual etapa do funil você está perdendo mais leads e pacientes.</p></div><div class="service-card"><div class="service-card__icon">💰</div><h3>Quanto está na mesa</h3><p>Calculamos a receita potencial que está sendo desperdiçada com o processo atual.</p></div><div class="service-card"><div class="service-card__icon">📋</div><h3>Plano de ação</h3><p>Você sai com recomendações práticas e priorizadas — independente de contratar a FlowAI.</p></div></div><h2>Como funciona</h2><p><strong>Passo 1:</strong> Você preenche um breve formulário com informações sobre sua empresa.<br><strong>Passo 2:</strong> Agendamos uma call de 30 minutos no melhor horário para você.<br><strong>Passo 3:</strong> Na call, mapeamos seu processo atual e identificamos oportunidades.<br><strong>Passo 4:</strong> Você recebe o diagnóstico com plano de ação por escrito.</p><blockquote>Sem compromisso. Sem pressão. Sem proposta surpresa no final. Você decide se quer avançar depois de ver o diagnóstico.</blockquote><div class="page-cta"><h3>Agende seu Diagnóstico de Receita</h3><p>30 minutos que podem mudar o faturamento da sua empresa.</p><a href="https://wa.me/5521999999999?text=Quero%20agendar%20meu%20Diagn%C3%B3stico%20de%20Receita" class="btn btn--primary" target="_blank" rel="noopener">Agendar pelo WhatsApp →</a></div>`
  },
  {
    dir: "casos",
    title: "Casos de Sucesso | FlowAI Digital",
    metaDesc: "Veja como clínicas e imobiliárias aumentaram a receita com engenharia de vendas da FlowAI. Casos reais com métricas de resultado.",
    eyebrow: "Casos de Sucesso",
    h1: "Não é promessa.<br>É o que o processo entrega.",
    sub: "Resultados reais de empresas que implementaram a operação FlowAI Digital.",
    content: `<h2>Resultados por nicho</h2><div class="case-card"><h3>Clínica Odontológica — Implantes Premium</h3><p>Clínica especializada em implantes na Zona Sul do Rio. Investia R$ 8.000/mês em tráfego mas convertia apenas 6% dos leads.</p><div class="case-card__metrics"><div><div class="case-card__metric-value">6% → 22%</div><div class="case-card__metric-label">Taxa de conversão</div></div><div><div class="case-card__metric-value">3.2x</div><div class="case-card__metric-label">Aumento no faturamento</div></div><div><div class="case-card__metric-value">-45%</div><div class="case-card__metric-label">Redução de no-show</div></div></div><p><strong>O que fizemos:</strong> Implementamos resposta automática em < 3 min, qualificação por IA, follow-up de 7 toques e remarketing para orçamentos pendentes. Em 60 dias, a clínica triplicou o faturamento sem aumentar o investimento em tráfego.</p></div><div class="case-card"><h3>Clínica de Estética — Harmonização Facial</h3><p>Clínica focada em harmonização e bioestimuladores. Gerava leads pelo Instagram mas perdia 80% no follow-up.</p><div class="case-card__metrics"><div><div class="case-card__metric-value">+40%</div><div class="case-card__metric-label">LTV por paciente</div></div><div><div class="case-card__metric-value">35%</div><div class="case-card__metric-label">Orçamentos recuperados</div></div><div><div class="case-card__metric-value">24/7</div><div class="case-card__metric-label">Atendimento ativo</div></div></div><p><strong>O que fizemos:</strong> Follow-up empático e visual, recall automático de manutenção, cross-sell inteligente. O LTV subiu 40% com pacientes retornando regularmente para manutenção.</p></div><div class="case-card"><h3>Imobiliária — Lançamentos Residenciais</h3><p>Imobiliária com 12 corretores gerando 400+ leads/mês via portais. Conversão de 1.5%.</p><div class="case-card__metrics"><div><div class="case-card__metric-value">1.5% → 6%</div><div class="case-card__metric-label">Taxa de conversão</div></div><div><div class="case-card__metric-value">4x</div><div class="case-card__metric-label">Mais vendas</div></div><div><div class="case-card__metric-value">< 3min</div><div class="case-card__metric-label">Tempo de resposta</div></div></div><p><strong>O que fizemos:</strong> Resposta instantânea, qualificação BANT automática, distribuição inteligente para corretores, follow-up de 120 dias. A conversão quadruplicou.</p></div>`
  }
];

function generateInternalPage(page) {
  const img = IMAGES['page-' + page.dir.replace('diagnostico-de-receita','diagnostico')] || '';
  const body = `
  <section class="page-hero">
    <div class="container">
      <span class="eyebrow">${page.eyebrow}</span>
      <h1 class="page-hero__title">${page.h1}</h1>
      <p class="page-hero__sub">${page.sub}</p>
    </div>
  </section>
  ${img ? `<div class="container" style="margin-bottom:48px"><img src="${img}" alt="${page.eyebrow}" loading="eager" style="width:100%;max-width:900px;margin:0 auto;display:block;border-radius:20px;border:1px solid var(--border)"></div>` : ''}
  <div class="page-content">
    ${page.content}
    ${page.dir !== 'diagnostico-de-receita' ? `
    <div class="page-cta">
      <h3>Quer saber como isso funciona na prática?</h3>
      <p>Agende seu Diagnóstico de Receita gratuito. 30 minutos que podem mudar o faturamento da sua empresa.</p>
      <a href="/diagnostico-de-receita/" class="btn btn--primary">Agendar Diagnóstico Gratuito →</a>
    </div>` : ''}
  </div>`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": page.title,
    "description": page.metaDesc,
    "url": `${DOMAIN}/${page.dir}/`,
    "image": img || undefined,
    "publisher": { "@type": "Organization", "name": "FlowAI Digital" }
  };

  return pageHTML({
    title: page.title,
    metaDesc: page.metaDesc,
    canonical: `/${page.dir}/`,
    schema,
    ogImage: img,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: page.eyebrow }
    ],
    body,
    currentPage: page.dir
  });
}

// ══════════════════════════════════════════════════════════════
// GENERATE SITEMAP
// ══════════════════════════════════════════════════════════════
function generateSitemap() {
  const urls = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    { loc: '/blog/', priority: '0.9', changefreq: 'weekly' },
    ...INTERNAL_PAGES.map(p => ({ loc: `/${p.dir}/`, priority: '0.8', changefreq: 'monthly' })),
    ...BLOG_POSTS.map(p => ({ loc: `/blog/${p.slug}/`, priority: '0.7', changefreq: 'monthly' })),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemapindex.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${DOMAIN}${u.loc}</loc>
    <lastmod>2026-04-01</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
}

// ══════════════════════════════════════════════════════════════
// MAIN — GENERATE ALL FILES
// ══════════════════════════════════════════════════════════════
function main() {
  let count = 0;

  // Blog index
  const blogDir = path.join(SITE_DIR, 'blog');
  fs.mkdirSync(blogDir, { recursive: true });
  fs.writeFileSync(path.join(blogDir, 'index.html'), generateBlogIndex());
  count++;
  console.log(`✓ /blog/index.html`);

  // Blog posts
  BLOG_POSTS.forEach(post => {
    const dir = path.join(blogDir, post.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), generateBlogPost(post));
    count++;
    console.log(`✓ /blog/${post.slug}/index.html`);
  });

  // Internal pages
  INTERNAL_PAGES.forEach(page => {
    const dir = path.join(SITE_DIR, page.dir);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), generateInternalPage(page));
    count++;
    console.log(`✓ /${page.dir}/index.html`);
  });

  // Sitemap
  fs.writeFileSync(path.join(SITE_DIR, 'sitemap.xml'), generateSitemap());
  count++;
  console.log(`✓ /sitemap.xml`);

  console.log(`\n✅ ${count} files generated!`);
}

main();
