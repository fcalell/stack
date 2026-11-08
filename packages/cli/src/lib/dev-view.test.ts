import assert from "node:assert/strict";
import { test } from "node:test";
import { stripVTControlCharacters } from "node:util";
import { frame, type Pane, sanitizeLine, wrapLine } from "./dev-view.ts";

const ESC = "\x1b";

test("a line keeps its colours and drops what would move the cursor", () => {
	assert.equal(
		sanitizeLine(`${ESC}[2K${ESC}[1Gready ${ESC}[32mok${ESC}[39m`),
		`ready ${ESC}[32mok${ESC}[39m`,
	);
	assert.equal(
		sanitizeLine(`${ESC}]8;;http://x${ESC}\\link${ESC}]8;;${ESC}\\`),
		"link",
	);
	assert.equal(sanitizeLine("50%\r100%"), "100%");
	assert.equal(sanitizeLine("a\tb\x07"), "a    b");
});

test("a row holds as many columns as the width, a wide grapheme two", () => {
	assert.deepEqual(wrapLine("abcdef", 4), ["abcd", "ef"]);
	assert.deepEqual(wrapLine("✨✨✨", 4), ["✨✨", "✨"]);
	assert.deepEqual(wrapLine("", 4), [""]);
});

test("a row cut inside a colour starts with that colour", () => {
	assert.deepEqual(wrapLine(`${ESC}[31mabcdef${ESC}[39m`, 4), [
		`${ESC}[31mabcd`,
		`${ESC}[31mef${ESC}[39m`,
	]);
});

const pane = (name: string, lines: string[], over: Partial<Pane> = {}) => ({
	name,
	lines,
	status: { kind: "ready" } as const,
	notice: null,
	offset: 0,
	...over,
});
const plain = (rows: string[]) =>
	rows.map((row) => stripVTControlCharacters(row).trimEnd());

test("the frame lists the tasks beside the selected one's newest output", () => {
	const vite = pane("vite", ["one", "two", "three", "four"]);
	const stack = pane("stack", [], { status: null });
	const { rows } = frame({
		panes: [vite, stack],
		selected: vite,
		cols: 40,
		rows: 5,
	});
	assert.deepEqual(plain(rows), [
		" Tasks     │ vite · ready",
		" » ● vite  │ two",
		"   · stack │ three",
		"           │ four",
		" ↑↓ select   u/d scroll   g/G top/bottom   q quit",
	]);
});

test("a long task name ends in an ellipsis on a narrow terminal", () => {
	const long = pane("a-very-long-process-name", ["x"]);
	const { rows } = frame({ panes: [long], selected: long, cols: 30, rows: 4 });
	assert.equal(plain(rows)[1], " » ● a-ver… │ x");
});

test("a pane scrolled past its oldest line holds at it", () => {
	const vite = pane("vite", ["one", "two", "three"], { offset: 50 });
	const { rows, offset } = frame({
		panes: [vite],
		selected: vite,
		cols: 40,
		rows: 4,
	});
	assert.equal(offset, 1);
	assert.deepEqual(
		plain(rows)
			.slice(1, 3)
			.map((row) => row.split("│ ")[1]),
		["one", "two"],
	);
});
