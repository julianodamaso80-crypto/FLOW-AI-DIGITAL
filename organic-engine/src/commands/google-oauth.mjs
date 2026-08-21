// Autorização OAuth do Google — uma vez só, reutilizando o client existente.
//
// NÃO cria OAuth client novo. Usa o `GOOGLE_OAUTH_CLIENT_ID` /
// `GOOGLE_OAUTH_CLIENT_SECRET` já cadastrados no .env compartilhado.
//
// TIPO DO CLIENT: **Web Application**, confirmado no Google Cloud Console.
// Isto não é detalhe burocrático — decide o desenho inteiro deste arquivo.
//
// A primeira versão usava `server.listen(0)`, porta efêmera, no pressuposto de
// que o client era do tipo Desktop (que aceita qualquer porta de loopback).
// O pressuposto estava errado. Para client Web o `redirect_uri` precisa bater
// EXATAMENTE com um URI cadastrado no Console; porta aleatória produziria um
// redirect diferente a cada execução e o Google devolveria
// `redirect_uri_mismatch`. As duas janelas de autorização abertas daquele jeito
// nunca teriam funcionado, mesmo com o clique do usuário.
//
// Por isso host, porta e caminho são FIXOS e constantes exportadas — o mesmo
// valor alimenta a URL de consentimento, o servidor e a troca do código.
//
// Escopos mínimos, só leitura. Nada aqui escreve em conta nenhuma.

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import crypto from "node:crypto";

export const SCOPES = [
	"https://www.googleapis.com/auth/analytics.readonly",
	"https://www.googleapis.com/auth/webmasters.readonly",
	"https://www.googleapis.com/auth/tagmanager.readonly",
];

/** Cadastrado no Console como "URI de redirecionamento autorizado". */
export const OAUTH_HOST = "127.0.0.1";
export const OAUTH_PORT = 8765;
export const OAUTH_PATH = "/callback";
export const REDIRECT_URI = `http://${OAUTH_HOST}:${OAUTH_PORT}${OAUTH_PATH}`;

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

/** Onde o refresh token fica. Fora do repositório, nunca commitado. */
export function tokenPath(env = process.env) {
	return (
		env.GOOGLE_TOKEN_PATH ??
		path.join(env.APPDATA ?? env.HOME ?? ".", "flowai", "google-oauth-token.json")
	);
}

/**
 * `prompt` NÃO tem valor padrão de propósito.
 *
 * `prompt=consent` força o Google a emitir refresh token novo e serve para a
 * autorização inicial. Deixar isso ligado por padrão faria o sistema pedir
 * consentimento de novo em toda chamada — quem precisa, pede.
 */
export function buildAuthUrl({ clientId, redirectUri = REDIRECT_URI, scopes = SCOPES, state, prompt }) {
	const p = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: "code",
		scope: scopes.join(" "),
		access_type: "offline", // sem isso não vem refresh_token
		state,
	});
	if (prompt) p.set("prompt", prompt);
	return `${AUTH_URL}?${p}`;
}

export async function exchangeCode({
	code,
	clientId,
	clientSecret,
	redirectUri = REDIRECT_URI,
	fetchImpl = globalThis.fetch,
}) {
	const res = await fetchImpl(TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			code,
			client_id: clientId,
			client_secret: clientSecret,
			// precisa ser IDÊNTICO ao usado na URL de consentimento
			redirect_uri: redirectUri,
			grant_type: "authorization_code",
		}),
	});
	const j = await res.json();
	if (!j.access_token) {
		const e = new Error(`troca de código falhou: ${j.error ?? "sem access_token"}`);
		e.code = j.error;
		throw e;
	}
	return j;
}

export async function refreshAccessToken({ refreshToken, clientId, clientSecret, fetchImpl = globalThis.fetch }) {
	const res = await fetchImpl(TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			refresh_token: refreshToken,
			client_id: clientId,
			client_secret: clientSecret,
			grant_type: "refresh_token",
		}),
	});
	const j = await res.json();
	if (!j.access_token) {
		// `invalid_grant` sozinho NÃO diz a causa: pode ser revogação, expiração,
		// limite de refresh tokens por client, política administrativa ou app em
		// Testing. Propaga o código cru; classificar exige outra evidência.
		const e = new Error(`refresh falhou: ${j.error ?? "sem access_token"}`);
		e.code = j.error;
		throw e;
	}
	return j;
}

