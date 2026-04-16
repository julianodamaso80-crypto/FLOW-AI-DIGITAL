const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROMIUM_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';

async function generatePDF(reportData, outputPath) {
  console.log(`[PDF] Generating report for ${reportData.empresa.nome}`);

  // Load and populate HTML template
  const templatePath = path.join(__dirname, '..', 'templates', 'report.html');
  let html = fs.readFileSync(templatePath, 'utf-8');

  // Populate template
  html = populateTemplate(html, reportData);

  // Launch browser and generate PDF
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
      '--disable-web-security',
    ],
  });

  try {
    const page = await browser.newPage();
    // Load content without waiting for external resources (fonts are local)
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });
    // Small delay to ensure fonts are rendered
    await new Promise(r => setTimeout(r, 500));

    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      preferCSSPageSize: true,
    });

    console.log(`[PDF] Generated: ${outputPath}`);
  } finally {
    await browser.close();
  }
}

function populateTemplate(html, data) {
  const { empresa, score, seo, onPage, serp, instagram } = data;

  // Cover
  html = html.replace(/{{EMPRESA_NOME}}/g, empresa.nome);
  html = html.replace(/{{EMPRESA_SITE}}/g, empresa.domain);
  html = html.replace(/{{DATA}}/g, data.data);

  // Score
  const scoreLevel = score.total >= 60 ? 'high' : score.total >= 35 ? 'medium' : 'low';
  html = html.replace(/{{SCORE_LEVEL}}/g, scoreLevel);
  html = html.replace(/{{SCORE_TOTAL}}/g, score.total);
  html = html.replace(/{{SCORE_BARS}}/g, buildScoreBars(score.breakdown));
  html = html.replace(/{{SCORE_SUMMARY}}/g, buildScoreSummary(score.total));

  // Stats cards
  html = html.replace(/{{STATS_CARDS}}/g, buildStatsCards(data));

  // SEO section
  if (seo) {
    html = html.replace(/{{SEO_TOTAL_CHECKS}}/g, seo.totalChecks);
    html = html.replace(/{{#if SEO_HAS_ISSUES}}/, '');
    html = html.replace(/{{\/if}}/, '');
    html = html.replace(/{{SEO_ISSUES}}/g, buildChecklist(seo.issues, 'issue'));
    html = html.replace(/{{#if SEO_HAS_PASSES}}/, '');
    html = html.replace(/{{\/if}}/, '');
    html = html.replace(/{{SEO_PASSES}}/g, buildChecklist(seo.passes, 'pass'));
  } else {
    html = html.replace(/{{SEO_TOTAL_CHECKS}}/g, '0');
    html = html.replace(/{{#if SEO_HAS_ISSUES}}[\s\S]*?{{\/if}}/g, '<div class="no-data">Nao foi possivel analisar o SEO do site</div>');
    html = html.replace(/{{#if SEO_HAS_PASSES}}[\s\S]*?{{\/if}}/g, '');
  }

  // Technical/OnPage section (replaced backlinks)
  html = html.replace(/{{BACKLINKS_SECTION}}/g, buildTechnicalSection(data.onPage));

  // SERP section
  html = html.replace(/{{SERP_SECTION}}/g, buildSerpSection(serp));

  // Competitors page
  html = html.replace(/{{COMPETITORS_PAGE}}/g, buildCompetitorsPage(data.competitors, empresa.domain));

  // Instagram page (simplified - just handle link)
  html = html.replace(/{{INSTAGRAM_PAGE}}/g, buildInstagramPage(instagram, empresa.nome));

  // AI Summary
  html = html.replace(/{{AI_SUMMARY}}/g, data.aiSummary || buildScoreSummary(score.total));

  // Recommendations
  html = html.replace(/{{RECOMMENDATIONS}}/g, buildRecommendations(data));

  return html;
}

function buildScoreBars(breakdown) {
  const bars = [
    { label: 'SEO On-Page', value: breakdown.seo || 0, max: 40 },
    { label: 'Performance', value: breakdown.technical || 0, max: 30 },
    { label: 'Visibilidade', value: breakdown.serp || 0, max: 30 },
  ];

  return bars.map(bar => {
    const pct = Math.round((bar.value / bar.max) * 100);
    const color = pct >= 60 ? 'green' : pct >= 35 ? 'yellow' : 'red';
    return `
      <div class="score-bar">
        <span class="score-bar__label">${bar.label}</span>
        <div class="score-bar__track">
          <div class="score-bar__fill score-bar__fill--${color}" style="width:${pct}%"></div>
        </div>
        <span class="score-bar__value">${bar.value}/${bar.max}</span>
      </div>`;
  }).join('');
}

function buildScoreSummary(total) {
  if (total >= 70) return 'Sua presenca digital esta bem estruturada. Ha oportunidades de otimizacao que podem impulsionar ainda mais seus resultados.';
  if (total >= 45) return 'Sua empresa tem uma base digital, mas existem gaps importantes que estao custando visibilidade e leads. Com ajustes direcionados, o potencial de crescimento e grande.';
  if (total >= 25) return 'Existem problemas significativos na sua presenca digital. Cada dia sem corrigir e oportunidade perdida. A boa noticia: com as acoes certas, a melhoria pode ser rapida.';
  return 'Sua presenca digital precisa de atencao urgente. Seus concorrentes estao capturando os leads que deveriam ser seus. E hora de estruturar.';
}

function buildStatsCards(data) {
  const cards = [];

  if (data.seo) {
    cards.push({ num: Math.round(data.seo.passRate * 100) + '%', label: 'Checks SEO OK' });
    cards.push({ num: data.seo.issues.length, label: 'Problemas SEO' });
    cards.push({ num: data.seo.wordCount || 0, label: 'Palavras na pagina' });
  }
  if (data.onPage) {
    cards.push({ num: Math.round(data.onPage.onPageScore), label: 'Score Tecnico' });
    cards.push({ num: (data.onPage.loadTime / 1000).toFixed(1) + 's', label: 'Tempo de carga' });
  }
  if (data.serp) {
    cards.push({ num: data.serp.totalKeywords || 0, label: 'Keywords no Google' });
  }

  // Ensure at least 3 cards
  while (cards.length < 3) {
    cards.push({ num: '-', label: 'Dados indisponiveis' });
  }

  return cards.slice(0, 6).map(c => `
    <div class="stat-card">
      <div class="stat-card__num">${c.num}</div>
      <div class="stat-card__label">${c.label}</div>
    </div>`).join('');
}

function buildChecklist(items, type) {
  return items.map(item => {
    let iconClass, iconText;
    if (type === 'pass') {
      iconClass = 'pass';
      iconText = '&#10003;';
    } else {
      iconClass = item.severity || 'warning';
      iconText = item.severity === 'critical' ? '!' : item.severity === 'info' ? 'i' : '!';
    }

    return `
      <li class="checklist__item">
        <span class="checklist__icon checklist__icon--${iconClass}">${iconText}</span>
        <div>
          <span class="checklist__area">${item.area}</span>
          <span class="checklist__message"> — ${item.message}</span>
        </div>
      </li>`;
  }).join('');
}

function buildTechnicalSection(onPage) {
  if (!onPage) {
    return '<div class="no-data">Nao foi possivel obter dados tecnicos para este dominio</div>';
  }

  const loadTimeSec = (onPage.loadTime / 1000).toFixed(1);
  const loadColor = onPage.loadTime < 3000 ? 'green' : onPage.loadTime < 5000 ? 'yellow' : 'red';

  return `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-card__num" style="color:${onPage.onPageScore >= 70 ? 'var(--green)' : onPage.onPageScore >= 40 ? 'var(--yellow)' : 'var(--red)'}">${Math.round(onPage.onPageScore)}</div>
        <div class="stat-card__label">Score Tecnico DataForSEO</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__num" style="color:var(--${loadColor})">${loadTimeSec}s</div>
        <div class="stat-card__label">Tempo de Carregamento</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__num">${onPage.wordCount}</div>
        <div class="stat-card__label">Palavras no Conteudo</div>
      </div>
    </div>
    <div style="margin-top:16px;font-size:14px;color:var(--text-light);">
      ${onPage.onPageScore >= 70
        ? 'Seu site tem uma boa estrutura tecnica. Pequenos ajustes podem levar a performance ao proximo nivel.'
        : onPage.onPageScore >= 40
          ? 'Existem problemas tecnicos que afetam a experiencia do usuario e o posicionamento no Google. Corrigir esses pontos pode trazer resultados rapidos.'
          : 'Seu site tem problemas tecnicos serios que prejudicam tanto a experiencia do usuario quanto o SEO. Correcao urgente recomendada.'
      }
    </div>`;
}

function buildSerpSection(serp) {
  if (!serp || serp.organicCount === 0) {
    return '<div class="no-data">Nenhuma keyword organica encontrada para este dominio no Google Brasil. Isso significa que seu site nao aparece nas buscas — seus concorrentes estao capturando esses leads.</div>';
  }

  let keywordRows = serp.keywords.map(k => {
    const posClass = k.position <= 3 ? 'top3' : k.position <= 10 ? 'top10' : k.position <= 30 ? 'top30' : 'other';
    return `
      <tr>
        <td style="font-weight:500;">${k.keyword}</td>
        <td><span class="pos-badge pos-badge--${posClass}">${k.position}</span></td>
        <td>${formatNumber(k.searchVolume)}</td>
      </tr>`;
  }).join('');

  return `
    <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom:20px;">
      <div class="stat-card">
        <div class="stat-card__num">${serp.totalKeywords}</div>
        <div class="stat-card__label">Keywords Totais</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__num">${serp.topPositions}</div>
        <div class="stat-card__label">Top 10 Google</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__num">${serp.top3}</div>
        <div class="stat-card__label">Top 3 Google</div>
      </div>
    </div>
    <h3>Keywords Rankeadas</h3>
    <table class="data-table">
      <thead>
        <tr><th>Keyword</th><th>Posicao</th><th>Buscas/Mes</th></tr>
      </thead>
      <tbody>${keywordRows}</tbody>
    </table>`;
}

function buildCompetitorsPage(competitors, clientDomain) {
  if (!competitors || competitors.length === 0) {
    return '';
  }

  const rows = competitors.map((c, i) => `
    <tr>
      <td style="font-weight:600;">${i + 1}. ${c.domain}</td>
      <td style="text-align:center;">${formatNumber(c.keywordsCount)}</td>
      <td style="text-align:center;">${c.avgPosition}</td>
      <td style="text-align:center;">${c.intersections}</td>
    </tr>`).join('');

  return `
  <div class="page">
    <div class="page__header">
      <span class="page__logo">FlowAI Digital</span>
      <span class="page__num">Analise Competitiva</span>
    </div>

    <h2>Seus Concorrentes no Google</h2>
    <p style="margin-bottom:20px;">Estes sao os dominios que competem com <strong>${clientDomain}</strong> pelas mesmas keywords no Google Brasil.</p>

    <table class="data-table">
      <thead>
        <tr>
          <th>Concorrente</th>
          <th style="text-align:center;">Keywords</th>
          <th style="text-align:center;">Posicao Media</th>
          <th style="text-align:center;">Keywords em Comum</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div style="margin-top:24px;padding:20px;background:rgba(201,101,60,0.06);border-radius:12px;border-left:4px solid var(--accent);">
      <p style="font-size:14px;color:var(--text);margin:0;">
        <strong>O que isso significa:</strong> Seus concorrentes estao aparecendo para as mesmas buscas que seus potenciais clientes fazem. Cada keyword que eles dominam e um lead que poderia ser seu.
      </p>
    </div>
  </div>`;
}

function buildInstagramPage(instagram, empresaNome) {
  if (!instagram || !instagram.handle) return '';

  return `
  <div class="page">
    <div class="page__header">
      <span class="page__logo">FlowAI Digital</span>
      <span class="page__num">Redes Sociais</span>
    </div>

    <h2>Presenca no Instagram</h2>
    <div class="insta-card">
      <h3>@${instagram.handle}</h3>
      <p style="opacity:0.9;font-size:14px;margin-top:8px;">instagram.com/${instagram.handle}</p>
    </div>

    <div style="margin-top:20px;">
      <div class="recommendation">
        <div class="recommendation__priority recommendation__priority--medium">Recomendacao</div>
        <h3>Consistencia e estrategia de conteudo</h3>
        <p style="margin-top:4px;font-size:14px;color:var(--text-light);">Para crescer no Instagram, voce precisa de frequencia (3-4 posts/semana), conteudo de valor para seu publico, e campanhas de trafego pago para o perfil. Reels e carrosseis geram mais alcance organico.</p>
      </div>
      <div class="recommendation">
        <div class="recommendation__priority recommendation__priority--medium">Recomendacao</div>
        <h3>Bio otimizada e link na bio</h3>
        <p style="margin-top:4px;font-size:14px;color:var(--text-light);">Sua bio deve comunicar claramente o que voce faz, para quem, e ter um CTA com link direto para WhatsApp ou site. Use destaques para organizar conteudo por tema.</p>
      </div>
    </div>
  </div>`;
}

function buildRecommendations(data) {
  const recs = [];

  // Based on SEO issues
  if (data.seo) {
    const criticals = data.seo.issues.filter(i => i.severity === 'critical');
    if (criticals.length > 0) {
      recs.push({
        priority: 'high',
        title: 'Corrigir problemas criticos de SEO',
        desc: `Foram encontrados ${criticals.length} problema(s) critico(s): ${criticals.map(c => c.message).join('; ')}. Estes problemas impactam diretamente seu posicionamento no Google.`,
      });
    }

    if (!data.seo.schema) {
      recs.push({
        priority: 'medium',
        title: 'Implementar dados estruturados (Schema.org)',
        desc: 'Dados estruturados ajudam o Google a entender melhor seu site e podem gerar rich snippets nos resultados de busca, aumentando seu CTR.',
      });
    }

    if (data.seo.wordCount < 300) {
      recs.push({
        priority: 'medium',
        title: 'Expandir conteudo da pagina principal',
        desc: 'Paginas com mais conteudo relevante tendem a rankear melhor. Adicione secoes com informacoes uteis sobre seus servicos.',
      });
    }
  }

  // Based on technical performance
  if (data.onPage && data.onPage.loadTime > 5000) {
    recs.push({
      priority: 'high',
      title: 'Melhorar velocidade do site',
      desc: `Seu site leva ${(data.onPage.loadTime / 1000).toFixed(1)}s para carregar. Sites lentos perdem visitantes e posicoes no Google. Otimize imagens, ative cache e revise o codigo.`,
    });
  }
  if (data.onPage && data.onPage.onPageScore < 50) {
    recs.push({
      priority: 'high',
      title: 'Corrigir problemas tecnicos do site',
      desc: 'O score tecnico do seu site esta abaixo de 50. Problemas de estrutura HTML, meta tags e performance impactam diretamente seu rankeamento.',
    });
  }

  // Based on SERP
  if (!data.serp || data.serp.organicCount === 0) {
    recs.push({
      priority: 'high',
      title: 'Criar estrategia de SEO e conteudo',
      desc: 'Seu site nao aparece no Google para nenhuma keyword relevante. Uma estrategia de conteudo com blog posts otimizados pode mudar isso em 3-6 meses.',
    });
  } else if (data.serp.topPositions < 3) {
    recs.push({
      priority: 'medium',
      title: 'Otimizar keywords existentes para Top 10',
      desc: `Voce rankeia para ${data.serp.totalKeywords} keywords, mas poucas estao no Top 10. Otimizar as paginas dessas keywords pode gerar um salto rapido em trafego organico.`,
    });
  }

  // Based on Instagram
  if (data.instagram && data.instagram.hasData && data.instagram.followers < 1000) {
    recs.push({
      priority: 'medium',
      title: 'Crescer presenca no Instagram',
      desc: 'Seu perfil tem potencial mas precisa de mais seguidores. Combine conteudo organico consistente com campanhas de trafego pago para o perfil.',
    });
  }

  // Always add
  recs.push({
    priority: 'low',
    title: 'Monitoramento continuo',
    desc: 'SEO e redes sociais exigem acompanhamento constante. Metricas devem ser revisadas semanalmente e estrategias ajustadas com base em dados reais.',
  });

  return recs.slice(0, 6).map(r => `
    <div class="recommendation">
      <div class="recommendation__priority recommendation__priority--${r.priority}">Prioridade ${r.priority === 'high' ? 'alta' : r.priority === 'medium' ? 'media' : 'baixa'}</div>
      <h3>${r.title}</h3>
      <p style="margin-top:4px;font-size:14px;color:var(--text-light);">${r.desc}</p>
    </div>`).join('');
}

function formatNumber(num) {
  if (num === undefined || num === null) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

module.exports = { generatePDF };
