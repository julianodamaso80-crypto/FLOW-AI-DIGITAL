CREATE TABLE "ai_crawler_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"checked_at" timestamp DEFAULT now() NOT NULL,
	"url" text NOT NULL,
	"crawler" varchar(60) NOT NULL,
	"user_agent" text NOT NULL,
	"status_code" integer,
	"bytes" integer,
	"has_h1" boolean,
	"has_canonical" boolean,
	"expected" varchar(10),
	"passed" boolean
);
--> statement-breakpoint
CREATE TABLE "article_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"version" integer NOT NULL,
	"body" text NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"quality_score" integer,
	"gate_results" jsonb,
	"commit_sha" varchar(40),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(200) NOT NULL,
	"title" text NOT NULL,
	"meta_description" text,
	"primary_keyword" varchar(200),
	"secondary_keywords" jsonb,
	"intent" varchar(20),
	"cluster" varchar(80),
	"target_money_page_id" integer,
	"author" varchar(120),
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"quality_score" integer,
	"word_count" integer,
	"research_version" varchar(40),
	"model" varchar(80),
	"cost_usd" numeric(10, 4),
	"content_hash" varchar(64),
	"file_path" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "competitors" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" varchar(253) NOT NULL,
	"captured_on" date NOT NULL,
	"avg_position" integer,
	"keywords_count" integer,
	"intersections" integer,
	"visibility" numeric(12, 4)
);
--> statement-breakpoint
CREATE TABLE "content_candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"keyword_id" integer,
	"working_title" text NOT NULL,
	"decision" varchar(20),
	"decision_reason" text,
	"target_page_id" integer,
	"target_money_page_id" integer,
	"demand_evidence" jsonb,
	"status" varchar(20) DEFAULT 'proposed' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer,
	"article_id" integer,
	"stage" varchar(30) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempt" integer DEFAULT 0 NOT NULL,
	"rework_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"started_at" timestamp,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "crawl_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"crawled_at" timestamp DEFAULT now() NOT NULL,
	"status_code" integer,
	"title" text,
	"meta_description" text,
	"h1" text,
	"canonical" text,
	"robots_meta" varchar(120),
	"word_count" integer,
	"internal_links" integer,
	"external_links" integer,
	"schema_types" jsonb,
	"issues" jsonb
);
--> statement-breakpoint
CREATE TABLE "ga4_daily" (
	"id" serial PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"landing_page" text,
	"source_medium" varchar(200),
	"sessions" integer DEFAULT 0 NOT NULL,
	"engaged_sessions" integer DEFAULT 0 NOT NULL,
	"conversions" integer DEFAULT 0 NOT NULL,
	"event_name" varchar(80),
	"event_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gsc_daily" (
	"id" serial PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"page" text NOT NULL,
	"query" text NOT NULL,
	"country" varchar(8),
	"device" varchar(16),
	"clicks" integer DEFAULT 0 NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"ctr" numeric(8, 6),
	"position" numeric(8, 4)
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" varchar(64),
	"job_type" varchar(60) NOT NULL,
	"status" varchar(20) NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"input_hash" varchar(64),
	"output_hash" varchar(64),
	"provider" varchar(40),
	"cost_usd" numeric(12, 6),
	"published_url" text,
	"error" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "keyword_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"keyword_id" integer NOT NULL,
	"captured_on" date NOT NULL,
	"search_volume" integer,
	"difficulty" integer,
	"competition" numeric(5, 4),
	"cpc" numeric(10, 2),
	"source" varchar(40) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keywords" (
	"id" serial PRIMARY KEY NOT NULL,
	"keyword" varchar(300) NOT NULL,
	"location_code" integer DEFAULT 2076 NOT NULL,
	"language_code" varchar(8) DEFAULT 'pt' NOT NULL,
	"intent" varchar(20),
	"cluster" varchar(80),
	"owner_page_id" integer,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_tracked" boolean DEFAULT false NOT NULL,
	"discovered_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_id" integer,
	"url" text NOT NULL,
	"captured_on" date NOT NULL,
	"source" varchar(20) NOT NULL,
	"form_factor" varchar(10),
	"lcp_ms" integer,
	"inp_ms" integer,
	"cls" numeric(6, 4),
	"fcp_ms" integer,
	"ttfb_ms" integer,
	"performance_score" integer
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"path" varchar(400) NOT NULL,
	"type" varchar(20) NOT NULL,
	"title" text,
	"meta_description" text,
	"primary_keyword" varchar(200),
	"cluster" varchar(80),
	"intent" varchar(20),
	"is_indexable" boolean DEFAULT true NOT NULL,
	"first_published_at" date,
	"last_modified_at" date,
	"word_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_costs" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(40) NOT NULL,
	"endpoint" varchar(200),
	"job_run_id" integer,
	"article_id" integer,
	"units" integer DEFAULT 1 NOT NULL,
	"cost_usd" numeric(12, 6) DEFAULT '0' NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publishing_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer,
	"event" varchar(30) NOT NULL,
	"url" text,
	"commit_sha" varchar(40),
	"indexnow_status" integer,
	"sitemap_updated" boolean,
	"detail" jsonb,
	"occurred_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer,
	"candidate_id" integer,
	"url" text NOT NULL,
	"title" text,
	"publisher" varchar(200),
	"published_at" date,
	"retrieved_at" timestamp DEFAULT now() NOT NULL,
	"source_tier" integer,
	"evidence" text,
	"confidence" varchar(10)
);
--> statement-breakpoint
CREATE TABLE "serp_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"keyword_id" integer NOT NULL,
	"captured_on" date NOT NULL,
	"position" integer,
	"url" text,
	"domain" varchar(253),
	"is_own" boolean DEFAULT false NOT NULL,
	"serp_features" jsonb
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(80) PRIMARY KEY NOT NULL,
	"value" text,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "article_versions" ADD CONSTRAINT "article_versions_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_target_money_page_id_pages_id_fk" FOREIGN KEY ("target_money_page_id") REFERENCES "public"."pages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_candidates" ADD CONSTRAINT "content_candidates_keyword_id_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."keywords"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_candidates" ADD CONSTRAINT "content_candidates_target_page_id_pages_id_fk" FOREIGN KEY ("target_page_id") REFERENCES "public"."pages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_candidates" ADD CONSTRAINT "content_candidates_target_money_page_id_pages_id_fk" FOREIGN KEY ("target_money_page_id") REFERENCES "public"."pages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_jobs" ADD CONSTRAINT "content_jobs_candidate_id_content_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."content_candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_snapshots" ADD CONSTRAINT "keyword_snapshots_keyword_id_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."keywords"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keywords" ADD CONSTRAINT "keywords_owner_page_id_pages_id_fk" FOREIGN KEY ("owner_page_id") REFERENCES "public"."pages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_metrics" ADD CONSTRAINT "page_metrics_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_costs" ADD CONSTRAINT "provider_costs_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publishing_events" ADD CONSTRAINT "publishing_events_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_sources" ADD CONSTRAINT "research_sources_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_sources" ADD CONSTRAINT "research_sources_candidate_id_content_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."content_candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serp_results" ADD CONSTRAINT "serp_results_keyword_id_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."keywords"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_checks_crawler" ON "ai_crawler_checks" USING btree ("crawler","checked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_article_version" ON "article_versions" USING btree ("article_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_articles_slug" ON "articles" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_articles_hash" ON "articles" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "idx_articles_status" ON "articles" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_competitor_domain_day" ON "competitors" USING btree ("domain","captured_on");--> statement-breakpoint
CREATE INDEX "idx_candidates_status" ON "content_candidates" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX "idx_content_jobs_stage" ON "content_jobs" USING btree ("stage","status");--> statement-breakpoint
CREATE INDEX "idx_crawl_url" ON "crawl_results" USING btree ("url","crawled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_ga4_row" ON "ga4_daily" USING btree ("day","landing_page","source_medium","event_name");--> statement-breakpoint
CREATE INDEX "idx_ga4_day" ON "ga4_daily" USING btree ("day");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_gsc_row" ON "gsc_daily" USING btree ("day","page","query","country","device");--> statement-breakpoint
CREATE INDEX "idx_gsc_day" ON "gsc_daily" USING btree ("day");--> statement-breakpoint
CREATE INDEX "idx_gsc_page" ON "gsc_daily" USING btree ("page");--> statement-breakpoint
CREATE INDEX "idx_job_runs_type" ON "job_runs" USING btree ("job_type","started_at");--> statement-breakpoint
CREATE INDEX "idx_job_runs_status" ON "job_runs" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_kw_snapshot_day" ON "keyword_snapshots" USING btree ("keyword_id","captured_on","source");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_keywords_kw_loc_lang" ON "keywords" USING btree ("keyword","location_code","language_code");--> statement-breakpoint
CREATE INDEX "idx_keywords_cluster" ON "keywords" USING btree ("cluster");--> statement-breakpoint
CREATE INDEX "idx_keywords_tracked" ON "keywords" USING btree ("is_tracked");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_page_metrics" ON "page_metrics" USING btree ("url","captured_on","source","form_factor");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_pages_path" ON "pages" USING btree ("path");--> statement-breakpoint
CREATE INDEX "idx_pages_cluster" ON "pages" USING btree ("cluster");--> statement-breakpoint
CREATE INDEX "idx_costs_provider_day" ON "provider_costs" USING btree ("provider","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_pub_events_article" ON "publishing_events" USING btree ("article_id","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_sources_article" ON "research_sources" USING btree ("article_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_serp_kw_day_url" ON "serp_results" USING btree ("keyword_id","captured_on","url");--> statement-breakpoint
CREATE INDEX "idx_serp_own" ON "serp_results" USING btree ("is_own","captured_on");