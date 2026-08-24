// Arquivo de verificação do IndexNow.
//
// POR QUE IMPORTA AQUI: o índice do Bing ainda alimenta parte das citações do
// ChatGPT. IndexNow avisa Bing e parceiros em minutos em vez de esperar
// rastreamento. O Google não usa — ele descobre por sitemap — então isto não
// substitui nada, só cobre o outro lado.
//
// O protocolo exige provar posse do host servindo o próprio valor da chave em
// /{chave}.txt. Sem esse arquivo, toda submissão é recusada.
//
// A chave NÃO é segredo: ela é pública por desenho, publicada no próprio site.
// O que ela protege é contra terceiro submeter URL em nome do host.

import test from "node:test";
import assert from "node:assert/strict";
import { indexNowKeyFile, isValidIndexNowKey } from "../lib/site.mjs";

test("sem chave configurada, nenhum arquivo é gerado", () => {
	// não inventamos chave, do mesmo jeito que não inventamos Measurement ID
	assert.equal(indexNowKeyFile(""), null);
	assert.equal(indexNowKeyFile(undefined), null);
});

test("com chave, o arquivo tem o nome e o conteúdo que o protocolo exige", () => {
	const f = indexNowKeyFile("a1b2c3d4e5f60718293a4b5c6d7e8f90");
	assert.equal(f.name, "a1b2c3d4e5f60718293a4b5c6d7e8f90.txt");
	assert.equal(f.content, "a1b2c3d4e5f60718293a4b5c6d7e8f90");
});

test("chave inválida não vira arquivo", () => {
	// 8 a 128 caracteres hexadecimais é o que o protocolo aceita
	assert.equal(isValidIndexNowKey("curta"), false);
	assert.equal(isValidIndexNowKey("contém espaço aqui dentro"), false);
	assert.equal(isValidIndexNowKey("zzzz-nao-hexadecimal-zzzz"), false);
	assert.equal(indexNowKeyFile("curta"), null);
});

test("chave válida é aceita", () => {
	assert.equal(isValidIndexNowKey("a1b2c3d4"), true);
	assert.equal(isValidIndexNowKey("a".repeat(128)), true);
	assert.equal(isValidIndexNowKey("a".repeat(129)), false);
});

test("o conteúdo é só a chave, sem quebra de linha nem BOM", () => {
	const f = indexNowKeyFile("a1b2c3d4e5f60718");
	assert.ok(!/\n|\r/.test(f.content), "quebra de linha invalida a verificação");
	assert.equal(f.content, f.name.replace(/\.txt$/, ""));
});
