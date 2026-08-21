// O fluxo OAuth já quebrou de dois jeitos distintos neste projeto. Cada teste
// aqui existe por causa de um deles.
//
// 1. PORTA ALEATÓRIA. A primeira versão usava `server.listen(0)`, supondo um
//    OAuth client do tipo Desktop. O client é **Web Application**: o
//    `redirect_uri` precisa bater EXATAMENTE com um URI cadastrado no Console,
//    e porta efêmera gera um redirect diferente a cada execução. O Google teria
//    recusado com `redirect_uri_mismatch`.
// 2. REFRESH TOKEN QUE NÃO NASCE. Sem `access_type=offline` o Google devolve
//    access token e nenhum refresh token — a autorização evapora em 1h.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
	SCOPES,
	OAUTH_HOST,
	OAUTH_PORT,
	OAUTH_PATH,
	REDIRECT_URI,
	buildAuthUrl,
	exchangeCode,
	refreshAccessToken,
	tokenPath,
	getAccessToken,
} from "../src/commands/google-oauth.mjs";

// ── redirect URI: o que o client Web exige ───────────────────────────────────

test("o redirect URI é exatamente o cadastrado no Console", () => {
	assert.equal(REDIRECT_URI, "http://127.0.0.1:8765/callback");
	assert.equal(OAUTH_HOST, "127.0.0.1");
	assert.equal(OAUTH_PORT, 8765);
	assert.equal(OAUTH_PATH, "/callback");
});

/** Só o código. Os comentários deste módulo citam `listen(0)` ao explicar por
 *  que ele foi removido, e isso não pode disparar o guard. */
