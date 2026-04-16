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

    if (!response.ok) {
      console.error(`[DataForSEO] Error ${response.status} on ${endpoint}`);
      return null;
    }

    const data = await response.json();
    if (data.status_code !== 20000) {
      console.error(`[DataForSEO] API error:`, data.status_message);
      return null;
    }

    return data;
  } catch (err) {
    console.error(`[DataForSEO] Request failed:`, err.message);
    return null;
  }
}

/**
 * Get backlinks summary for a domain
 * Endpoint: /v3/backlinks/summary/live
 * Cost: ~$0.02
 */
async function getBacklinks(domain) {
  console.log(`[DataForSEO] Getting backlinks for: ${domain}`);

  const data = await apiCall('/v3/backlinks/summary/live', [{
    target: domain,
    internal_list_limit: 0,
    include_subdomains: true,
  }]);

  if (!data || !data.tasks || !data.tasks[0] || !data.tasks[0].result) {
    return null;
  }

  const result = data.tasks[0].result[0];
  if (!result) return null;

  return {
    totalBacklinks: result.total_backlinks || 0,
    referringDomains: result.referring_domains || 0,
    referringDomainsNofollow: result.referring_domains_nofollow || 0,
    brokenBacklinks: result.broken_backlinks || 0,
    referringIps: result.referring_ips || 0,
    referringSubnets: result.referring_subnets || 0,
    rank: result.rank || 0,
    backlinkSpamScore: result.backlink_spam_score || 0,
  };
}

/**
 * Get SERP rankings for a domain (what keywords it ranks for)
 * Endpoint: /v3/dataforseo_labs/google/ranked_keywords/live
 * Cost: ~$0.05
 */
async function getSerpRankings(domain) {
  console.log(`[DataForSEO] Getting SERP rankings for: ${domain}`);

  const data = await apiCall('/v3/dataforseo_labs/google/ranked_keywords/live', [{
    target: domain,
    language_name: 'Portuguese',
    location_code: 2076, // Brazil
    limit: 20,
    order_by: ['keyword_data.keyword_info.search_volume,desc'],
    filters: ['ranked_serp_element.serp_item.rank_absolute', '<=', 100],
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

module.exports = { getBacklinks, getSerpRankings };
