// Ciclo de frescor.
//
// Conteúdo atualizado nos últimos 30 dias recebe 3,2× mais citações de motor
// generativo que conteúdo com mais de 90 dias. Ter `dateModified` no schema não
// resolve nada sozinho: alguém precisa decidir O QUE atualizar e QUANDO.
//
// A tentação óbvia é atualizar o mais velho. Está errado: post antigo e sem
// tráfego não paga o custo de reescrita. O que interessa é onde o decaimento
// encontra audiência — idade × cliques.
//
// E a armadilha central: "atualizar" trocando só a data é a versão SEO do
// cheque sem fundo, e motores comparam versões. Por isso `dateModified` só
// avança quando o hash do corpo muda de verdade.

import crypto from "node:crypto";

/** Janela em que o conteúdo ainda é tratado como fresco. */
export const FRESH_DAYS = 30;
/** A partir daqui a perda de citação é o efeito documentado. */
export const STALE_DAYS = 90;

/** Hash do conteúdo normalizado. Espaço em branco não é mudança. */
export function contentHash(body) {
	const normalizado = String(body ?? "").replace(/\s+/g, " ").trim();
	return crypto.createHash("sha256").update(normalizado).digest("hex").slice(0, 16);
}

/** Idade em dias desde a última modificação real — não desde a publicação. */
export function ageInDays(article, now = new Date()) {
	const ref = article.dateModified || article.publishedAt;
	if (!ref) return Infinity;
	const ms = now.getTime() - new Date(ref).getTime();
	return Math.max(0, Math.round(ms / 86_400_000));
}

/**
 * 0 enquanto fresco, sobe entre FRESH e o dobro de STALE, satura em 1.
 * Curva simples de propósito: é regra de negócio auditável, não modelo.
 */
export function decayScore(article, now = new Date()) {
	const idade = ageInDays(article, now);
	if (idade <= FRESH_DAYS) return 0;
	const teto = STALE_DAYS * 2;
	if (idade >= teto) return 1;
	return (idade - FRESH_DAYS) / (teto - FRESH_DAYS);
}

/**
 * O que reescrever nesta rodada, em ordem.
 *
 * Prioridade = decaimento × audiência. Um post de 300 dias com 1 clique perde
 * para um de 120 dias com 800: o segundo tem o que proteger.
 */
export function planRefresh(corpus = [], { now = new Date(), limit = 5 } = {}) {
	return corpus
		.map((a) => {
			const decay = decayScore(a, now);
			const cliques = Number(a.gscClicks ?? 0);
			return {
				slug: a.slug,
				ageDays: ageInDays(a, now),
				decay,
				clicks: cliques,
				// log1p para que audiência pese sem que um outlier domine a fila
				priority: decay * Math.log1p(cliques),
			};
		})
		.filter((x) => x.decay > 0 && x.priority > 0)
		.sort((a, b) => b.priority - a.priority)
		.slice(0, limit)
		.map((x) => ({
			...x,
			reason: `${x.ageDays} dias sem atualização com ${x.clicks} clique(s) no período — decaimento ${(x.decay * 100).toFixed(0)}%`,
		}));
}

/**
 * Avança `dateModified` SOMENTE se o conteúdo mudou.
 *
 * Sem isto, um job de "refresh" que roda toda semana carimbaria data nova em
 * texto idêntico — e a data deixaria de significar qualquer coisa.
 */
export function nextDateModified(article, novoBody, now = new Date()) {
	const antes = article.contentHash ?? contentHash(article.body);
	const depois = contentHash(novoBody);
	if (antes === depois) {
		return { dateModified: article.dateModified, contentHash: antes, changed: false };
	}
	return { dateModified: now.toISOString(), contentHash: depois, changed: true };
}
