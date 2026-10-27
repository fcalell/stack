// The line diff of two texts and the numbers a `Diff` draws from its hunks, free of any framework: both platforms' `Diff` draw from it.

import { diffLines } from "diff";
import type { DiffLine, Hunk } from "./descriptors.ts";

// The lines of context a hunk keeps around its change, as git shows them.
const CONTEXT = 3;

// One line of the edit: kept on both sides, or added or removed, its text with
// its line end, so a last line without one differs from the same line with one.
interface Op {
	kind: "context" | "added" | "removed";
	raw: string;
}

// The unified line diff of two texts as the hunks a `Diff` draws, three lines
// of context around each change, as git shows them. Where an added or removed
// block could stand at more than one place at the same cost (its last line
// repeats the line before it, or its first the line after), it stands where
// git's indent heuristic puts it, so the block reads whole and balanced; and a
// block added after the last member of a list, which gives the closing line
// before it a comma, draws that closing line changed, so the block shows with
// its own close (`readable`).
export function lineHunks(before: string, after: string): Hunk[] {
	const ops: Op[] = [];
	for (const change of diffLines(before, after)) {
		const kind = change.added
			? "added"
			: change.removed
				? "removed"
				: "context";
		for (const raw of splitLines(change.value)) ops.push({ kind, raw });
	}
	return hunksOf(readable(ops));
}

// A text's lines, each with its line end; the last one without when the text
// has none.
function splitLines(text: string): string[] {
	if (text === "") return [];
	const lines = text.split("\n").map((line) => `${line}\n`);
	const last = lines.pop() as string;
	if (last !== "\n") lines.push(last.slice(0, -1));
	return lines;
}

// The ops with each pure block slid to its best place, then each closing line
// a block hangs a comma on drawn changed.
function readable(ops: readonly Op[]): Op[] {
	return commaClosed(slid(ops));
}

// ── Sliding (git's indent heuristic, xdiff's `xdl_change_compact`) ──

const MAX_INDENT = 200;
const MAX_BLANKS = 20;
const START_OF_FILE_PENALTY = 1;
const END_OF_FILE_PENALTY = 21;
const TOTAL_BLANK_WEIGHT = -30;
const POST_BLANK_WEIGHT = 6;
const RELATIVE_INDENT_PENALTY = -4;
const RELATIVE_INDENT_WITH_BLANK_PENALTY = 10;
const RELATIVE_OUTDENT_PENALTY = 24;
const RELATIVE_OUTDENT_WITH_BLANK_PENALTY = 17;
const RELATIVE_DEDENT_PENALTY = 23;
const RELATIVE_DEDENT_WITH_BLANK_PENALTY = 17;
const INDENT_WEIGHT = 60;

// A line's indent, a tab to the next multiple of eight; -1 for a blank line.
function indentOf(raw: string): number {
	let indent = 0;
	for (const char of raw) {
		if (char === " ") indent += 1;
		else if (char === "\t") indent += 8 - (indent % 8);
		else if (char.trim() !== "") return indent;
		if (indent >= MAX_INDENT) return MAX_INDENT;
	}
	return -1;
}

interface Score {
	effective: number;
	penalty: number;
}

