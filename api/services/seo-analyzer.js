/**
 * Analisa SEO on-page a partir do HTML scrapeado
 * Sem dependencia de API externa - analise programatica
 */
function analyzeSEOOnPage(websiteData) {
  const html = websiteData.html || '';
  const issues = [];
  const passes = [];

  // ── TITLE ──
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  const titleData = {
    exists: !!title,
    value: title,
    length: title.length,
  };
  if (!title) {
    issues.push({ severity: 'critical', area: 'Title', message: 'Pagina sem tag <title>' });
  } else if (title.length < 30) {
    issues.push({ severity: 'warning', area: 'Title', message: `Title muito curto (${title.length} chars). Ideal: 30-60` });
  } else if (title.length > 60) {
    issues.push({ severity: 'warning', area: 'Title', message: `Title muito longo (${title.length} chars). Ideal: 30-60` });
  } else {
    passes.push({ area: 'Title', message: `Title com tamanho ideal (${title.length} chars)` });
  }

  // ── META DESCRIPTION ──
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const description = descMatch ? descMatch[1].trim() : '';
  const descData = {
    exists: !!description,
    value: description,
    length: description.length,
  };
  if (!description) {
    issues.push({ severity: 'critical', area: 'Meta Description', message: 'Sem meta description' });
  } else if (description.length < 120) {
    issues.push({ severity: 'warning', area: 'Meta Description', message: `Description curta (${description.length} chars). Ideal: 120-160` });
  } else if (description.length > 160) {
    issues.push({ severity: 'info', area: 'Meta Description', message: `Description longa (${description.length} chars). Pode ser cortada no Google` });
  } else {
    passes.push({ area: 'Meta Description', message: `Meta description com tamanho ideal` });
  }

  // ── HEADINGS ──
  const h1Matches = html.match(/<h1[^>]*>/gi) || [];
  const h2Matches = html.match(/<h2[^>]*>/gi) || [];
  const h3Matches = html.match(/<h3[^>]*>/gi) || [];
  const h1Data = { count: h1Matches.length };

  if (h1Matches.length === 0) {
    issues.push({ severity: 'critical', area: 'Headings', message: 'Nenhum H1 encontrado' });
  } else if (h1Matches.length > 1) {
    issues.push({ severity: 'warning', area: 'Headings', message: `${h1Matches.length} tags H1 encontradas. Ideal: apenas 1` });
  } else {
    passes.push({ area: 'Headings', message: 'H1 unico presente' });
  }
  if (h2Matches.length > 0) {
    passes.push({ area: 'Headings', message: `${h2Matches.length} H2s estruturando o conteudo` });
  }

  // ── IMAGES ──
  const imgTags = html.match(/<img[^>]*>/gi) || [];
  const imgsWithAlt = imgTags.filter(img => /alt=["'][^"']+["']/i.test(img));
  const imgsData = {
    total: imgTags.length,
    withAlt: imgsWithAlt.length,
    withoutAlt: imgTags.length - imgsWithAlt.length,
  };
  if (imgTags.length > 0 && imgsWithAlt.length < imgTags.length) {
    issues.push({
      severity: 'warning',
      area: 'Imagens',
      message: `${imgTags.length - imgsWithAlt.length} de ${imgTags.length} imagens sem atributo alt`,
    });
  } else if (imgTags.length > 0) {
    passes.push({ area: 'Imagens', message: 'Todas as imagens possuem alt text' });
  }

  // ── HTTPS ──
  const isHttps = websiteData.statusCode !== undefined ? true : true; // If we could scrape it, it works
  const httpsCheck = html.includes('http://') && !html.includes('https://');
  if (httpsCheck) {
    issues.push({ severity: 'warning', area: 'Seguranca', message: 'Links HTTP (nao seguros) detectados na pagina' });
  }

  // ── VIEWPORT ──
  const hasViewport = /<meta[^>]*name=["']viewport["']/i.test(html);
  if (!hasViewport) {
    issues.push({ severity: 'critical', area: 'Mobile', message: 'Sem meta viewport - site nao e responsivo' });
  } else {
    passes.push({ area: 'Mobile', message: 'Meta viewport presente' });
  }

  // ── OPEN GRAPH ──
  const hasOG = /<meta[^>]*property=["']og:/i.test(html);
  if (!hasOG) {
    issues.push({ severity: 'info', area: 'Social', message: 'Sem Open Graph tags - links compartilhados nas redes nao terao preview' });
  } else {
    passes.push({ area: 'Social', message: 'Open Graph tags configuradas' });
  }

  // ── CANONICAL ──
  const hasCanonical = /<link[^>]*rel=["']canonical["']/i.test(html);
  if (!hasCanonical) {
    issues.push({ severity: 'warning', area: 'SEO Tecnico', message: 'Sem canonical URL - risco de conteudo duplicado' });
  } else {
    passes.push({ area: 'SEO Tecnico', message: 'Canonical URL definida' });
  }

  // ── SCHEMA/JSON-LD ──
  const hasSchema = /application\/ld\+json/i.test(html);
  if (!hasSchema) {
    issues.push({ severity: 'info', area: 'Dados Estruturados', message: 'Sem Schema.org/JSON-LD - Google nao exibe rich snippets' });
  } else {
    passes.push({ area: 'Dados Estruturados', message: 'Schema.org/JSON-LD presente' });
  }

  // ── LANG ──
  const hasLang = /<html[^>]*lang=["'][^"']+["']/i.test(html);
  if (!hasLang) {
    issues.push({ severity: 'info', area: 'Acessibilidade', message: 'Sem atributo lang no HTML' });
  } else {
    passes.push({ area: 'Acessibilidade', message: 'Idioma definido no HTML' });
  }

  // ── LINKS ──
  const internalLinks = (html.match(/<a[^>]*href=["']\/[^"']*["']/gi) || []).length;
  const externalLinks = (html.match(/<a[^>]*href=["']https?:\/\/[^"']*["']/gi) || []).length;

  // ── CONTENT LENGTH ──
  const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = textContent.split(' ').length;
  if (wordCount < 300) {
    issues.push({ severity: 'warning', area: 'Conteudo', message: `Pagina com pouco conteudo (${wordCount} palavras). Ideal: 300+` });
  } else {
    passes.push({ area: 'Conteudo', message: `${wordCount} palavras na pagina principal` });
  }

  // Sort issues by severity
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    title: titleData,
    description: descData,
    h1: h1Data,
    headings: { h1: h1Matches.length, h2: h2Matches.length, h3: h3Matches.length },
    images: imgsData,
    https: !httpsCheck,
    viewport: hasViewport,
    openGraph: hasOG,
    canonical: hasCanonical,
    schema: hasSchema,
    lang: hasLang,
    links: { internal: internalLinks, external: externalLinks },
    wordCount,
    issues,
    passes,
    totalChecks: issues.length + passes.length,
    passRate: passes.length / (issues.length + passes.length),
  };
}

module.exports = { analyzeSEOOnPage };
