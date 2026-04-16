/**
 * AI-powered executive summary using Claude API
 * If ANTHROPIC_API_KEY is not set, returns a template-based summary
 */

async function generateAISummary(reportData) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.log('[AI] No ANTHROPIC_API_KEY — using template summary');
    return generateTemplateSummary(reportData);
  }

  console.log(`[AI] Generating personalized summary for ${reportData.empresa.nome}`);

  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });

    const prompt = buildPrompt(reportData);

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0]?.text || '';
    console.log(`[AI] Summary generated (${text.length} chars)`);
    return text;

  } catch (err) {
    console.error('[AI] Error generating summary:', err.message);
    return generateTemplateSummary(reportData);
  }
}

function buildPrompt(data) {
  const { empresa, score, seo, onPage, serp, instagram, competitors } = data;

  let context = `Voce e um consultor de marketing digital da FlowAI Digital. Escreva um resumo executivo curto (4-5 paragrafos, maximo 250 palavras) para o dono da empresa "${empresa.nome}" (site: ${empresa.domain}).

Dados da analise:
- Score geral: ${score.total}/100
- SEO On-Page: ${score.breakdown.seo || 0}/40 pontos`;

  if (onPage) {
    context += `\n- Score tecnico DataForSEO: ${Math.round(onPage.onPageScore)}/100`;
    context += `\n- Tempo de carregamento: ${(onPage.loadTime / 1000).toFixed(1)}s`;
  }

  if (seo) {
    context += `\n- Title tag: ${seo.title.exists ? seo.title.value : 'AUSENTE'}`;
    context += `\n- Meta description: ${seo.description.exists ? 'presente' : 'AUSENTE'}`;
    context += `\n- Problemas criticos: ${seo.issues.filter(i => i.severity === 'critical').length}`;
    context += `\n- Total de checks OK: ${seo.passes.length}/${seo.totalChecks}`;
  }

  if (serp) {
    context += `\n- Keywords no Google: ${serp.totalKeywords}`;
    context += `\n- Keywords no Top 10: ${serp.topPositions}`;
    if (serp.keywords && serp.keywords.length > 0) {
      context += `\n- Principais keywords: ${serp.keywords.slice(0, 5).map(k => `"${k.keyword}" (pos ${k.position})`).join(', ')}`;
    }
  } else {
    context += `\n- Keywords no Google: nenhuma encontrada`;
  }

  if (competitors && competitors.length > 0) {
    context += `\n- Principais concorrentes: ${competitors.slice(0, 3).map(c => c.domain).join(', ')}`;
  }

  context += `\n\nRegras:
- Escreva em portugues brasileiro
- Seja direto, sem jargao
- Comece com o ponto mais critico
- Termine com uma frase motivacional sobre o potencial de melhoria
- NAO mencione precos ou planos da FlowAI
- NAO use palavras: revolucionario, disruptivo, inovador, potencializar, alavancar
- Use dados concretos do relatorio`;

  return context;
}

function generateTemplateSummary(data) {
  const { empresa, score, seo, serp } = data;
  const parts = [];

  if (score.total >= 60) {
    parts.push(`A ${empresa.nome} tem uma base digital solida com score ${score.total}/100. Existem oportunidades claras de otimizacao que podem impulsionar seus resultados.`);
  } else if (score.total >= 35) {
    parts.push(`A analise da ${empresa.nome} revelou um score de ${score.total}/100. Sua empresa tem presenca digital, mas gaps importantes estao limitando seu crescimento online.`);
  } else {
    parts.push(`A ${empresa.nome} obteve ${score.total}/100 na analise de presenca digital. Existem problemas criticos que precisam de atencao imediata para nao perder mais oportunidades.`);
  }

  if (seo) {
    const criticals = seo.issues.filter(i => i.severity === 'critical').length;
    if (criticals > 0) {
      parts.push(`Encontramos ${criticals} problema(s) critico(s) de SEO no seu site que impactam diretamente sua visibilidade no Google.`);
    }
  }

  if (!serp || serp.totalKeywords === 0) {
    parts.push(`Seu site nao aparece nos resultados do Google para nenhuma keyword relevante. Isso significa que potenciais clientes que buscam seus servicos estao encontrando seus concorrentes.`);
  } else if (serp.topPositions < 3) {
    parts.push(`Voce aparece no Google para ${serp.totalKeywords} keywords, mas poucas estao na primeira pagina. Otimizacoes direcionadas podem mudar esse cenario rapidamente.`);
  }

  parts.push(`Com as acoes recomendadas neste relatorio, e possivel ver melhorias significativas nos proximos 30-90 dias.`);

  return parts.join('\n\n');
}

module.exports = { generateAISummary };
