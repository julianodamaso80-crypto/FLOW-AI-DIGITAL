const fetch = require('node-fetch');

/**
 * Gera resumo executivo personalizado usando OpenRouter LLM
 * Segue 3 passos: Elogiar > Bater na dor > Mostrar solucao FlowAI
 */
async function generateAISummary(reportData) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.log('[AI] Sem OPENROUTER_API_KEY — usando resumo template');
    return generateTemplateSummary(reportData);
  }

  console.log(`[AI] Gerando resumo personalizado para ${reportData.empresa.nome}`);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://flowaidigital.com.br',
        'X-Title': 'FlowAI Diagnostico Digital',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        max_tokens: 1000,
        messages: [{
          role: 'system',
          content: `Voce e um consultor de marketing digital da FlowAI Digital, uma agencia de IA com 129 agentes especializados organizados em 12 squads que operam 24/7.

Seu trabalho e escrever o resumo executivo de uma analise de mercado para um empresario.

REGRAS DE TOM:
- Escreva como se estivesse conversando com o dono da empresa
- Linguagem simples, acessivel, sem jargao tecnico
- Nunca use: revolucionario, disruptivo, inovador, potencializar, alavancar, sinergia
- Use linguagem de resultado: "mais clientes", "aparecer no Google", "vender mais", "parar de perder dinheiro"
- Seja direto e confiante

ESTRUTURA OBRIGATORIA (3 PASSOS):

**PASSO 1 — ELOGIO (1 paragrafo)**
Comece elogiando a empresa do cliente. Ache algo positivo nos dados (site no ar, presenca no Instagram, algum check SEO que passou, velocidade ok, etc). Todo empresario precisa ouvir que ja fez algo certo.

**PASSO 2 — DORES (2 paragrafos)**
Agora bata nos problemas reais que a analise encontrou. Seja especifico com os dados. Mostre o que ele esta PERDENDO por causa desses problemas. Use linguagem de prejuizo: "cada dia sem resolver isso e cliente indo pro concorrente".

**PASSO 3 — SOLUCAO FLOWAI (1-2 paragrafos)**
Mostre como o ecossistema da FlowAI resolve EXATAMENTE as dores citadas. Mencione os agentes e squads relevantes:
- Squad de SEO & Conteudo (blog, keywords, autoridade)
- Squad de Trafego & Campanhas (Meta, Google, YouTube)
- Squad de Tracking & Analytics (cada clique medido)
- Squad de CRM & Automacao (pipeline organizado)
- Squad de Sites & Landing Pages (rapidas e convertem)
- Squad de Social Media (presenca com estrategia)
- Squad de Remarketing (lead frio nao e lead perdido)
Termine com: "129 agentes trabalhando 24/7 na sua operacao. Sem horario comercial."

FORMATO: Texto corrido com paragrafos. Maximo 300 palavras. Sem titulos, sem bullets, sem markdown.`
        }, {
          role: 'user',
          content: buildDataContext(reportData),
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[AI] OpenRouter error (${response.status}):`, err);
      return generateTemplateSummary(reportData);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    console.log(`[AI] Resumo gerado (${text.length} chars)`);
    return text;

  } catch (err) {
    console.error('[AI] Erro ao gerar resumo:', err.message);
    return generateTemplateSummary(reportData);
  }
}

function buildDataContext(data) {
  const { empresa, score, seo, onPage, serp, competitors } = data;

  let ctx = `EMPRESA: ${empresa.nome}
SITE: ${empresa.domain}
INSTAGRAM: ${empresa.instagram || 'nao informado'}
SCORE GERAL: ${score.total}/100`;

  if (seo) {
    ctx += `\n\nSEO ON-PAGE:`;
    ctx += `\n- Checks aprovados: ${seo.passes.length}/${seo.totalChecks}`;
    ctx += `\n- Problemas criticos: ${seo.issues.filter(i => i.severity === 'critical').length}`;
    ctx += `\n- Avisos: ${seo.issues.filter(i => i.severity === 'warning').length}`;
    if (seo.title.exists) ctx += `\n- Title: "${seo.title.value}"`;
    else ctx += `\n- Title: AUSENTE`;
    if (seo.description.exists) ctx += `\n- Meta description: presente (${seo.description.length} chars)`;
    else ctx += `\n- Meta description: AUSENTE`;
    ctx += `\n- H1: ${seo.h1.count} encontrado(s)`;
    ctx += `\n- Imagens sem alt: ${seo.images.withoutAlt}/${seo.images.total}`;
    ctx += `\n- Open Graph: ${seo.openGraph ? 'sim' : 'nao'}`;
    ctx += `\n- Schema.org: ${seo.schema ? 'sim' : 'nao'}`;
    ctx += `\n- Canonical: ${seo.canonical ? 'sim' : 'nao'}`;
    ctx += `\n- Palavras na pagina: ${seo.wordCount}`;
    seo.passes.forEach(p => { ctx += `\n- [OK] ${p.area}: ${p.message}`; });
    seo.issues.forEach(i => { ctx += `\n- [${i.severity.toUpperCase()}] ${i.area}: ${i.message}`; });
  }

  if (onPage) {
    ctx += `\n\nPERFORMANCE TECNICA (DataForSEO):`;
    ctx += `\n- Score tecnico: ${Math.round(onPage.onPageScore)}/100`;
    ctx += `\n- Tempo de carregamento: ${(onPage.loadTime / 1000).toFixed(1)}s`;
    ctx += `\n- HTTPS: ${onPage.isHttps ? 'sim' : 'nao'}`;
  }

  if (serp && serp.totalKeywords > 0) {
    ctx += `\n\nVISIBILIDADE NO GOOGLE:`;
    ctx += `\n- Total de keywords: ${serp.totalKeywords}`;
    ctx += `\n- Keywords no Top 10: ${serp.topPositions}`;
    ctx += `\n- Keywords no Top 3: ${serp.top3}`;
    if (serp.keywords && serp.keywords.length > 0) {
      ctx += `\n- Principais keywords:`;
      serp.keywords.slice(0, 8).forEach(k => {
        ctx += `\n  "${k.keyword}" — posicao ${k.position}, ${k.searchVolume} buscas/mes`;
      });
    }
  } else {
    ctx += `\n\nVISIBILIDADE NO GOOGLE: Nenhuma keyword encontrada. O site NAO aparece nos resultados de busca do Google.`;
  }

  if (competitors && competitors.length > 0) {
    ctx += `\n\nCONCORRENTES:`;
    competitors.forEach(c => {
      ctx += `\n- ${c.domain}: ${c.keywordsCount} keywords, posicao media ${c.avgPosition}`;
    });
  }

  return ctx;
}

function generateTemplateSummary(data) {
  const { empresa, score, seo, serp } = data;
  const parts = [];

  // Passo 1: Elogio
  if (seo && seo.passes.length > 0) {
    parts.push(`A ${empresa.nome} ja deu um passo importante: ter um site no ar e estar presente no digital. Isso mostra que voce entende que o mundo mudou e que estar online nao e mais opcional. Dos ${seo.totalChecks} pontos que analisamos, ${seo.passes.length} estao funcionando bem — e isso e merito seu.`);
  } else {
    parts.push(`A ${empresa.nome} tem algo que muitas empresas nao tem: a vontade de melhorar. Pedir essa analise ja mostra que voce esta a frente de boa parte dos seus concorrentes que nem sabem onde estao errando.`);
  }

  // Passo 2: Dores
  const dores = [];
  if (!serp || serp.totalKeywords === 0) {
    dores.push('seu site nao aparece em NENHUMA busca no Google — isso significa que todo cliente que pesquisa pelo que voce vende esta encontrando o concorrente');
  }
  if (seo) {
    const criticals = seo.issues.filter(i => i.severity === 'critical');
    if (criticals.length > 0) {
      dores.push(`encontramos ${criticals.length} problema(s) grave(s) no seu site que estao afastando clientes e prejudicando seu posicionamento`);
    }
  }
  if (dores.length > 0) {
    parts.push(`Mas a verdade e que existem problemas serios: ${dores.join('. Alem disso, ')}. Cada dia sem resolver isso e dinheiro saindo pela porta.`);
  }

  // Passo 3: Solucao
  parts.push(`E exatamente aqui que a FlowAI entra. Com 129 agentes de IA organizados em 12 squads, a gente coloca sua operacao digital pra rodar 24/7. O Squad de SEO cuida de te colocar no Google. O Squad de Trafego traz clientes qualificados. O Squad de Tracking mede cada clique. E tudo isso conversando entre si, sem voce precisar fazer nada. 129 agentes trabalhando 24/7 na sua operacao. Sem horario comercial.`);

  return parts.join('\n\n');
}

module.exports = { generateAISummary };