/** Access token pronto para uso, renovando quando necessário. */
export async function getAccessToken(env = process.env) {
	const p = tokenPath(env);
	if (!fs.existsSync(p)) {
		const e = new Error("nenhum refresh token salvo — rode `google-auth` para autorizar uma vez");
		e.code = "GOOGLE_OAUTH_AUTHORIZATION_REQUIRED";
		throw e;
	}
	const saved = JSON.parse(fs.readFileSync(p, "utf8"));
	const t = await refreshAccessToken({
		refreshToken: saved.refresh_token,
		clientId: env.GOOGLE_OAUTH_CLIENT_ID,
		clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
	});
	return t.access_token;
}

/**
 * Sobe o servidor na porta FIXA 8765, imprime a URL de consentimento e espera
 * o callback. O usuário autoriza uma vez; o refresh token fica salvo.
 *
 * Porta ocupada é ERRO, não motivo para escolher outra: qualquer outra porta
 * não está cadastrada como redirect autorizado, e a autorização só falharia
 * depois — com o usuário já na tela do Google.
 */
export async function authorize({ env = process.env, log = console.log, timeoutMs = 300_000 } = {}) {
	const clientId = env.GOOGLE_OAUTH_CLIENT_ID;
	const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET;
	if (!clientId || !clientSecret) {
		throw new Error("GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET ausentes no .env");
	}

	const state = crypto.randomBytes(16).toString("hex");

	return new Promise((resolve, reject) => {
		let temporizador;
		const encerrar = (fn) => (v) => {
			clearTimeout(temporizador);
			server.close();
			fn(v);
		};

		const server = http.createServer(async (req, res) => {
			const url = new URL(req.url, `http://${OAUTH_HOST}`);
			if (url.pathname !== OAUTH_PATH) {
				res.writeHead(404).end("not found");
				return;
			}
			const erro = url.searchParams.get("error");
			const code = url.searchParams.get("code");
			const gotState = url.searchParams.get("state");

			const responder = (titulo, msg) => {
				res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
				res.end(
					`<!doctype html><meta charset="utf-8"><title>${titulo}</title>` +
						`<body style="font-family:system-ui;background:#3D2518;color:#F5EFE6;display:grid;place-items:center;height:100vh;margin:0">` +
						`<div style="text-align:center"><h1 style="color:#C9653C">${titulo}</h1><p>${msg}</p></div></body>`,
				);
			};

			if (erro) {
				responder("Autorização recusada", "Você pode fechar esta aba.");
				encerrar(reject)(new Error(`usuário recusou: ${erro}`));
				return;
			}
			if (gotState !== state) {
				responder("Estado inválido", "A requisição não confere. Tente de novo.");
				encerrar(reject)(new Error("state divergente — possível CSRF"));
				return;
			}

			try {
				const tok = await exchangeCode({ code, clientId, clientSecret, redirectUri: REDIRECT_URI });
				const p = tokenPath(env);
				fs.mkdirSync(path.dirname(p), { recursive: true });
				fs.writeFileSync(
					p,
					JSON.stringify(
						{
							refresh_token: tok.refresh_token,
							scope: tok.scope,
							obtained_at: new Date().toISOString(),
						},
						null,
						2,
					),
					{ mode: 0o600 },
				);
				responder("Autorizado", "Pode fechar esta aba e voltar ao terminal.");
				encerrar(resolve)({
					tokenPath: p,
					scopes: (tok.scope ?? "").split(" "),
					hasRefresh: Boolean(tok.refresh_token),
				});
			} catch (err) {
				responder("Falhou", "Confira o terminal.");
				encerrar(reject)(err);
			}
		});

		server.on("error", (err) => {
			clearTimeout(temporizador);
			if (err.code === "EADDRINUSE") {
				const e = new Error(
					`OAUTH_PORT_IN_USE — porta ${OAUTH_PORT} ocupada. Só ${REDIRECT_URI} está ` +
						"cadastrado como redirect autorizado; outra porta faria o Google recusar " +
						"com redirect_uri_mismatch. Libere a porta e rode de novo.",
				);
				e.code = "OAUTH_PORT_IN_USE";
				reject(e);
				return;
			}
			reject(err);
		});

		server.listen(OAUTH_PORT, OAUTH_HOST, () => {
			const url = buildAuthUrl({ clientId, redirectUri: REDIRECT_URI, state, prompt: "consent" });
			log("");
			log(`servidor de callback em ${REDIRECT_URI}`);
			log("");
			log("Abra este endereço no navegador e autorize (leitura apenas):");
			log("");
			log(url);
			log("");
			log("escopos pedidos:");
			for (const s of SCOPES) log(`   - ${s.split("/auth/")[1]}`);
			log("");
			log("aguardando autorização…");
		});

		temporizador = setTimeout(() => {
			server.close();
			reject(new Error("tempo esgotado esperando a autorização"));
		}, timeoutMs);
		temporizador.unref?.();
	});
}