// What a split before the line at `at` of one side costs: an edge of the file,
// blank lines around it and the indent it steps in or out by.
function addSplit(lines: readonly string[], at: number, score: Score) {
	const endOfFile = at >= lines.length;
	const indent = endOfFile ? -1 : indentOf(lines[at] as string);
	let preBlank = 0;
	let preIndent = -1;
	for (let line = at - 1; line >= 0; line--) {
		preIndent = indentOf(lines[line] as string);
		if (preIndent !== -1) break;
		preBlank += 1;
		if (preBlank === MAX_BLANKS) {
			preIndent = 0;
			break;
		}
	}
	let postBlank = 0;
	let postIndent = -1;
	for (let line = at + 1; line < lines.length; line++) {
		postIndent = indentOf(lines[line] as string);
		if (postIndent !== -1) break;
		postBlank += 1;
		if (postBlank === MAX_BLANKS) {
			postIndent = 0;
			break;
		}
	}
	if (preIndent === -1 && preBlank === 0)
		score.penalty += START_OF_FILE_PENALTY;
	if (endOfFile) score.penalty += END_OF_FILE_PENALTY;
	const blankAfter = indent === -1 ? 1 + postBlank : 0;
	const totalBlank = preBlank + blankAfter;
	score.penalty += TOTAL_BLANK_WEIGHT * totalBlank;
	score.penalty += POST_BLANK_WEIGHT * blankAfter;
	const effective = indent !== -1 ? indent : postIndent;
	const anyBlanks = totalBlank !== 0;
	score.effective += effective;
	if (effective === -1 || preIndent === -1 || effective === preIndent) return;
	if (effective > preIndent)
		score.penalty += anyBlanks
			? RELATIVE_INDENT_WITH_BLANK_PENALTY
			: RELATIVE_INDENT_PENALTY;
	else if (postIndent !== -1 && postIndent > effective)
		score.penalty += anyBlanks
			? RELATIVE_OUTDENT_WITH_BLANK_PENALTY
			: RELATIVE_OUTDENT_PENALTY;
	else
		score.penalty += anyBlanks
			? RELATIVE_DEDENT_WITH_BLANK_PENALTY
			: RELATIVE_DEDENT_PENALTY;
}

function compare(a: Score, b: Score): number {
	const indents = Math.sign(a.effective - b.effective);
	return INDENT_WEIGHT * indents + (a.penalty - b.penalty);
}

// Each block of added or of removed lines with kept lines on both sides slides
// over the kept lines its own lines repeat, to the place that scores best, a
// later place winning a tie as git's does.
function slid(given: readonly Op[]): Op[] {
	const ops = [...given];
	let start = 0;
	while (start < ops.length) {
		const kind = (ops[start] as Op).kind;
		let end = start;
		while (end < ops.length && (ops[end] as Op).kind === kind) end++;
		const pure =
			kind !== "context" &&
			(start === 0 || (ops[start - 1] as Op).kind === "context") &&
			(end === ops.length || (ops[end] as Op).kind === "context");
		if (pure) slide(ops, start, end, kind);
		start = end;
	}
	return ops;
}

function slide(ops: Op[], start: number, end: number, kind: Op["kind"]) {
	const size = end - start;
	// The block's side: its lines and the kept ones, the other side's left out.
	const side: number[] = [];
	ops.forEach((op, at) => {
		if (op.kind === "context" || op.kind === kind) side.push(at);
	});
	const lines = side.map((at) => (ops[at] as Op).raw);
	const first = side.indexOf(start);
	let top = first;
	// It slides over kept lines alone, never past a change of the other side.
	while (
		top > 0 &&
		side[top - 1] === (side[top] as number) - 1 &&
		ops[side[top - 1] as number]?.kind === "context" &&
		lines[top - 1] === lines[top - 1 + size]
	)
		top--;
	let bottom = first;
	while (
		bottom + size < lines.length &&
		side[bottom + size] === (side[bottom + size - 1] as number) + 1 &&
		ops[side[bottom + size] as number]?.kind === "context" &&
		lines[bottom + size] === lines[bottom]
	)
		bottom++;
	if (top === bottom) return;
	let best = first;
	let bestScore: Score | undefined;
	for (let at = top; at <= bottom; at++) {
		const score: Score = { effective: 0, penalty: 0 };
		addSplit(lines, at + size, score);
		addSplit(lines, at, score);
		if (!bestScore || compare(score, bestScore) <= 0) {
			best = at;
			bestScore = score;
		}
	}
	if (best === first) return;
	// The kept and changed lines between the two places trade kinds; their
	// texts are the same, as the slide required.
	const from = Math.min(first, best);
	const to = Math.max(first, best) + size;
	for (let at = from; at < to; at++) {
		const changed = at >= best && at < best + size;
		(ops[side[at] as number] as Op).kind = changed ? kind : "context";
	}
}

// ── A closing line given a comma ──

const CLOSER = /^[ \t]*[}\])][ \t]*\r?\n?$/;

