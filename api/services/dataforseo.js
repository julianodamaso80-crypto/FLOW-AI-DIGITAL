const fetch = require('node-fetch');

const DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN;
const DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD;

function getAuthHeader() {
  const credentials = Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64');
  return `Basic ${credentials}`;
}

async function apiCall(endpoint, body) {
  try {
    const response = await fetch(`https://api.dataforseo.com${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.status_code !== 20000) {
      console.error(`[DataForSEO] API error on ${endpoint}:`, data.status_message);
      // Check if task-level error
      if (data.tasks && data.tasks[0] && data.tasks[0].status_code !== 20000) {
        console.error(`[DataForSEO] Task error:`, data.tasks[0].status_message);
        return null;
      }
    }

    return data;
  } catch (err) {
    console.error(`[DataForSEO] Request failed:`, err.message);
    return null;
  }
}

/**
 * On-Page instant analysis for a URL
 * Endpoint: /v3/on_page/instant_pages
 * Cost: ~$0.0001
 */
async function getOnPageAnalysis(url) {
  console.log(`[DataForSEO] On-Page analysis for: ${url}`);

  const data = await apiCall('/v3/on_page/instant_pages', [{
    url: url,
    enable_javascript: true,
    enable_browser_rendering: true,
  }]);

  if (!data || !data.tasks || !data.tasks[0] || !data.tasks[0].result) {
    return null;
  }

  const items = data.tasks[0].result[0]?.items;
  if (!items || items.length === 0) return null;

  const page = items[0];
  const meta = page.meta || {};
  const onPage = page.onpage_score || 0;
  const checks = page.checks || {};

  return {
    onPageScore: onPage,
    title: meta.title || '',
    description: meta.description || '',
    statusCode: page.status_code || 0,
    totalDomSize: page.page_timing?.dom_complete || 0,
    loadTime: page.page_timing?.duration || 0,
    internalLinks: meta.internal_links_count || 0,
    externalLinks: meta.external_links_count || 0,
    imagesCount: meta.images_count || 0,
    imagesWithoutAlt: checks.no_image_alt_attribute || 0,
    h1Count: meta.htags?.h1?.length || 0,
    h2Count: meta.htags?.h2?.length || 0,
    hasCanonical: !!meta.canonical,
    hasOG: !checks.no_og_tags,
    isHttps: page.url?.startsWith('https'),
    wordCount: meta.content?.plain_text_word_count || 0,
    encodingDeclared: !checks.no_encoding_meta_tag,
    hasViewport: !checks.is_small_page_size,
    cacheControl: page.cache_control || null,
    checks,
  };
}

/**
 * Get SERP rankings for a domain (what keywords it ranks for)
 * Endpoint: /v3/dataforseo_labs/google/ranked_keywords/live
 * Cost: ~$0.01
 */
async function getSerpRankings(domain) {
  console.log(`[DataForSEO] Getting SERP rankings for: ${domain}`);

  const data = await apiCall('/v3/dataforseo_labs/google/ranked_keywords/live', [{
    target: domain,
    language_name: 'Portuguese',
    location_code: 2076, // Brazil
    limit: 20,
    order_by: ['keyword_data.keyword_info.search_volume,desc'],
  }]);

  if (!data || !data.tasks || !data.tasks[0] || !data.tasks[0].result) {
    return null;
  }

  const result = data.tasks[0].result[0];
  if (!result) return null;

  const keywords = (result.items || []).map(item => ({
    keyword: item.keyword_data?.keyword || '',
    position: item.ranked_serp_element?.serp_item?.rank_absolute || 0,
    searchVolume: item.keyword_data?.keyword_info?.search_volume || 0,
    url: item.ranked_serp_element?.serp_item?.url || '',
    cpc: item.keyword_data?.keyword_info?.cpc || 0,
    competition: item.keyword_data?.keyword_info?.competition_level || '',
  }));

  return {
    totalKeywords: result.total_count || 0,
    organicCount: keywords.length,
    topPositions: keywords.filter(k => k.position <= 10).length,
    top3: keywords.filter(k => k.position <= 3).length,
    keywords: keywords.slice(0, 15),
  };
}

module.exports = { getOnPageAnalysis, getSerpRankings };
