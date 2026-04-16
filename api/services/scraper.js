const fetch = require('node-fetch');

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_URL = 'https://api.firecrawl.dev/v1';

async function scrapeWebsite(url) {
  console.log(`[Scraper] Scraping website: ${url}`);
  const startTime = Date.now();

  try {
    const response = await fetch(`${FIRECRAWL_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        formats: ['html', 'markdown'],
        onlyMainContent: false,
        timeout: 30000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[Scraper] Firecrawl error (${response.status}):`, err);
      return null;
    }

    const data = await response.json();
    const loadTime = Date.now() - startTime;

    if (!data.success || !data.data) {
      console.error('[Scraper] Firecrawl returned no data');
      return null;
    }

    const html = data.data.html || '';
    const markdown = data.data.markdown || '';
    const metadata = data.data.metadata || {};

    return {
      html,
      markdown,
      title: metadata.title || extractFromHtml(html, 'title'),
      description: metadata.description || extractMetaDescription(html),
      ogImage: metadata.ogImage || null,
      language: metadata.language || null,
      contentLength: markdown.length,
      loadTime,
      statusCode: metadata.statusCode || 200,
    };
  } catch (err) {
    console.error('[Scraper] Error scraping website:', err.message);
    return null;
  }
}

function parseInstagram(instagramHandle) {
  // Clean handle - no scraping needed, Instagram blocks scrapers
  let handle = instagramHandle.trim();
  handle = handle.replace(/^@/, '');
  handle = handle.replace(/^https?:\/\/(www\.)?instagram\.com\//, '');
  handle = handle.replace(/\/$/, '');

  console.log(`[Instagram] Registrado: @${handle}`);

  return {
    handle,
    url: `https://www.instagram.com/${handle}/`,
    hasData: true,
  };
}

function extractFromHtml(html, tag) {
  const match = html.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i'));
  return match ? match[1].trim() : '';
}

function extractMetaDescription(html) {
  const match = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  return match ? match[1].trim() : '';
}

function extractNumber(text, regex) {
  const match = text.match(regex);
  if (!match) return 0;
  const numStr = match[1].replace(/[.,]/g, '');
  return parseInt(numStr, 10) || 0;
}

function extractBio(markdown) {
  // Try to get the first meaningful paragraph
  const lines = markdown.split('\n').filter(l => l.trim().length > 10 && l.trim().length < 300);
  return lines[0] || '';
}

module.exports = { scrapeWebsite, parseInstagram };
