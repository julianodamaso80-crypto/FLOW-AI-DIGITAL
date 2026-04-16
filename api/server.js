// Load .env in dev (in production, env vars come from EasyPanel)
try { require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') }); } catch(e) {}

const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const { scrapeWebsite, parseInstagram } = require('./services/scraper');
const { analyzeSEOOnPage } = require('./services/seo-analyzer');
const { getOnPageAnalysis, getSerpRankings, getCompetitors } = require('./services/dataforseo');
const { generateAISummary } = require('./services/ai-summary');
const { generatePDF } = require('./services/pdf-generator');

const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve generated PDFs (nginx proxies /api/* so path is /api/reports/*)
app.use('/api/reports', express.static(path.join(__dirname, 'reports')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main analysis endpoint
app.post('/api/diagnostico', async (req, res) => {
  const { empresa, telefone, email, site, instagram } = req.body;

  if (!empresa || !telefone || !email || !site || !instagram) {
    return res.status(400).json({ error: 'Todos os campos sao obrigatorios' });
  }

  const reportId = uuidv4();
  console.log(`[${reportId}] Iniciando diagnostico para ${empresa} - ${site}`);

  try {
    const siteUrl = site.startsWith('http') ? site : `https://${site}`;
    const domain = new URL(siteUrl).hostname.replace('www.', '');

    // Parse Instagram (no scraping)
    const insta = parseInstagram(instagram);

    // Run all analyses in parallel
    const [websiteData, onPageData, serpData, competitorsData] = await Promise.allSettled([
      scrapeWebsite(siteUrl),
      getOnPageAnalysis(siteUrl),
      getSerpRankings(domain),
      getCompetitors(domain),
    ]);

    const website = websiteData.status === 'fulfilled' ? websiteData.value : null;
    const onPage = onPageData.status === 'fulfilled' ? onPageData.value : null;
    const serp = serpData.status === 'fulfilled' ? serpData.value : null;
    const competitors = competitorsData.status === 'fulfilled' ? competitorsData.value : null;

    console.log(`[${reportId}] Analise concluida. Website: ${!!website}, OnPage: ${!!onPage}, SERP: ${!!serp}, Competitors: ${!!competitors}`);

    // Analyze on-page SEO from scraped HTML
    const seoAnalysis = website ? analyzeSEOOnPage(website) : null;

    // Merge DataForSEO on-page data
    if (seoAnalysis && onPage) {
      seoAnalysis.onPageScore = onPage.onPageScore;
      seoAnalysis.loadTime = onPage.loadTime;
    }

    // Calculate score (Instagram no longer scores — all data-based)
    const score = calculateScore(seoAnalysis, onPage, serp);

    // Compile report data
    const reportData = {
      id: reportId,
      data: new Date().toLocaleDateString('pt-BR'),
      empresa: { nome: empresa, telefone, email, site: siteUrl, instagram, domain },
      score,
      seo: seoAnalysis,
      onPage,
      serp,
      instagram: insta,
      competitors,
      website: website ? {
        title: website.title,
        description: website.description,
        contentLength: website.contentLength,
        loadTime: website.loadTime,
      } : null,
    };

    // Generate AI summary (async, non-blocking if fails)
    reportData.aiSummary = await generateAISummary(reportData);

    // Generate PDF
    const pdfFilename = `diagnostico-${domain.replace(/\./g, '-')}-${Date.now()}.pdf`;
    const pdfPath = path.join(__dirname, 'reports', pdfFilename);
    await generatePDF(reportData, pdfPath);

    console.log(`[${reportId}] PDF gerado: ${pdfFilename}`);

    res.json({
      success: true,
      reportId,
      score: score.total,
      pdfUrl: `/api/reports/${pdfFilename}`,
      whatsappLink: buildWhatsAppLink(telefone, empresa, pdfFilename),
    });

  } catch (err) {
    console.error(`[${reportId}] Erro:`, err);
    res.status(500).json({ error: 'Erro ao gerar diagnostico. Tente novamente.' });
  }
});

function calculateScore(seo, onPage, serp) {
  let total = 0;
  let breakdown = {};

  // SEO On-Page (0-40 points)
  if (seo) {
    let s = 0;
    if (seo.title.exists) s += 5;
    if (seo.title.length >= 30 && seo.title.length <= 60) s += 5;
    if (seo.description.exists) s += 5;
    if (seo.description.length >= 120 && seo.description.length <= 160) s += 5;
    if (seo.h1.count === 1) s += 5;
    if (seo.images.withAlt > seo.images.total * 0.7) s += 5;
    if (seo.https) s += 5;
    if (seo.viewport) s += 5;
    breakdown.seo = s;
    total += s;
  }

  // Technical Performance (0-30 points)
  if (onPage) {
    let t = 0;
    if (onPage.onPageScore >= 80) t += 12;
    else if (onPage.onPageScore >= 60) t += 8;
    else if (onPage.onPageScore >= 40) t += 4;
    if (onPage.loadTime < 2000) t += 8;
    else if (onPage.loadTime < 3000) t += 6;
    else if (onPage.loadTime < 5000) t += 3;
    if (onPage.isHttps) t += 5;
    if (onPage.hasCanonical) t += 3;
    if (onPage.imagesWithoutAlt === 0) t += 2;
    breakdown.technical = t;
    total += t;
  }

  // SERP Visibility (0-30 points)
  if (serp) {
    let v = 0;
    if (serp.totalKeywords > 0) v += 5;
    if (serp.totalKeywords > 10) v += 5;
    if (serp.totalKeywords > 50) v += 5;
    if (serp.topPositions > 0) v += 5;
    if (serp.topPositions > 3) v += 5;
    if (serp.top3 > 0) v += 5;
    breakdown.serp = v;
    total += v;
  }

  return { total, max: 100, breakdown };
}

function buildWhatsAppLink(telefone, empresa, pdfFilename) {
  const cleanPhone = telefone.replace(/\D/g, '');
  const phone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const text = encodeURIComponent(
    `Ola! Sou da FlowAI Digital. Seu diagnostico digital da ${empresa} esta pronto!\n\nAcesse aqui: https://flowaidigital.com.br/api/reports/${pdfFilename}\n\nQuer que a gente resolva esses pontos? Responde essa mensagem!`
  );
  return `https://api.whatsapp.com/send/?phone=${phone}&text=${text}`;
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FlowAI Diagnostico API rodando na porta ${PORT}`);
});
