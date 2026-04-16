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
  const { empresa, score, seo, backlinks, serp, instagram } = data;

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

  // Backlinks section
  html = html.replace(/{{BACKLINKS_SECTION}}/g, buildBacklinksSection(backlinks));

  // SERP section
  html = html.replace(/{{SERP_SECTION}}/g, buildSerpSection(serp));

  // Instagram page
  html = html.replace(/{{INSTAGRAM_PAGE}}/g, buildInstagramPage(instagram, empresa.nome));

  // Recommendations
  html = html.replace(/{{RECOMMENDATIONS}}/g, buildRecommendations(data));

  return html;
}

function buildScoreBars(breakdown) {
  const bars = [
    { label: 'SEO On-Page', value: breakdown.seo || 0, max: 40 },
    { label: 'Backlinks', value: breakdown.backlinks || 0, max: 25 },
    { label: 'Visibilidade', value: breakdown.serp || 0, max: 20 },
    { label: 'Instagram', value: breakdown.instagram || 0, max: 15 },
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
  if (data.backlinks) {
    cards.push({ num: formatNumber(data.backlinks.totalBacklinks), label: 'Backlinks' });
    cards.push({ num: data.backlinks.referringDomains, label: 'Dominios referindo' });
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

function buildBacklinksSection(backlinks) {
  if (!backlinks) {
    return '<div class="no-data">Nao foi possivel obter dados de backlinks para este dominio</div>';
  }

  return `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-card__num">${formatNumber(backlinks.totalBacklinks)}</div>
        <div class="stat-card__label">Total de Backlinks</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__num">${backlinks.referringDomains}</div>
        <div class="stat-card__label">Dominios Referindo</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__num">${backlinks.referringIps}</div>
        <div class="stat-card__label">IPs Unicos</div>
      </div>
    </div>
    <div style="margin-top:16px;font-size:14px;color:var(--text-light);">
      ${backlinks.totalBacklinks === 0
        ? 'Seu site nao possui backlinks. Backlinks sao como "votos de confianca" de outros sites — sem eles, o Google nao tem motivo para rankear voce acima dos concorrentes.'
        : backlinks.referringDomains < 10
          ? 'Seu perfil de backlinks e limitado. Investir em link building estrategico pode aumentar significativamente sua autoridade de dominio e visibilidade organica.'
          : 'Voce tem uma base de backlinks. Para crescer, foque em conquistar links de dominios com alta autoridade no seu nicho.'
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

function buildInstagramPage(instagram, empresaNome) {
  if (!instagram || !instagram.hasData) return '';

  return `
  <div class="page">
    <div class="page__header">
      <span class="page__logo">FlowAI Digital</span>
      <span class="page__num">Redes Sociais</span>
    </div>

    <h2>Analise do Instagram</h2>
    <div class="insta-card">
      <h3>@${instagram.handle}</h3>
      ${instagram.bio ? `<p style="opacity:0.9;font-size:14px;margin-top:8px;">${instagram.bio}</p>` : ''}
      <div class="insta-stats">
        <div>
          <div class="insta-stat__num">${formatNumber(instagram.followers)}</div>
          <div class="insta-stat__label">Seguidores</div>
        </div>
        <div>
          <div class="insta-stat__num">${formatNumber(instagram.following)}</div>
          <div class="insta-stat__label">Seguindo</div>
        </div>
        <div>
          <div class="insta-stat__num">${formatNumber(instagram.postsCount)}</div>
          <div class="insta-stat__label">Publicacoes</div>
        </div>
      </div>
    </div>

    ${instagram.followers < 1000 ? `
    <div class="recommendation" style="margin-top:20px;">
      <div class="recommendation__priority recommendation__priority--high">Prioridade alta</div>
      <p><strong>Perfil com menos de 1.000 seguidores.</strong> Para crescer no Instagram, voce precisa de uma estrategia consistente de conteudo + trafego pago para o perfil.</p>
    </div>` : ''}

    ${instagram.postsCount < 30 ? `
    <div class="recommendation">
      <div class="recommendation__priority recommendation__priority--medium">Prioridade media</div>
      <p><strong>Poucas publicacoes.</strong> Perfis com mais conteudo geram mais confianca e engajamento. Recomendamos pelo menos 3-4 posts por semana.</p>
    </div>` : ''}
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

  // Based on backlinks
  if (!data.backlinks || data.backlinks.totalBacklinks < 10) {
    recs.push({
      priority: 'high',
      title: 'Investir em link building',
      desc: 'Backlinks sao um dos fatores mais importantes para o Google. Sem eles, e quase impossivel competir por keywords valiosas. Comece com parceiros, fornecedores e diretórios do seu nicho.',
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