// The depth a line moves an open bracket by, outside strings: whether the
// lines open and close what they open, never closing more than they opened.
function balanced(lines: readonly string[]): boolean {
	let depth = 0;
	for (const line of lines) {
		let quote: string | undefined;
		for (let at = 0; at < line.length; at++) {
			const char = line[at] as string;
			if (quote) {
				if (char === "\\") at++;
				else if (char === quote) quote = undefined;
			} else if (char === '"' || char === "'" || char === "`") quote = char;
			else if ("{[(".includes(char)) depth++;
			else if ("}])".includes(char) && --depth < 0) return false;
		}
	}
	return depth === 0;
}

// The closing line with a comma hung on it, before its line end.
function withComma(raw: string): string {
	const end = /\r?\n?$/.exec(raw)?.[0] ?? "";
	return `${raw.slice(0, raw.length - end.length).trimEnd()},${end}`;
}

// A block added after the last member of a list gives the closing line before
// it a comma: the cheapest diff adds the comma'd close and the block less its
// own close, keeping the old close as context, which reads as broken. Where
// the block (its first line the kept close with a comma, the rest and that
// close balanced) stands so, the close draws changed instead: the old one
// removed, the comma'd one added, the block whole after it. A removed last
// member draws the same way, mirrored.
function commaClosed(given: readonly Op[]): Op[] {
	const ops = [...given];
	for (let close = 1; close < ops.length; close++) {
		const kept = ops[close] as Op;
		if (kept.kind !== "context" || !CLOSER.test(kept.raw)) continue;
		const kind = (ops[close - 1] as Op).kind;
		if (kind === "context") continue;
		let start = close - 1;
		while (start > 0 && (ops[start - 1] as Op).kind === kind) start--;
		if (start > 0 && (ops[start - 1] as Op).kind !== "context") continue;
		const block = ops.slice(start, close);
		if (block.length < 2 || (block[0] as Op).raw !== withComma(kept.raw))
			continue;
		if (!balanced([...block.slice(1).map((op) => op.raw), kept.raw])) continue;
		const removed: Op = { kind: "removed", raw: kept.raw };
		const added: Op = { kind: "added", raw: kept.raw };
		ops.splice(
			start,
			close - start + 1,
			...(kind === "added"
				? [removed, ...block, added]
				: [...block, removed, added]),
		);
		close += 1;
	}
	return ops;
}

// ── Hunks ──

// The ops as git's hunks: each change with three kept lines around it, two
// changes the context of each other apart joined into one hunk.
function hunksOf(ops: readonly Op[]): Hunk[] {
	const changed = ops.flatMap((op, at) => (op.kind === "context" ? [] : [at]));
	const ranges: [number, number][] = [];
	for (const at of changed) {
		const last = ranges.at(-1);
		if (last && at - last[1] <= 2 * CONTEXT + 1) last[1] = at;
		else ranges.push([at, at]);
	}
	// The line numbers each op stands at, before and after.
	const numbers: { before: number; after: number }[] = [];
	let old = 1;
	let next = 1;
	for (const op of ops) {
		numbers.push({ before: old, after: next });
		if (op.kind !== "added") old++;
		if (op.kind !== "removed") next++;
	}
	return ranges.map(([from, to]) => {
		const first = Math.max(0, from - CONTEXT);
		const last = Math.min(ops.length - 1, to + CONTEXT);
		const lines: DiffLine[] = [];
		let oldLines = 0;
		let newLines = 0;
		for (let at = first; at <= last; at++) {
			const op = ops[at] as Op;
			const { before, after } = numbers[at] as (typeof numbers)[number];
			const text = op.raw.endsWith("\n") ? op.raw.slice(0, -1) : op.raw;
			if (op.kind === "added") {
				lines.push({ kind: "added", text, after });
				newLines++;
			} else if (op.kind === "removed") {
				lines.push({ kind: "removed", text, before });
				oldLines++;
			} else {
				lines.push({ kind: "context", text, before, after });
				oldLines++;
				newLines++;
			}
		}
		const { before: oldStart, after: newStart } = numbers[
			first
		] as (typeof numbers)[number];
		return {
			header: `@@ -${start(oldStart, oldLines)},${oldLines} +${start(newStart, newLines)},${newLines} @@`,
			lines,
		};
	});
}

