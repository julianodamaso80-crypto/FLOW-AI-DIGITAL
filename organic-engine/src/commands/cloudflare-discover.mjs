// Descoberta da configuração Cloudflare — SOMENTE LEITURA.
//
// Antes de qualquer alteração é preciso saber: o token é válido, quais contas
// ele alcança, qual zona é a do domínio, qual projeto Pages serve o site e
// como esse projeto publica hoje.
//
// Nada aqui escreve. Account ID e Zone ID não são segredo e podem aparecer no
// relatório; o token, nunca.

import { CloudflareProvider } from "../providers/misc.mjs";

const DOMAIN = "flowaidigital.com.br";

/** GET /user/tokens/verify — o jeito oficial de saber se o token vive. */
export async function verifyToken(cf) {
	try {
		const r = await cf.call("/user/tokens/verify");
		return { ok: r?.status === "active", status: r?.status ?? null, id: null };
	} catch (err) {
		return { ok: false, status: null, error: err.message };
	}
}

export async function listAccounts(cf) {
	const r = await cf.call("/accounts");
	return (r ?? []).map((a) => ({ id: a.id, name: a.name, type: a.type ?? null }));
}

export async function findZone(cf, domain = DOMAIN) {
	const r = await cf.call(`/zones?name=${encodeURIComponent(domain)}`);
	const z = (r ?? [])[0];
	if (!z) return null;
	return {
		id: z.id,
		name: z.name,
		status: z.status,
		paused: z.paused,
		accountId: z.account?.id ?? null,
		accountName: z.account?.name ?? null,
		nameServers: z.name_servers ?? [],
		plan: z.plan?.name ?? null,
	};
}

export async function listPagesProjects(cf, accountId) {
	const r = await cf.call(`/accounts/${accountId}/pages/projects`);
	return (r ?? []).map((p) => ({
		name: p.name,
		subdomain: p.subdomain,
		productionBranch: p.production_branch,
		createdOn: p.created_on,
		domains: p.domains ?? [],
		// source ausente = Direct Upload; presente = integração com Git
		source: p.source
			? {
					type: p.source.type,
					owner: p.source.config?.owner ?? null,
					repo: p.source.config?.repo_name ?? null,
					productionBranch: p.source.config?.production_branch ?? null,
					prCommentsEnabled: p.source.config?.pr_comments_enabled ?? null,
					deploymentsEnabled: p.source.config?.deployments_enabled ?? null,
					previewDeploymentSetting: p.source.config?.preview_deployment_setting ?? null,
				}
			: null,
		deployMode: p.source ? "GIT_INTEGRATION" : "DIRECT_UPLOAD",
		buildConfig: p.build_config
			? {
					buildCommand: p.build_config.build_command,
					destinationDir: p.build_config.destination_dir,
					rootDir: p.build_config.root_dir,
				}
			: null,
		latestDeployment: p.latest_deployment
			? {
					id: p.latest_deployment.id,
					environment: p.latest_deployment.environment,
					createdOn: p.latest_deployment.created_on,
					url: p.latest_deployment.url,
					branch: p.latest_deployment.deployment_trigger?.metadata?.branch ?? null,
					status: p.latest_deployment.latest_stage?.status ?? null,
				}
			: null,
	}));
}

/** Projeto cujo custom domain é o domínio da FlowAI. Nunca chutar pelo nome. */
export function pickProjectForDomain(projects, domain = DOMAIN) {
	return (
		projects.find((p) => (p.domains ?? []).some((d) => String(d).toLowerCase() === domain)) ?? null
	);
}

/** Configuração de bots da zona. Só leitura. */
export async function readBotManagement(cf, zoneId) {
	try {
		return { ok: true, data: await cf.call(`/zones/${zoneId}/bot_management`) };
	} catch (err) {
		return { ok: false, error: err.message };
	}
}

