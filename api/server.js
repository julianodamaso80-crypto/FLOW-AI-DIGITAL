// Load .env in dev (in production, env vars come from EasyPanel)
try { require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') }); } catch(e) {}

const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const { scrapeWebsite, scrapeInstagram } = require('./services/scraper');
const { analyzeSEOOnPage } = require('./services/seo-analyzer');
const { getBacklinks, getSerpRankings } = require('./services/dataforseo');
const { generatePDF } = require('./services/pdf-generator');

const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve generated PDFs
app.use('/reports', express.static(path.join(__dirname, 'reports')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main analysis endpoint
app.post('/api/diagnostico', async (req, res) => {
  const { empresa, telefone, email, site, instagram } = req.body;

  // Validate required fields
  if (!empresa || !telefone || !email || !site) {
    return res.status(400).json({ error: 'Campos obrigatorios: empresa, telefone, email, site' });
  }

  const reportId = uuidv4();
  console.log(`[${reportId}] Iniciando diagnostico para ${empresa} - ${site}`);

  try {
    // Clean up URL
    const siteUrl = site.startsWith('http') ? site : `https://${site}`;
    const domain = new URL(siteUrl).hostname.replace('www.', '');

    // Run all analyses in parallel
    const [websiteData, instagramData, backlinksData, serpData] = await Promise.allSettled([
      scrapeWebsite(siteUrl),
      instagram ? scrapeInstagram(instagram) : Promise.resolve(null),
      getBacklinks(domain),
      getSerpRankings(domain),
    ]);

    // Extract results (handle failures gracefully)
    const website = websiteData.status === 'fulfilled' ? websiteData.value : null;
    const insta = instagramData.status === 'fulfilled' ? instagramData.value : null;
    const backlinks = backlinksData.status === 'fulfilled' ? backlinksData.value : null;
    const serp = serpData.status === 'fulfilled' ? serpData.value : null;

    console.log(`[${reportId}] Scraping concluido. Website: ${!!website}, Instagram: ${!!insta}, Backlinks: ${!!backlinks}, SERP: ${!!serp}`);

    // Analyze on-page SEO from scraped HTML
    const seoAnalysis = website ? analyzeSEOOnPage(website) : null;

    // Calculate overall score
    const score = calculateScore(seoAnalysis, backlinks, serp, insta);

    // Compile report data
    const reportData = {
      id: reportId,
      data: new Date().toLocaleDateString('pt-BR'),
      empresa: { nome: empresa, telefone, email, site: siteUrl, instagram, domain },
      score,
      seo: seoAnalysis,
      backlinks,
      serp,
      instagram: insta,
      website: website ? {
        title: website.title,
        description: website.description,
        contentLength: website.contentLength,
        loadTime: website.loadTime,
      } : null,
    };

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

function calculateScore(seo, backlinks, serp, instagram) {
  let total = 0;
  let breakdown = {};

  // SEO On-Page (0-40 points)
  if (seo) {
    let seoScore = 0;
    if (seo.title.exists) seoScore += 5;
    if (seo.title.length >= 30 && seo.title.length <= 60) seoScore += 5;
    if (seo.description.exists) seoScore += 5;
    if (seo.description.length >= 120 && seo.description.length <= 160) seoScore += 5;
    if (seo.h1.count === 1) seoScore += 5;
    if (seo.images.withAlt > seo.images.total * 0.7) seoScore += 5;
    if (seo.https) seoScore += 5;
    if (seo.viewport) seoScore += 5;
    breakdown.seo = seoScore;
    total += seoScore;
  }

  // Backlinks (0-25 points)
  if (backlinks) {
    let blScore = 0;
    if (backlinks.totalBacklinks > 0) blScore += 5;
    if (backlinks.totalBacklinks > 10) blScore += 5;
    if (backlinks.totalBacklinks > 100) blScore += 5;
    if (backlinks.referringDomains > 5) blScore += 5;
    if (backlinks.referringDomains > 20) blScore += 5;
    breakdown.backlinks = blScore;
    total += blScore;
  }

  // SERP Visibility (0-20 points)
  if (serp) {
    let serpScore = 0;
    if (serp.organicCount > 0) serpScore += 5;
    if (serp.organicCount > 5) serpScore += 5;
    if (serp.topPositions > 0) serpScore += 5;
    if (serp.topPositions > 3) serpScore += 5;
    breakdown.serp = serpScore;
    total += serpScore;
  }

  // Instagram (0-15 points)
  if (instagram) {
    let instaScore = 0;
    if (instagram.followers > 100) instaScore += 3;
    if (instagram.followers > 1000) instaScore += 3;
    if (instagram.postsCount > 10) instaScore += 3;
    if (instagram.postsCount > 50) instaScore += 3;
    if (instagram.bio) instaScore += 3;
    breakdown.instagram = instaScore;
    total += instaScore;
  }

  return { total, max: 100, breakdown };
}

function buildWhatsAppLink(telefone, empresa, pdfFilename) {
  const cleanPhone = telefone.replace(/\D/g, '');
  const phone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const text = encodeURIComponent(
    `Ola! Sou da FlowAI Digital. Seu diagnostico digital da ${empresa} esta pronto! Acesse: https://flowaidigital.com.br/api/reports/${pdfFilename}`
  );
  return `https://api.whatsapp.com/send/?phone=${phone}&text=${text}`;
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FlowAI Diagnostico API rodando na porta ${PORT}`);
});
