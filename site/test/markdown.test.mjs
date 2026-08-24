// Tabelas no renderizador de Markdown.
//
// POR QUE ISTO EXISTE: motores generativos extraem tabela em 81% dos casos
// contra 23% de parágrafo. Nenhuma das 13 money pages tinha tabela porque o
// renderizador simplesmente não suportava a sintaxe — as linhas com pipe caíam
// no ramo de parágrafo e viravam texto corrido.
//
// A restrição de segurança do módulo continua valendo: conteúdo pode vir de
// LLM, então tudo é escapado antes e só marcação conhecida vira tag.

import test from "node:test";
import assert from "node:assert/strict";
import { renderMarkdown, wordCount } from "../lib/markdown.mjs";

const TABELA = `| Critério | Agência tradicional | FlowAI |
| --- | --- | --- |
| Horário | Comercial | 24/7 |
| Decisão | Achismo | Dados reais |`;

test("tabela markdown vira <table> com cabeçalho semântico", () => {
	const html = renderMarkdown(TABELA);
	assert.match(html, /<table>/, "não gerou <table>");
	assert.match(html, /<thead>/, "sem <thead> o cabeçalho não é identificável");
	assert.match(html, /<th>Critério<\/th>/);
	assert.match(html, /<th>Agência tradicional<\/th>/);
	assert.match(html, /<th>FlowAI<\/th>/);
});

test("as linhas de dados viram <tbody> com <td>", () => {
	const html = renderMarkdown(TABELA);
	assert.match(html, /<tbody>/);
	assert.match(html, /<td>Horário<\/td>/);
	assert.match(html, /<td>24\/7<\/td>/);
	assert.match(html, /<td>Dados reais<\/td>/);
	// duas linhas de dados, não três — a linha de separador não é dado
	assert.equal((html.match(/<tr>/g) ?? []).length, 3, "separador virou linha de dados");
});

test("a linha separadora nunca aparece como conteúdo", () => {
	const html = renderMarkdown(TABELA);
	assert.ok(!/---/.test(html), "o separador vazou para o HTML");
});

test("formatação inline funciona dentro das células", () => {
	const html = renderMarkdown(`| Item | Nota |
| --- | --- |
| **Tráfego** | [ver](/servicos) |`);
	assert.match(html, /<td><strong>Tráfego<\/strong><\/td>/);
	assert.match(html, /<td><a href="\/servicos">ver<\/a><\/td>/);
});

test("célula com HTML injetado é escapada, não executada", () => {
	// conteúdo pode vir de LLM — a garantia do módulo tem que valer na tabela
	const html = renderMarkdown(`| Campo |
| --- |
| <script>alert(1)</script> |`);
	assert.ok(!/<script>/.test(html), "script cru passou para o HTML");
	assert.match(html, /&lt;script&gt;/);
});

test("tabela sem linha separadora não é tabela", () => {
	// duas linhas soltas com pipe são texto, não estrutura
	const html = renderMarkdown(`| isto | não é tabela |
| continua | sem separador |`);
	assert.ok(!/<table>/.test(html), "virou tabela sem declarar separador");
});

test("tabela convive com o resto do documento", () => {
	const html = renderMarkdown(`## Comparativo

| A | B |
| --- | --- |
| 1 | 2 |

Parágrafo depois.`);
	assert.match(html, /<h3>Comparativo<\/h3>/);
	assert.match(html, /<table>/);
	assert.match(html, /<p>Parágrafo depois\.<\/p>/);
	// a tabela fecha antes do parágrafo começar
	assert.ok(html.indexOf("</table>") < html.indexOf("<p>Parágrafo"), "tabela não fechou antes do parágrafo");
});

test("célula vazia não quebra a linha", () => {
	const html = renderMarkdown(`| A | B |
| --- | --- |
| 1 |  |`);
	assert.match(html, /<td>1<\/td><td><\/td>/);
});

test("wordCount conta o texto da tabela, não os pipes", () => {
	// o gate de espessura usa wordCount; pipe e hífen não são palavra
	// 11 palavras reais: 4 no cabeçalho, 3 e 4 nas linhas de dados
	const n = wordCount(TABELA);
	assert.ok(n >= 10, `contou só ${n} palavras`);
	assert.ok(n <= 13, `contou ${n} — está contando pipes ou separadores como palavra`);
});
