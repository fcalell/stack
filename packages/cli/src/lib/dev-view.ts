import { emitKeypressEvents, type Key } from "node:readline";
import { stripVTControlCharacters } from "node:util";
import { log } from "@clack/prompts";
import pc from "picocolors";
import type { OutputStream } from "./proc.ts";
import { createLogContext } from "./prompt.ts";
import type { LogContext } from "./slots.ts";

export interface DevLog extends LogContext {
	step(msg: string): void;
}

export type ProcessStatus =
	| { kind: "starting"; attempt: number }
	| { kind: "ready" }
	| { kind: "exited"; code: number | null; signal: NodeJS.Signals | null };

// Where `stack dev` shows its processes' output and its own log.
export interface DevView {
	log: DevLog;
	output(name: string, stream: OutputStream, line: string): void;
	status(name: string, status: ProcessStatus): void;
	// Gives the terminal back, once `dev` has stopped its processes.
	close(): void;
}

const PREFIX_COLORS = [pc.yellow, pc.cyan, pc.magenta, pc.green, pc.blue];

// Each output line prefixed with its process's name, and the CLI's own
// messages through clack: for output nobody watches live (CI, an agent, a
// pipe).
export function createStreamView(): DevView {
	const prefixes = new Map<string, string>();
	// A process takes its colour at its first report, its launch, so the
	// colours follow the order the processes start in.
	const prefix = (name: string): string => {
		const known = prefixes.get(name);
		if (known !== undefined) return known;
		const color =
			PREFIX_COLORS[prefixes.size % PREFIX_COLORS.length] ?? pc.white;
		const made = color(`[${name}]`);
		prefixes.set(name, made);
		return made;
	};
	return {
		log: { ...createLogContext(), step: (msg) => log.step(msg) },
		output(name, stream, line) {
			const target = stream === "stdout" ? process.stdout : process.stderr;
			target.write(`${prefix(name)} ${line}\n`);
		},
		status(name) {
			prefix(name);
		},
		close() {},
	};
}

export interface Pane {
	name: string;
	lines: string[];
	// Null on the stack pane, which holds the CLI's own log.
	status: ProcessStatus | null;
	// A warning or error the stack pane took while another pane showed.
	notice: "warn" | "error" | null;
	// Rows scrolled up from the newest; 0 follows the output.
	offset: number;
}

const ESCAPE =
	// biome-ignore lint/suspicious/noControlCharactersInRegex: it matches escape sequences
	/\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07\x1b]*(?:\x07|\x1b\\)|[()*+].|[@-Z\\-_])/g;