function codigoDoModulo() {
	return fs
		.readFileSync(new URL("../src/commands/google-oauth.mjs", import.meta.url), "utf8")
		.replace(/\/\*[\s\S]*?\*\//g, " ")
		.replace(/^[ \t]*\/\/.*$/gm, " ");
}

test("a porta é fixa — nada de listen(0) nem porta escolhida em runtime", () => {
	const src = codigoDoModulo();
	assert.ok(!/listen\(\s*0\b/.test(src), "listen(0) voltou — porta efêmera quebra client Web");
	assert.ok(
		!/address\(\)\s*\.\s*port/.test(src),
		"porta lida do servidor em runtime — o redirect deixaria de ser constante",
	);
	assert.match(src, /server\.listen\(OAUTH_PORT, OAUTH_HOST/, "o servidor não usa a porta fixa");
});

test("a URL de consentimento leva o redirect fixo", () => {
	const u = new URL(buildAuthUrl({ clientId: "abc.apps.googleusercontent.com", state: "s1" }));
	assert.equal(u.searchParams.get("redirect_uri"), REDIRECT_URI);
});

test("o redirect da URL e o da troca de código são o mesmo", async () => {
	// se divergirem, o Google devolve invalid_grant na troca — e só ali, depois
	// de o usuário já ter autorizado
	const daUrl = new URL(buildAuthUrl({ clientId: "abc", state: "s" })).searchParams.get("redirect_uri");

	let corpoEnviado;
	const fakeFetch = async (_url, opts) => {
		corpoEnviado = new URLSearchParams(opts.body);
		return { json: async () => ({ access_token: "x", refresh_token: "y", scope: SCOPES.join(" ") }) };
	};
	await exchangeCode({ code: "c", clientId: "abc", clientSecret: "s3cr3t", fetchImpl: fakeFetch });

	assert.equal(corpoEnviado.get("redirect_uri"), daUrl);
	assert.equal(corpoEnviado.get("redirect_uri"), REDIRECT_URI);
});

// ── refresh token: nasce ou não nasce ────────────────────────────────────────

test("a URL pede refresh token de forma explícita", () => {
	const u = new URL(buildAuthUrl({ clientId: "abc", state: "s1", prompt: "consent" }));
	assert.equal(u.searchParams.get("access_type"), "offline", "sem offline não vem refresh_token");
	assert.equal(u.searchParams.get("response_type"), "code");
	assert.equal(u.searchParams.get("state"), "s1");
	assert.equal(u.searchParams.get("scope"), SCOPES.join(" "));
});

test("prompt=consent só entra quando pedido, não em toda chamada", () => {
	const semPrompt = new URL(buildAuthUrl({ clientId: "abc", state: "s" }));
	assert.equal(semPrompt.searchParams.get("prompt"), null, "consent forçado por padrão");

	const comPrompt = new URL(buildAuthUrl({ clientId: "abc", state: "s", prompt: "consent" }));
	assert.equal(comPrompt.searchParams.get("prompt"), "consent");
});

// ── segurança ────────────────────────────────────────────────────────────────

test("a URL nunca carrega o client secret", () => {
	const url = buildAuthUrl({ clientId: "abc", state: "s1", prompt: "consent" });
	assert.ok(!/client_secret/.test(url), "client_secret vazou para a URL de consentimento");
});

test("o state vai na URL e é o que o servidor compara", () => {
	const u = new URL(buildAuthUrl({ clientId: "abc", state: "estado-unico" }));
	assert.equal(u.searchParams.get("state"), "estado-unico");

	const src = codigoDoModulo();
	assert.match(src, /gotState !== state/, "a validação de state sumiu — abre CSRF");
	assert.match(src, /crypto\.randomBytes/, "state precisa ser aleatório de verdade");
});

test("os escopos pedidos são só de leitura", () => {
	for (const s of SCOPES) {
		assert.match(s, /\.readonly$/, `escopo de escrita pedido sem necessidade: ${s}`);
	}
});

test("o token é guardado fora do repositório", () => {
	const p = tokenPath({ APPDATA: "D:/perfil/AppData/Roaming" });
	const repo = path.resolve(process.cwd(), "..");
	assert.ok(!path.resolve(p).startsWith(repo), `token dentro do repo: ${p}`);
	assert.match(p, /flowai/);
});

// ── erros que precisam chegar tipados ────────────────────────────────────────

test("refresh recusado chega com o código cru do Google, sem interpretar a causa", async () => {
	// invalid_grant não diz POR QUE: revogação, expiração, limite de tokens,
	// política ou app em Testing. Quem classifica precisa de outra evidência.
	const fakeFetch = async () => ({ json: async () => ({ error: "invalid_grant" }) });
	await assert.rejects(
		() => refreshAccessToken({ refreshToken: "x", clientId: "a", clientSecret: "b", fetchImpl: fakeFetch }),
		(e) => e.code === "invalid_grant",
	);
});

test("redirect_uri_mismatch na troca de código chega tipado", async () => {
	const fakeFetch = async () => ({ json: async () => ({ error: "redirect_uri_mismatch" }) });
	await assert.rejects(
		() => exchangeCode({ code: "c", clientId: "a", clientSecret: "b", fetchImpl: fakeFetch }),
		(e) => e.code === "redirect_uri_mismatch",
	);
});

test("sem token salvo o erro é acionável pelo CLI", async () => {
	const vazio = path.join(os.tmpdir(), `flowai-oauth-inexistente-${process.pid}.json`);
	fs.rmSync(vazio, { force: true });
	await assert.rejects(
		() => getAccessToken({ GOOGLE_TOKEN_PATH: vazio }),
		(e) => e.code === "GOOGLE_OAUTH_AUTHORIZATION_REQUIRED",
	);
});

test("porta ocupada vira OAUTH_PORT_IN_USE, nunca outra porta", async () => {
	const { authorize } = await import("../src/commands/google-oauth.mjs");
	const http = await import("node:http");

	// ocupa a 8765 de propósito
	const bloqueio = http.createServer(() => {});
	await new Promise((r) => bloqueio.listen(OAUTH_PORT, OAUTH_HOST, r));
	try {
		await assert.rejects(
			() =>
				authorize({
					env: { GOOGLE_OAUTH_CLIENT_ID: "a", GOOGLE_OAUTH_CLIENT_SECRET: "b" },
					log: () => {},
					timeoutMs: 2000,
				}),
			(e) => e.code === "OAUTH_PORT_IN_USE",
		);
	} finally {
		await new Promise((r) => bloqueio.close(r));
	}
});