// A side with no lines starts at 0 in the header, as git writes it.
function start(first: number, count: number): number {
	return count === 0 ? first - 1 : first;
}

// A line's indent in no-break spaces (a tab as two), so a wrapped line
// never breaks right after it.
export function held(text: string): string {
	return text.replace(/^[ \t]+/, (indent) =>
		indent.replaceAll(" ", "\u00a0").replaceAll("\t", "\u00a0\u00a0"),
	);
}

// A line parted at its indent: the leading spaces and tabs, held (`held`), and
// the rest. A platform stands the rest beside its indent, so a line that wraps
// hangs at its own indent, never left of the key it continues.
export function indented(text: string): { indent: string; rest: string } {
	const lead = /^[ \t]*/.exec(text)?.[0] ?? "";
	return { indent: held(lead), rest: text.slice(lead.length) };
}

// A hunk is keyed by its place among the hunks and its first line numbers,
// which no two hunks of one diff share.
export function hunkKey(hunk: Hunk, at: number): string {
	const first = hunk.lines[0];
	return `${at}:${first?.before ?? ""}:${first?.after ?? ""}`;
}

// What a hunk's header says besides its ranges: the enclosing function git
// writes after `@@ … @@`, or a header in no git form whole; a bare range says
// nothing.
export function hunkContext(hunk: Hunk): string | undefined {
	const { header } = hunk;
	if (header === undefined) return undefined;
	const git = /^@@[^@]*@@(.*)$/.exec(header);
	const said = (git ? (git[1] ?? "") : header).trim();
	return said === "" ? undefined : said;
}

// The lines a diff leaves unshown before a hunk: how many, where the lines'
// numbers count them, else none said.
export interface Elision {
	lines?: number;
}

// The lines unshown before the hunk at `at`, or `undefined` where none are:
// before the first, when it starts past the file's first line; between two
// hunks, when a line number steps over a line, the step counting them. Hunks
// given without numbers are parted wherever two meet, uncounted.
export function elidedBefore(
	hunks: readonly Hunk[],
	at: number,
): Elision | undefined {
	const hunk = hunks[at];
	if (hunk === undefined) return undefined;
	for (const side of ["before", "after"] as const) {
		const start = hunk.lines.find((line) => line[side] !== undefined)?.[side];
		if (start === undefined) continue;
		if (at === 0) return start > 1 ? { lines: start - 1 } : undefined;
		const end = hunks[at - 1]?.lines.findLast(
			(line) => line[side] !== undefined,
		)?.[side];
		if (end === undefined) continue;
		return start > end + 1 ? { lines: start - end - 1 } : undefined;
	}
	return at > 0 ? {} : undefined;
}

// Where a line of code may wrap besides its spaces: after a run of the
// punctuation that ends a token (a member's dot, a call's paren, a path's
// slash, a comma, an operator's last sign), so a line wider than its box
// breaks between tokens. Each part ends at one such place; a platform joins
// them with its break opportunity (a web `<wbr>`, a zero-width space on the
// phone).
const TOKEN_END = /(?<=[.,;:([{/=&|>])(?=[^\s.,;:([{/=&|>])/;

export function tokenParts(text: string): string[] {
	return text.split(TOKEN_END);
}

// A line is keyed by its numbers, which no two lines of one hunk share.
export function lineKey(line: DiffLine): string {
	return `${line.kind}:${line.before ?? ""}:${line.after ?? ""}`;
}

// The number columns a diff draws: a side's column stands when a line of the
// diff carries its number, so a diff that only adds or only removes draws one.
export interface Numbers {
	before: boolean;
	after: boolean;
}

export const BOTH: Numbers = { before: true, after: true };

// The number columns a density draws. On touch one: the new side where the
// diff has it, else the only side, so a narrow line keeps its characters for
// the code.
export function numbersAt(numbers: Numbers, touch: boolean): Numbers {
	return touch && numbers.before && numbers.after
		? { before: false, after: true }
		: numbers;
}

export function numbersOf(hunks: readonly Hunk[]): Numbers {
	const lines = hunks.flatMap((hunk) => hunk.lines);
	return {
		before: lines.some((line) => line.before !== undefined),
		after: lines.some((line) => line.after !== undefined),
	};
}