/** Rulesets da zona, com as regras de cada phase relevante. */
export async function readRulesets(cf, zoneId) {
	const out = [];
	let rulesets;
	try {
		rulesets = await cf.call(`/zones/${zoneId}/rulesets`);
	} catch (err) {
		return { ok: false, error: err.message, rulesets: [] };
	}
	const interessantes = (rulesets ?? []).filter((r) =>
		String(r.phase ?? "").includes("firewall") || String(r.phase ?? "").includes("bot"),
	);
	for (const rs of interessantes) {
		try {
			const full = await cf.call(`/zones/${zoneId}/rulesets/${rs.id}`);
			out.push({
				id: rs.id,
				name: rs.name,
				kind: rs.kind,
				phase: rs.phase,
				rules: (full?.rules ?? []).map((r) => ({
					id: r.id,
					action: r.action,
					enabled: r.enabled !== false,
					description: r.description,
					expression: r.expression,
				})),
			});
		} catch (err) {
			out.push({ id: rs.id, name: rs.name, phase: rs.phase, error: err.message });
		}
	}
	return { ok: true, rulesets: out, allPhases: (rulesets ?? []).map((r) => r.phase) };
}

/** AI Crawl Control / AI bots — endpoints variam; tenta os conhecidos. */
export async function readAiCrawlControl(cf, zoneId, accountId) {
	const tentativas = [
		{ label: "zone/settings", path: `/zones/${zoneId}/settings` },
		{ label: "ai-crawl-control (account)", path: `/accounts/${accountId}/ai-crawl-control/crawlers` },
	];
	const out = [];
	for (const t of tentativas) {
		try {
			out.push({ label: t.label, ok: true, data: await cf.call(t.path) });
		} catch (err) {
			out.push({ label: t.label, ok: false, error: err.message });
		}
	}
	return out;
}

export async function discover({ env = process.env, log = console.log } = {}) {
	const cf = new CloudflareProvider({ env });
	const report = {};

	// 1. token
	const auth = await verifyToken(cf);
	report.auth = auth;
	log(`AUTH = ${auth.ok ? "OK" : "FAIL"}${auth.error ? ` (${auth.error})` : ""}`);
	if (!auth.ok) return report;

	// 2. contas
	const accounts = await listAccounts(cf);
	report.accounts = accounts;
	log(`\ncontas acessíveis: ${accounts.length}`);
	for (const a of accounts) log(`  ${a.name}  ${a.id}`);

	// 3. zona
	const zone = await findZone(cf);
	report.zone = zone;
	if (!zone) {
		log(`\nzona ${DOMAIN} não encontrada com este token`);
		return report;
	}
	log(`\nzona: ${zone.name}`);
	log(`  id:      ${zone.id}`);
	log(`  status:  ${zone.status}${zone.paused ? " (PAUSADA)" : ""}`);
	log(`  conta:   ${zone.accountName} (${zone.accountId})`);
	log(`  plano:   ${zone.plan}`);

	// 4. projetos Pages da conta dona da zona
	const accountId = zone.accountId;
	report.accountId = accountId;
	let projects = [];
	try {
		projects = await listPagesProjects(cf, accountId);
	} catch (err) {
		report.pagesError = err.message;
		log(`\nfalha ao listar projetos Pages: ${err.message}`);
	}
	report.projects = projects;
	log(`\nprojetos Pages na conta: ${projects.length}`);
	for (const p of projects) {
		const dom = (p.domains ?? []).join(", ") || "sem custom domain";
		log(`  ${p.name.padEnd(28)} ${p.deployMode.padEnd(17)} ${dom}`);
	}

	const project = pickProjectForDomain(projects);
	report.project = project;
	if (project) {
		log(`\nprojeto que serve ${DOMAIN}: ${project.name}`);
		log(`  modo de deploy:      ${project.deployMode}`);
		log(`  production branch:   ${project.productionBranch}`);
		log(`  criado em:           ${project.createdOn}`);
		log(`  subdomínio Pages:    ${project.subdomain}`);
		if (project.source) {
			log(`  repo conectado:      ${project.source.owner}/${project.source.repo}`);
			log(`  deploys automáticos: ${project.source.deploymentsEnabled}`);
			log(`  preview setting:     ${project.source.previewDeploymentSetting}`);
		}
		if (project.buildConfig) {
			log(`  build command:       ${project.buildConfig.buildCommand ?? "(nenhum)"}`);
			log(`  output dir:          ${project.buildConfig.destinationDir ?? "(raiz)"}`);
			log(`  root dir:            ${project.buildConfig.rootDir ?? "(raiz)"}`);
		}
		if (project.latestDeployment) {
			log(`  último deployment:   ${project.latestDeployment.id}`);
			log(`     ambiente ${project.latestDeployment.environment} · ${project.latestDeployment.createdOn} · ${project.latestDeployment.status}`);
		}
	} else {
		log(`\nnenhum projeto Pages tem ${DOMAIN} como custom domain`);
	}

	return report;
}
