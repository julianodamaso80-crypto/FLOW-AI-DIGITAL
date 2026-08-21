// O reconhecimento do que é "da FlowAI" decide o veredito inteiro. Se ele der
// falso-negativo, o comando conclui VERIFIED_NOT_FOUND para uma propriedade que
// existe — exatamente o erro que esta investigação nasceu para corrigir.

import test from "node:test";
import assert from "node:assert/strict";
import { pareceFlowAI } from "../src/commands/google-discover.mjs";

test("reconhece a propriedade pelo domínio do stream, não só pelo nome", () => {
	// o que decide de verdade é o defaultUri do data stream
	assert.ok(pareceFlowAI("https://flowaidigital.com.br"));
	assert.ok(pareceFlowAI("https://www.flowaidigital.com.br/"));
});

test("reconhece variações de escrita do nome", () => {
	assert.ok(pareceFlowAI("FlowAI Digital"));
	assert.ok(pareceFlowAI("Flow AI"));
	assert.ok(pareceFlowAI("FLOWAI - GA4"));
	assert.ok(pareceFlowAI("Flów AÍ"), "acento não pode derrubar o casamento");
});

test("não confunde com outras contas do mesmo usuário", () => {
	assert.ok(!pareceFlowAI("myiphone.online"));
	assert.ok(!pareceFlowAI("MY IPHONE - Loja"));
	assert.ok(!pareceFlowAI(""));
	assert.ok(!pareceFlowAI(null));
	assert.ok(!pareceFlowAI(undefined));
});
