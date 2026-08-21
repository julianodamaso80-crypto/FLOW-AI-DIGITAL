// Identificadores da Cloudflare descobertos por API em 21/08/2026.
//
// Account ID e Zone ID NÃO são segredo: são identificadores públicos que só
// funcionam acompanhados de um token autorizado. Ficam versionados para que
// nenhum comando precise redescobri-los nem pedi-los ao operador.
//
// O token continua vindo só do ambiente.

export const CLOUDFLARE = {
	accountName: "PROJETOS",
	accountId: "940f2310a6b883c45a40d2ab2bcb28d6",
	zone: "flowaidigital.com.br",
	zoneId: "3b4e53549651e15dd726d1231b75bbe1",
	/** Projeto Pages que serve o domínio. Confirmado por custom domain. */
	pagesProject: "flowai-ecossistema",
	/** Direct Upload — não há integração com Git neste projeto. */
	deployMode: "DIRECT_UPLOAD",
	productionBranch: "main",
	previewBranch: "organic-growth-foundation",
	pagesSubdomain: "flowai-ecossistema.pages.dev",
};

/** Resolve o ID preferindo o ambiente, com o valor descoberto como fallback. */
export function accountId(env = process.env) {
	return env.CLOUDFLARE_ACCOUNT_ID || CLOUDFLARE.accountId;
}

export function zoneId(env = process.env) {
	return env.CLOUDFLARE_ZONE_ID || CLOUDFLARE.zoneId;
}

export function pagesProject(env = process.env) {
	return env.CLOUDFLARE_PAGES_PROJECT || CLOUDFLARE.pagesProject;
}