// biome-ignore lint/suspicious/noControlCharactersInRegex: it matches escape sequences
const SGR = /^\x1b\[[0-9;:]*m$/;
// biome-ignore lint/suspicious/noControlCharactersInRegex: it matches escape sequences
const SGR_SPLIT = /(\x1b\[[0-9;:]*m)/;
// biome-ignore lint/suspicious/noControlCharactersInRegex: it matches escape sequences
const SGR_RESET = /^\x1b\[0?[;m]/;
// biome-ignore lint/suspicious/noControlCharactersInRegex: it matches escape sequences
const LONE_ESCAPE = /\x1b(?!\[[0-9;:]*m)/g;
// biome-ignore lint/suspicious/noControlCharactersInRegex: it matches control characters
const CONTROL = /[\x00-\x08\x0b-\x1a\x1c-\x1f\x7f]/g;

// A line as a terminal would leave it: the last text a carriage return
// started, its colours kept, every other escape sequence and control
// character dropped (a cursor move or a clear would draw over the frame).
export function sanitizeLine(raw: string): string {
	const shown = raw.split("\r").findLast((part) => part !== "") ?? "";
	return shown
		.replace(ESCAPE, (seq) => (SGR.test(seq) ? seq : ""))
		.replace(LONE_ESCAPE, "")
		.replaceAll("\t", "    ")
		.replace(CONTROL, "");
}

const graphemes = new Intl.Segmenter();
const EMOJI = /\p{Emoji_Presentation}|\p{Extended_Pictographic}️/u;
const WIDE =
	/[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦\u{20000}-\u{3FFFD}]/u;
const ZERO_WIDTH = /^[\p{M}\p{Cf}]+$/u;

// The columns a terminal gives a grapheme. A regex can read no Unicode width
// property, so wide is emoji and the CJK blocks.
function graphemeWidth(grapheme: string): number {
	if (EMOJI.test(grapheme) || WIDE.test(grapheme)) return 2;
	return ZERO_WIDTH.test(grapheme) ? 0 : 1;
}

function textWidth(text: string): number {
	let width = 0;
	for (const { segment } of graphemes.segment(stripVTControlCharacters(text))) {
		width += graphemeWidth(segment);
	}
	return width;
}

// A sanitized line cut into rows of at most `width` columns. A row after the
// first starts by replaying the colours in effect where the cut fell.
export function wrapLine(line: string, width: number): string[] {
	const rows: string[] = [];
	let row = "";
	let used = 0;
	let style = "";
	for (const [i, part] of line.split(SGR_SPLIT).entries()) {
		if (i % 2 === 1) {
			row += part;
			// A reset, alone or opening a list, starts the style over.
			style = SGR_RESET.test(part) ? part : style + part;
			continue;
		}
		for (const { segment } of graphemes.segment(part)) {
			const w = graphemeWidth(segment);
			if (used + w > width && used > 0) {
				rows.push(row);
				row = style;
				used = 0;
			}
			row += segment;
			used += w;
		}
	}
	rows.push(row);
	return rows;
}

function truncate(text: string, width: number): string {
	if (textWidth(text) <= width) return text;
	let out = "";
	let used = 0;
	for (const { segment } of graphemes.segment(text)) {
		const w = graphemeWidth(segment);
		if (used + w > width - 1) break;
		out += segment;
		used += w;
	}
	return width < 1 ? "" : `${out}…`;
}

function fit(text: string, width: number): string {
	return text + " ".repeat(Math.max(0, width - textWidth(text)));
}

function failed(status: ProcessStatus & { kind: "exited" }): boolean {
	return status.code !== 0 && status.signal === null;
}

function icon(pane: Pane): string {
	const { status, notice } = pane;
	if (status === null) {
		if (notice === null) return pc.dim("·");
		return notice === "error" ? pc.red("!") : pc.yellow("!");
	}
	if (status.kind === "starting") return pc.yellow("◌");
	if (status.kind === "ready") return pc.green("●");
	return failed(status) ? pc.red("✗") : pc.dim("○");
}

function statusWord(status: ProcessStatus): string {
	if (status.kind === "starting") {
		return status.attempt > 0 ? `restart ${status.attempt}` : "starting";
	}
	if (status.kind === "ready") return "ready";
	if (status.signal !== null) return "stopped";
	return status.code === null ? "failed to start" : `exited ${status.code}`;
}

interface Layout {
	side: number;
	out: number;
	height: number;
}

// The task list is as wide as its longest name with its marker and icon,
// up to two fifths of the terminal; the output takes the rest, past the
// separator and a space.
function layout(panes: Pane[], cols: number, rows: number): Layout {
	const longest = Math.max(5, ...panes.map((pane) => textWidth(pane.name)));
	const side = Math.max(1, Math.min(longest + 6, Math.floor(cols * 0.4)));
	return {
		side,
		out: Math.max(1, cols - side - 2),
		height: Math.max(0, rows - 2),
	};
}

// The rows a pane shows, `offset` rows up from its newest, and that offset
// held to what its output has.
function visibleRows(
	lines: string[],
	width: number,
	height: number,
	offset: number,
): { rows: string[]; offset: number } {
	const need = height + offset;
	const chunks: string[][] = [];
	let count = 0;
	for (let i = lines.length - 1; i >= 0 && count < need; i--) {
		const wrapped = wrapLine(lines[i] ?? "", width);
		chunks.push(wrapped);
		count += wrapped.length;
	}
	const all = chunks.reverse().flat();
	const held = Math.min(offset, Math.max(0, all.length - height));
	const end = all.length - held;
	return { rows: all.slice(Math.max(0, end - height), end), offset: held };
}

function header(pane: Pane, offset: number): string {
	const word =
		pane.status === null ? "" : pc.dim(` · ${statusWord(pane.status)}`);
	const scrolled = offset > 0 ? pc.dim(`   ↑ ${offset} rows · G follows`) : "";
	return `${pc.bold(pane.name)}${word}${scrolled}`;
}

function taskCell(pane: Pane, selected: boolean, width: number): string {
	const cell = fit(
		`${selected ? " »" : "  "} ${icon(pane)} ${truncate(pane.name, width - 6)}`,
		width,
	);
	return selected ? pc.inverse(cell) : cell;
}

const SEPARATOR = pc.dim("│");
const HINTS = pc.dim(" ↑↓ select   u/d scroll   g/G top/bottom   q quit");

export interface ScreenModel {
	panes: Pane[];
	selected: Pane;
	cols: number;
	rows: number;
}

// The screen top to bottom: the header row, the task list beside the
// selected pane's output, the key hints. `offset` is the selected pane's
// scroll held to what its output has.
export function frame({ panes, selected, cols, rows }: ScreenModel): {
	rows: string[];
	offset: number;
} {
	const { side, out, height } = layout(panes, cols, rows);
	const view = visibleRows(selected.lines, out, height, selected.offset);
	const lines = [
		`${fit(pc.bold(" Tasks"), side)}${SEPARATOR} ${header(selected, view.offset)}`,
	];
	for (let i = 0; i < height; i++) {
		const pane = panes[i];
		const cell =
			pane === undefined
				? " ".repeat(side)
				: taskCell(pane, pane === selected, side);
		lines.push(`${cell}${SEPARATOR} ${view.rows[i] ?? ""}`);
	}
	lines.push(HINTS);
	return { rows: lines, offset: view.offset };
}

const SCROLLBACK = 2000;

// The full-screen view, as turbo draws its tasks: a list of the processes
// and the stack pane beside the selected one's output. It holds the
// terminal's alternate screen and its keys until `close`.
export function createScreenView(opts: { onQuit(): void }): DevView {
	const { stdin, stdout } = process;
	const stack: Pane = {
		name: "stack",
		lines: [],
		status: null,
		notice: null,
		offset: 0,
	};
	const processes = new Map<string, Pane>();
	const errors: string[] = [];
	let selected = stack;
	let picked = false;
	let pending: ReturnType<typeof setTimeout> | undefined;
	let open = true;

	const panes = () => [...processes.values(), stack];
	const size = () => ({ cols: stdout.columns || 80, rows: stdout.rows || 24 });

	const draw = () => {
		pending = undefined;
		if (!open) return;
		const { rows, offset } = frame({ panes: panes(), selected, ...size() });
		selected.offset = offset;
		const body = rows
			.map((row, i) => `\x1b[${i + 1};1H${row}\x1b[0m\x1b[K`)
			.join("");
		// Synchronized output (DEC mode 2026): a terminal that has it shows the
		// frame whole; one that lacks it ignores the mode.
		stdout.write(`\x1b[?2026h${body}\x1b[J\x1b[?2026l`);
	};
	const schedule = () => {
		pending ??= setTimeout(draw, 16);
	};

	const append = (pane: Pane, text: string) => {
		const { cols, rows } = size();
		const { out } = layout(panes(), cols, rows);
		for (const raw of text.split("\n")) {
			const line = sanitizeLine(raw);
			// A pane scrolled back keeps its place as lines arrive below.
			if (pane === selected && pane.offset > 0) {
				pane.offset += wrapLine(line, out).length;
			}
			pane.lines.push(line);
		}
		if (pane.lines.length > SCROLLBACK) {
			pane.lines.splice(0, pane.lines.length - SCROLLBACK);
		}
		schedule();
	};

	const processPane = (name: string): Pane => {
		const known = processes.get(name);
		if (known !== undefined) return known;
		const pane: Pane = {
			name,
			lines: [],
			status: { kind: "starting", attempt: 0 },
			notice: null,
			offset: 0,
		};
		processes.set(name, pane);
		// The first process shows until a key picks another pane.
		if (!picked && selected === stack) selected = pane;
		return pane;
	};

	const entry =
		(symbol: string, level?: "warn" | "error") => (message: string) => {
			append(
				stack,
				message
					.split("\n")
					.map((line, i) => (i === 0 ? `${symbol} ${line}` : `  ${line}`))
					.join("\n"),
			);
			if (level === undefined) return;
			if (level === "error") errors.push(message);
			if (selected !== stack && stack.notice !== "error") stack.notice = level;
		};

	const pick = (delta: number) => {
		const list = panes();
		const next =
			list[
				Math.min(list.length - 1, Math.max(0, list.indexOf(selected) + delta))
			];
		if (next === undefined || next === selected) return;
		picked = true;
		selected = next;
		if (next === stack) stack.notice = null;
		schedule();
	};
	const scroll = (rows: number) => {
		selected.offset = Math.max(0, selected.offset + rows);
		schedule();
	};
	const page = () => Math.max(1, size().rows - 3);
	const top = () => scroll(Number.MAX_SAFE_INTEGER);
	const bottom = () => {
		selected.offset = 0;
		schedule();
	};
	const keys: Record<string, () => void> = {
		up: () => pick(-1),
		k: () => pick(-1),
		down: () => pick(1),
		j: () => pick(1),
		pageup: () => scroll(page()),
		u: () => scroll(page()),
		pagedown: () => scroll(-page()),
		d: () => scroll(-page()),
		home: top,
		g: top,
		end: bottom,
		G: bottom,
		q: () => opts.onQuit(),
	};
	const onKey = (_text: string | undefined, key: Key | undefined) => {
		if (key?.name === undefined) return;
		// Raw mode turns Ctrl+C into a key instead of SIGINT.
		if (key.ctrl && key.name === "c") return opts.onQuit();
		keys[key.shift && key.name === "g" ? "G" : key.name]?.();
	};

	const restore = (): boolean => {
		if (!open) return false;
		open = false;
		clearTimeout(pending);
		stdin.off("keypress", onKey);
		stdin.setRawMode(false);
		stdin.pause();
		stdout.off("resize", draw);
		stdout.write("\x1b[?7h\x1b[?25h\x1b[?1049l");
		return true;
	};
	// A `process.exit` that skips `close` still gives the terminal back.
	process.on("exit", restore);

	// The alternate screen, the cursor hidden, line wrap off: a row longer
	// than the terminal is cut at its edge instead of pushing the frame down.
	stdout.write("\x1b[?1049h\x1b[?25l\x1b[?7l");
	emitKeypressEvents(stdin);
	stdin.setRawMode(true);
	stdin.on("keypress", onKey);
	stdin.resume();
	stdout.on("resize", draw);
	draw();

	return {
		log: {
			info: entry(pc.blue("●")),
			success: entry(pc.green("◆")),
			step: entry(pc.green("◇")),
			warn: entry(pc.yellow("▲"), "warn"),
			error: entry(pc.red("■"), "error"),
		},
		output(name, _stream, line) {
			append(processPane(name), line);
		},
		status(name, status) {
			processPane(name).status = status;
			schedule();
		},
		close() {
			if (!restore()) return;
			process.off("exit", restore);
			// The screen's log leaves with the alternate screen; its errors say
			// why `dev` stopped, so they are printed again where they stay.
			for (const message of errors) log.error(message);
		},
	};
}
