// Descoberta do que JÁ EXISTE nas contas Google — somente leitura.
//
// Regra que motivou este comando: buscar em arquivos locais NÃO prova que um
// recurso na nuvem não existe. A ausência de GA4_MEASUREMENT_ID no .env só
// prova que o ID não está no .env.
//
// Nada aqui cria propriedade, stream, container ou conta.

import { getAccessToken } from "./google-oauth.mjs";

const FLOWAI = ["flowai", "flow ai", "flowaidigital"];
const DOMINIO = "flowaidigital.com.br";

const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
export const pareceFlowAI = (txt) => {
	const t = norm(txt);
	return FLOWAI.some((f) => t.includes(f)) || t.includes(DOMINIO);
};

async function api(token, url, opts = {}) {
	const res = await fetch(url, {
		...opts,
		headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(opts.headers ?? {}) },
	});
	const json = await res.json().catch(() => ({}));
	return { status: res.status, ok: res.ok, json };
}

/** GA4: contas e propriedades acessíveis. */
export async function analyticsAccountSummaries(token) {
	const out = [];
	let pageToken = "";
	do {
		const url = `https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200${pageToken ? `&pageToken=${pageToken}` : ""}`;
		const r = await api(token, url);
		if (!r.ok) return { ok: false, status: r.status, error: r.json?.error?.message, accounts: [] };
		for (const a of r.json.accountSummaries ?? []) {
			out.push({
				account: a.account,
				accountName: a.displayName,
				properties: (a.propertySummaries ?? []).map((p) => ({
					property: p.property,
					propertyId: String(p.property ?? "").split("/").pop(),
					displayName: p.displayName,
					propertyType: p.propertyType,
					parent: p.parent,
				})),
			});
		}
		pageToken = r.json.nextPageToken ?? "";
	} while (pageToken);
	return { ok: true, accounts: out };
}

export async function propertyDetail(token, property) {
	const r = await api(token, `https://analyticsadmin.googleapis.com/v1beta/${property}`);
	if (!r.ok) return null;
	const p = r.json;
	return {
		name: p.name,
		displayName: p.displayName,
		timeZone: p.timeZone,
		currencyCode: p.currencyCode,
		createTime: p.createTime,
		industryCategory: p.industryCategory ?? null,
	};
}

/** Data streams de uma propriedade. É aqui que mora o Measurement ID. */
export async function dataStreams(token, property) {
	const r = await api(token, `https://analyticsadmin.googleapis.com/v1beta/${property}/dataStreams?pageSize=200`);
	if (!r.ok) return { ok: false, error: r.json?.error?.message, streams: [] };
	return {
		ok: true,
		streams: (r.json.dataStreams ?? []).map((s) => ({
			name: s.name,
			streamId: String(s.name ?? "").split("/").pop(),
			displayName: s.displayName,
			type: s.type,
			defaultUri: s.webStreamData?.defaultUri ?? null,
			measurementId: s.webStreamData?.measurementId ?? null,
		})),
	};
}

/** Search Console: propriedades acessíveis. */
export async function searchConsoleSites(token) {
	const r = await api(token, "https://www.googleapis.com/webmasters/v3/sites");
	if (!r.ok) return { ok: false, status: r.status, error: r.json?.error?.message, sites: [] };
	return {
		ok: true,
		sites: (r.json.siteEntry ?? []).map((s) => ({
			siteUrl: s.siteUrl,
			permissionLevel: s.permissionLevel,
		})),
	};
}

/** Tag Manager: contas e containers. */
export async function tagManagerAccounts(token) {
	const r = await api(token, "https://tagmanager.googleapis.com/tagmanager/v2/accounts");
	if (!r.ok) return { ok: false, status: r.status, error: r.json?.error?.message, accounts: [] };
	const contas = [];
	for (const a of r.json.account ?? []) {
		const c = await api(token, `https://tagmanager.googleapis.com/tagmanager/v2/${a.path}/containers`);
		contas.push({
			accountId: a.accountId,
			name: a.name,
			containers: c.ok
				? (c.json.container ?? []).map((x) => ({
						containerId: x.containerId,
						publicId: x.publicId,
						name: x.name,
						usageContext: x.usageContext,
					}))
				: [],
		});
	}
	return { ok: true, accounts: contas };
}

