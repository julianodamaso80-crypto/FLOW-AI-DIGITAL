// Schema do Organic Engine (Drizzle / PostgreSQL).
//
// Princípios que atravessam o schema:
//   - idempotência por unique constraint, não por checagem na aplicação;
//   - todo custo de provider é registrado, sempre;
//   - nada é apagado: conteúdo tem versão, job tem histórico;
//   - datas de conteúdo são reais — não existe campo "data simulada".

import {
	pgTable,
	serial,
	text,
	varchar,
	integer,
	bigint,
	boolean,
	timestamp,
	date,
	jsonb,
	numeric,
	uniqueIndex,
	index,
	primaryKey,
} from "drizzle-orm/pg-core";

// ── Páginas do site (espelho das rotas realmente publicadas) ────────────
export const pages = pgTable(
	"pages",
	{
		id: serial("id").primaryKey(),
		path: varchar("path", { length: 400 }).notNull(),
		type: varchar("type", { length: 20 }).notNull(), // home | money | blog | institutional
		title: text("title"),
		metaDescription: text("meta_description"),
		primaryKeyword: varchar("primary_keyword", { length: 200 }),
		cluster: varchar("cluster", { length: 80 }),
		intent: varchar("intent", { length: 20 }),
		isIndexable: boolean("is_indexable").default(true).notNull(),
		firstPublishedAt: date("first_published_at"),
		lastModifiedAt: date("last_modified_at"),
		wordCount: integer("word_count"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => ({
		uniqPath: uniqueIndex("uniq_pages_path").on(t.path),
		idxCluster: index("idx_pages_cluster").on(t.cluster),
	}),
);

// ── Universo de keywords ────────────────────────────────────────────────
export const keywords = pgTable(
	"keywords",
	{
		id: serial("id").primaryKey(),
		keyword: varchar("keyword", { length: 300 }).notNull(),
		locationCode: integer("location_code").default(2076).notNull(), // Brasil
		languageCode: varchar("language_code", { length: 8 }).default("pt").notNull(),
		intent: varchar("intent", { length: 20 }),
		cluster: varchar("cluster", { length: 80 }),
		// página que DEVE responder esta intenção — base do anti-canibalização
		ownerPageId: integer("owner_page_id").references(() => pages.id),
		priority: integer("priority").default(0).notNull(),
		isTracked: boolean("is_tracked").default(false).notNull(),
		discoveredAt: timestamp("discovered_at").defaultNow().notNull(),
	},
	(t) => ({
		uniqKw: uniqueIndex("uniq_keywords_kw_loc_lang").on(t.keyword, t.locationCode, t.languageCode),
		idxCluster: index("idx_keywords_cluster").on(t.cluster),
		idxTracked: index("idx_keywords_tracked").on(t.isTracked),
	}),
);

// ── Métricas de keyword ao longo do tempo (volume, dificuldade, CPC) ────
export const keywordSnapshots = pgTable(
	"keyword_snapshots",
	{
		id: serial("id").primaryKey(),
		keywordId: integer("keyword_id").references(() => keywords.id).notNull(),
		capturedOn: date("captured_on").notNull(),
		searchVolume: integer("search_volume"),
		difficulty: integer("difficulty"),
		competition: numeric("competition", { precision: 5, scale: 4 }),
		cpc: numeric("cpc", { precision: 10, scale: 2 }),
		source: varchar("source", { length: 40 }).notNull(), // dataforseo | gsc | manual
	},
	(t) => ({
		uniqSnap: uniqueIndex("uniq_kw_snapshot_day").on(t.keywordId, t.capturedOn, t.source),
	}),
);

// ── Posições na SERP ────────────────────────────────────────────────────
export const serpResults = pgTable(
	"serp_results",
	{
		id: serial("id").primaryKey(),
		keywordId: integer("keyword_id").references(() => keywords.id).notNull(),
		capturedOn: date("captured_on").notNull(),
		position: integer("position"),
		url: text("url"),
		domain: varchar("domain", { length: 253 }),
		isOwn: boolean("is_own").default(false).notNull(),
		serpFeatures: jsonb("serp_features"),
	},
	(t) => ({
		uniqSerp: uniqueIndex("uniq_serp_kw_day_url").on(t.keywordId, t.capturedOn, t.url),
		idxOwn: index("idx_serp_own").on(t.isOwn, t.capturedOn),
	}),
);

// ── Concorrentes ────────────────────────────────────────────────────────
export const competitors = pgTable(
	"competitors",
	{
		id: serial("id").primaryKey(),
		domain: varchar("domain", { length: 253 }).notNull(),
		capturedOn: date("captured_on").notNull(),
		avgPosition: integer("avg_position"),
		keywordsCount: integer("keywords_count"),
		intersections: integer("intersections"),
		visibility: numeric("visibility", { precision: 12, scale: 4 }),
	},
	(t) => ({
		uniqComp: uniqueIndex("uniq_competitor_domain_day").on(t.domain, t.capturedOn),
	}),
);

// ── Pauta candidata (antes de virar artigo) ─────────────────────────────
export const contentCandidates = pgTable(
	"content_candidates",
	{
		id: serial("id").primaryKey(),
		keywordId: integer("keyword_id").references(() => keywords.id),
		workingTitle: text("working_title").notNull(),
		// CREATE_NEW | UPDATE_EXISTING | MERGE | DO_NOTHING
		decision: varchar("decision", { length: 20 }),
		decisionReason: text("decision_reason"),
		targetPageId: integer("target_page_id").references(() => pages.id),
		targetMoneyPageId: integer("target_money_page_id").references(() => pages.id),
		demandEvidence: jsonb("demand_evidence"),
		status: varchar("status", { length: 20 }).default("proposed").notNull(),
		priority: integer("priority").default(0).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => ({
		idxStatus: index("idx_candidates_status").on(t.status, t.priority),
	}),
);

// ── Job de conteúdo (uma passada pelo pipeline) ─────────────────────────
export const contentJobs = pgTable(
	"content_jobs",
	{
		id: serial("id").primaryKey(),
		candidateId: integer("candidate_id").references(() => contentCandidates.id),
		articleId: integer("article_id"),
		stage: varchar("stage", { length: 30 }).notNull(),
		status: varchar("status", { length: 20 }).default("pending").notNull(),
		attempt: integer("attempt").default(0).notNull(),
		reworkCount: integer("rework_count").default(0).notNull(),
		lastError: text("last_error"),
		startedAt: timestamp("started_at"),
		finishedAt: timestamp("finished_at"),
	},
	(t) => ({
		idxStage: index("idx_content_jobs_stage").on(t.stage, t.status),
	}),
);

// ── Artigos ─────────────────────────────────────────────────────────────
export const articles = pgTable(
	"articles",
	{
		id: serial("id").primaryKey(),
		slug: varchar("slug", { length: 200 }).notNull(),
		title: text("title").notNull(),
		metaDescription: text("meta_description"),
		primaryKeyword: varchar("primary_keyword", { length: 200 }),
		secondaryKeywords: jsonb("secondary_keywords"),
		intent: varchar("intent", { length: 20 }),
		cluster: varchar("cluster", { length: 80 }),
		targetMoneyPageId: integer("target_money_page_id").references(() => pages.id),
		author: varchar("author", { length: 120 }),
		status: varchar("status", { length: 20 }).default("draft").notNull(),
		qualityScore: integer("quality_score"),
		wordCount: integer("word_count"),
		researchVersion: varchar("research_version", { length: 40 }),
		model: varchar("model", { length: 80 }),
		costUsd: numeric("cost_usd", { precision: 10, scale: 4 }),
		contentHash: varchar("content_hash", { length: 64 }),
		filePath: text("file_path"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		publishedAt: timestamp("published_at"),
		updatedAt: timestamp("updated_at"),
	},
	(t) => ({
		uniqSlug: uniqueIndex("uniq_articles_slug").on(t.slug),
		// mesmo conteúdo não vira dois artigos — idempotência do publisher
		uniqHash: uniqueIndex("uniq_articles_hash").on(t.contentHash),
		idxStatus: index("idx_articles_status").on(t.status),
	}),
);

// ── Versões do artigo (rollback e histórico) ────────────────────────────
export const articleVersions = pgTable(
	"article_versions",
	{
		id: serial("id").primaryKey(),
		articleId: integer("article_id").references(() => articles.id).notNull(),
		version: integer("version").notNull(),
		body: text("body").notNull(),
		contentHash: varchar("content_hash", { length: 64 }).notNull(),
		qualityScore: integer("quality_score"),
		gateResults: jsonb("gate_results"),
		commitSha: varchar("commit_sha", { length: 40 }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => ({
		uniqVersion: uniqueIndex("uniq_article_version").on(t.articleId, t.version),
	}),
);

// ── Fontes de pesquisa (evidência por afirmação) ────────────────────────
export const researchSources = pgTable(
	"research_sources",
	{
		id: serial("id").primaryKey(),
		articleId: integer("article_id").references(() => articles.id),
		candidateId: integer("candidate_id").references(() => contentCandidates.id),
		url: text("url").notNull(),
		title: text("title"),
		publisher: varchar("publisher", { length: 200 }),
		publishedAt: date("published_at"),
		retrievedAt: timestamp("retrieved_at").defaultNow().notNull(),
		// documentação oficial | governo | paper | doc técnica | primária | veículo
		sourceTier: integer("source_tier"),
		evidence: text("evidence"),
		confidence: varchar("confidence", { length: 10 }), // high | medium | low
	},
	(t) => ({
		idxArticle: index("idx_sources_article").on(t.articleId),
	}),
);

// ── Search Console diário ───────────────────────────────────────────────
export const gscDaily = pgTable(
	"gsc_daily",
	{
		id: serial("id").primaryKey(),
		day: date("day").notNull(),
		page: text("page").notNull(),
		query: text("query").notNull(),
		country: varchar("country", { length: 8 }),
		device: varchar("device", { length: 16 }),
		clicks: integer("clicks").default(0).notNull(),
		impressions: integer("impressions").default(0).notNull(),
		ctr: numeric("ctr", { precision: 8, scale: 6 }),
		position: numeric("position", { precision: 8, scale: 4 }),
	},
	(t) => ({
		uniqRow: uniqueIndex("uniq_gsc_row").on(t.day, t.page, t.query, t.country, t.device),
		idxDay: index("idx_gsc_day").on(t.day),
		idxPage: index("idx_gsc_page").on(t.page),
	}),
);

// ── GA4 diário ──────────────────────────────────────────────────────────
export const ga4Daily = pgTable(
	"ga4_daily",
	{
		id: serial("id").primaryKey(),
		day: date("day").notNull(),
		landingPage: text("landing_page"),
		sourceMedium: varchar("source_medium", { length: 200 }),
		sessions: integer("sessions").default(0).notNull(),
		engagedSessions: integer("engaged_sessions").default(0).notNull(),
		conversions: integer("conversions").default(0).notNull(),
		eventName: varchar("event_name", { length: 80 }),
		eventCount: integer("event_count").default(0).notNull(),
	},
	(t) => ({
		uniqRow: uniqueIndex("uniq_ga4_row").on(t.day, t.landingPage, t.sourceMedium, t.eventName),
		idxDay: index("idx_ga4_day").on(t.day),
	}),
);

// ── Métricas consolidadas por página (Core Web Vitals etc.) ─────────────
export const pageMetrics = pgTable(
	"page_metrics",
	{
		id: serial("id").primaryKey(),
		pageId: integer("page_id").references(() => pages.id),
		url: text("url").notNull(),
		capturedOn: date("captured_on").notNull(),
		source: varchar("source", { length: 20 }).notNull(), // pagespeed | crux
		formFactor: varchar("form_factor", { length: 10 }), // mobile | desktop
		lcpMs: integer("lcp_ms"),
		inpMs: integer("inp_ms"),
		cls: numeric("cls", { precision: 6, scale: 4 }),
		fcpMs: integer("fcp_ms"),
		ttfbMs: integer("ttfb_ms"),
		performanceScore: integer("performance_score"),
	},
	(t) => ({
		uniqRow: uniqueIndex("uniq_page_metrics").on(t.url, t.capturedOn, t.source, t.formFactor),
	}),
);

// ── Resultado do crawler próprio ────────────────────────────────────────
export const crawlResults = pgTable(
	"crawl_results",
	{
		id: serial("id").primaryKey(),
		url: text("url").notNull(),
		crawledAt: timestamp("crawled_at").defaultNow().notNull(),
		statusCode: integer("status_code"),
		title: text("title"),
		metaDescription: text("meta_description"),
		h1: text("h1"),
		canonical: text("canonical"),
		robotsMeta: varchar("robots_meta", { length: 120 }),
		wordCount: integer("word_count"),
		internalLinks: integer("internal_links"),
		externalLinks: integer("external_links"),
		schemaTypes: jsonb("schema_types"),
		issues: jsonb("issues"),
	},
	(t) => ({
		idxUrl: index("idx_crawl_url").on(t.url, t.crawledAt),
	}),
);

// ── Verificação de acesso dos crawlers de IA ────────────────────────────
export const aiCrawlerChecks = pgTable(
	"ai_crawler_checks",
	{
		id: serial("id").primaryKey(),
		checkedAt: timestamp("checked_at").defaultNow().notNull(),
		url: text("url").notNull(),
		crawler: varchar("crawler", { length: 60 }).notNull(),
		userAgent: text("user_agent").notNull(),
		statusCode: integer("status_code"),
		bytes: integer("bytes"),
		hasH1: boolean("has_h1"),
		hasCanonical: boolean("has_canonical"),
		// o que ESPERAMOS: allow (busca) ou deny (treinamento)
		expected: varchar("expected", { length: 10 }),
		passed: boolean("passed"),
	},
	(t) => ({
		idxCrawler: index("idx_ai_checks_crawler").on(t.crawler, t.checkedAt),
	}),
);

// ── Custo por chamada de provider ───────────────────────────────────────
export const providerCosts = pgTable(
	"provider_costs",
	{
		id: serial("id").primaryKey(),
		provider: varchar("provider", { length: 40 }).notNull(),
		endpoint: varchar("endpoint", { length: 200 }),
		jobRunId: integer("job_run_id"),
		articleId: integer("article_id").references(() => articles.id),
		units: integer("units").default(1).notNull(),
		costUsd: numeric("cost_usd", { precision: 12, scale: 6 }).default("0").notNull(),
		occurredAt: timestamp("occurred_at").defaultNow().notNull(),
	},
	(t) => ({
		idxProviderDay: index("idx_costs_provider_day").on(t.provider, t.occurredAt),
	}),
);

// ── Execução de job (observabilidade — nada falha em silêncio) ──────────
export const jobRuns = pgTable(
	"job_runs",
	{
		id: serial("id").primaryKey(),
		jobId: varchar("job_id", { length: 64 }),
		jobType: varchar("job_type", { length: 60 }).notNull(),
		status: varchar("status", { length: 20 }).notNull(), // running | ok | failed | skipped
		attempt: integer("attempt").default(1).notNull(),
		inputHash: varchar("input_hash", { length: 64 }),
		outputHash: varchar("output_hash", { length: 64 }),
		provider: varchar("provider", { length: 40 }),
		costUsd: numeric("cost_usd", { precision: 12, scale: 6 }),
		publishedUrl: text("published_url"),
		error: text("error"),
		startedAt: timestamp("started_at").defaultNow().notNull(),
		finishedAt: timestamp("finished_at"),
	},
	(t) => ({
		idxType: index("idx_job_runs_type").on(t.jobType, t.startedAt),
		idxStatus: index("idx_job_runs_status").on(t.status),
	}),
);

// ── Eventos de publicação (auditoria e rollback) ────────────────────────
export const publishingEvents = pgTable(
	"publishing_events",
	{
		id: serial("id").primaryKey(),
		articleId: integer("article_id").references(() => articles.id),
		event: varchar("event", { length: 30 }).notNull(), // published | updated | rolled_back | removed
		url: text("url"),
		commitSha: varchar("commit_sha", { length: 40 }),
		indexnowStatus: integer("indexnow_status"),
		sitemapUpdated: boolean("sitemap_updated"),
		detail: jsonb("detail"),
		occurredAt: timestamp("occurred_at").defaultNow().notNull(),
	},
	(t) => ({
		idxArticle: index("idx_pub_events_article").on(t.articleId, t.occurredAt),
	}),
);

// ── Configuração (budget, flags, AUTO_PUBLISH) ──────────────────────────
export const settings = pgTable("settings", {
	key: varchar("key", { length: 80 }).primaryKey(),
	value: text("value"),
	description: text("description"),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const allTables = {
	pages,
	keywords,
	keywordSnapshots,
	serpResults,
	competitors,
	contentCandidates,
	contentJobs,
	articles,
	articleVersions,
	researchSources,
	gscDaily,
	ga4Daily,
	pageMetrics,
	crawlResults,
	aiCrawlerChecks,
	providerCosts,
	jobRuns,
	publishingEvents,
	settings,
};