/** A Data API é serviço SEPARADO da Admin API — confere se está habilitada. */
export async function analyticsDataApiEnabled(token, propertyId) {
	if (!propertyId) return { state: "UNKNOWN", detail: "sem propriedade para testar" };
	const r = await api(token, `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
		method: "POST",
		body: JSON.stringify({
			dateRanges: [{ startDate: "7daysAgo", endDate: "yesterday" }],
			metrics: [{ name: "sessions" }],
			limit: 1,
		}),
	});
	const motivo = (r.json?.error?.details ?? []).find((d) => d.reason)?.reason;
	if (motivo === "SERVICE_DISABLED") return { state: "DISABLED", detail: "analyticsdata.googleapis.com desligada no projeto" };
	if (r.ok) {
		const sessoes = r.json.rows?.[0]?.metricValues?.[0]?.value ?? "0";
		return { state: "ENABLED", detail: `respondeu; sessões nos últimos 7 dias: ${sessoes}` };
	}
	return { state: "ENABLED", detail: `HTTP ${r.status}: ${String(r.json?.error?.message ?? "").slice(0, 90)}` };
}

export async function discoverAll({ env = process.env, log = console.log } = {}) {
	const token = await getAccessToken(env);
	const rel = {};

	// ── GA4 ──────────────────────────────────────────────────────────────
	log("=== GOOGLE ANALYTICS ADMIN ===");
	const ga = await analyticsAccountSummaries(token);
	rel.analytics = ga;
	if (!ga.ok) {
		log(`  falhou (HTTP ${ga.status}): ${ga.error}`);
	} else {
		log(`  contas acessíveis: ${ga.accounts.length}`);
		for (const a of ga.accounts) {
			log(`  · ${a.accountName} (${a.account})`);
			for (const p of a.properties) {
				const marca = pareceFlowAI(p.displayName) ? "  <-- candidata FlowAI" : "";
				log(`      ${p.displayName} | id ${p.propertyId} | ${p.propertyType}${marca}`);
			}
		}
	}

	// candidatas por nome
	const candidatas = (ga.accounts ?? []).flatMap((a) =>
		a.properties.filter((p) => pareceFlowAI(p.displayName) || pareceFlowAI(a.accountName)),
	);

	// mas o que decide é o defaultUri do stream, não o nome
	log("");
	log("=== DATA STREAMS ===");
	const achados = [];
	const aVerificar = candidatas.length
		? candidatas
		: (ga.accounts ?? []).flatMap((a) => a.properties); // sem candidata por nome, varre todas
	for (const p of aVerificar) {
		const ds = await dataStreams(token, p.property);
		for (const s of ds.streams) {
			const bate = pareceFlowAI(s.defaultUri) || pareceFlowAI(s.displayName);
			if (bate) {
				achados.push({ property: p, stream: s });
				log(`  ACHADO: ${p.displayName} (id ${p.propertyId})`);
				log(`     stream ${s.displayName} | ${s.type}`);
				log(`     defaultUri: ${s.defaultUri}`);
				log(`     measurementId: ${s.measurementId}`);
				log(`     streamId: ${s.streamId}`);
			}
		}
	}
	if (achados.length === 0) log("  nenhum data stream aponta para flowaidigital.com.br");
	rel.flowaiStreams = achados;

	// ── Search Console ───────────────────────────────────────────────────
	log("");
	log("=== SEARCH CONSOLE ===");
	const gsc = await searchConsoleSites(token);
	rel.searchConsole = gsc;
	if (!gsc.ok) log(`  falhou (HTTP ${gsc.status}): ${gsc.error}`);
	else {
		log(`  propriedades acessíveis: ${gsc.sites.length}`);
		for (const s of gsc.sites) {
			const marca = pareceFlowAI(s.siteUrl) ? "  <-- FlowAI" : "";
			log(`   · ${s.siteUrl} [${s.permissionLevel}]${marca}`);
		}
	}

	// ── Tag Manager ──────────────────────────────────────────────────────
	log("");
	log("=== TAG MANAGER ===");
	const gtm = await tagManagerAccounts(token);
	rel.tagManager = gtm;
	if (!gtm.ok) log(`  falhou (HTTP ${gtm.status}): ${gtm.error}`);
	else {
		log(`  contas: ${gtm.accounts.length}`);
		for (const a of gtm.accounts) {
			log(`  · ${a.name} (${a.accountId})`);
			for (const c of a.containers) {
				const marca = pareceFlowAI(c.name) ? "  <-- FlowAI" : "";
				log(`      ${c.name} | ${c.publicId} | ${(c.usageContext ?? []).join(",")}${marca}`);
			}
		}
	}

	// ── Data API ─────────────────────────────────────────────────────────
	log("");
	log("=== ANALYTICS DATA API (serviço separado da Admin) ===");
	const propId = achados[0]?.property?.propertyId ?? aVerificar[0]?.propertyId;
	const dataApi = await analyticsDataApiEnabled(token, propId);
	rel.dataApi = dataApi;
	log(`  ${dataApi.state} — ${dataApi.detail}`);

	// ── veredito ─────────────────────────────────────────────────────────
	log("");
	if (achados.length > 0) {
		rel.veredito = "VERIFIED";
		log("FLOWAI_GA4 = VERIFIED");
	} else if (candidatas.length > 0) {
		rel.veredito = "PROPERTY_EXISTS_STREAM_MISSING";
		log("FLOWAI_GA4 = PROPERTY_EXISTS_STREAM_MISSING");
	} else if (ga.ok) {
		rel.veredito = "VERIFIED_NOT_FOUND";
		log("FLOWAI_GA4 = VERIFIED_NOT_FOUND (Admin API respondeu e não há propriedade FlowAI)");
	} else {
		rel.veredito = "CLOUD_UNVERIFIED";
		log("FLOWAI_GA4 = CLOUD_UNVERIFIED (não consegui consultar a Admin API)");
	}
	return rel;
}
