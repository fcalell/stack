// The shared core of every package's `scripts/verify.ts`: check runner,
// summary/exit, CSS block parsing, the Tailwind-CLI build driver, and the
// matrix-cell enumeration. devDependency-only tooling for the verify scripts,
// never a runtime surface (the README marks the subpath internal).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

export function normalize(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

// The body of the first block whose header matches, brace-balanced so a nested
// rule (`@layer base { .dark { … } }`) comes back whole.
export function blockBody(css: string, header: string): string {
	const start = css.indexOf(header);
	assert(start >= 0, `stylesheet has no "${header}"`);
	const open = css.indexOf("{", start);
	let depth = 0;
	for (let i = open; i < css.length; i++) {
		if (css[i] === "{") depth++;
		else if (css[i] === "}") {
			depth--;
			if (depth === 0) return css.slice(open + 1, i);
		}
	}
	throw new Error(`unterminated "${header}" block`);
}

// Declarations in source order. Property names are not restricted to custom
// properties: a `@utility` body and a mode block also carry plain CSS
// properties.
export function declarations(body: string): Array<[string, string]> {
	const out: Array<[string, string]> = [];
	for (const match of body.matchAll(
		/(--[A-Za-z0-9_*-]+|[a-z-]+)\s*:\s*([^;{}]+);/g,
	)) {
		const [, property, value] = match;
		if (property && value) out.push([property, normalize(value)]);
	}
	return out;
}

export function declarationMap(body: string): Map<string, string> {
	return new Map(declarations(body));
}

// Tailwind escapes `.`, `[`, `(` and their siblings in the selectors it emits
// (`.px-3\.5 {`), so the raw class name has to be CSS-escaped before it is
// regex-escaped or a class that did compile reads as missing.
export function rule(css: string, selector: string): string | undefined {
	const escaped = selector
		.replace(/[.[\]()/%:]/g, (char) => `\\${char}`)
		.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return css.match(new RegExp(`\\.${escaped}\\s*\\{([^}]*)\\}`))?.[1];
}

// ── Check runner ────────────────────────────────────────────────────

interface Result {
	id: string;
	name: string;
	ok: boolean;
	detail: string;
}

const results: Result[] = [];

export function check(id: string, name: string, run: () => string): void {
	try {
		results.push({ id, name, ok: true, detail: run() });
	} catch (error) {
		results.push({
			id,
			name,
			ok: false,
			detail: error instanceof Error ? error.message : String(error),
		});
	}
}

export function report(): never {
	let failed = 0;
	for (const result of results) {
		if (!result.ok) failed++;
		console.log(
			`${result.ok ? "PASS" : "FAIL"}  ${result.id}  ${result.name}\n        ${result.detail}`,
		);
	}
	console.log(`\n${results.length - failed}/${results.length} checks passed`);
	process.exit(failed === 0 ? 0 : 1);
}

// ── Tool binaries and the Tailwind CLI build driver ─────────────────

// `pkgDir` anchors the search: the package's own node_modules, then the
// workspace root's.
export function binPath(pkgDir: string, name: string): string {
	const candidates = [
		resolve(pkgDir, `node_modules/.bin/${name}`),
		resolve(pkgDir, `../../node_modules/.bin/${name}`),
	];
	const bin = candidates.find((path) => existsSync(path));
	assert(bin, `no ${name} binary at ${candidates.join(" or ")}`);
	return bin;
}

export function tailwindBuild(
	pkgDir: string,
	inputPath: string,
	outputPath: string,
	cwd: string,
): string {
	const bin = binPath(pkgDir, "tailwindcss");
	execFileSync(bin, ["--input", inputPath, "--output", outputPath], {
		cwd,
		stdio: "pipe",
	});
	return readFileSync(outputPath, "utf8");
}

// ── Matrix-cell enumeration ─────────────────────────────────────────

export type AnyCva = (props: Record<string, string>) => string;

export interface Family {
	name: string;
	cva: AnyCva;
	axes: Record<string, readonly string[]>;
}

export function classes(value: string): string[] {
	return value.split(/\s+/).filter(Boolean);
}

// One axis value's cell is what its rendering adds over the rendering every
// other value of that axis shares. A compound row folds into the axis it
// keys off, which is what makes `bg-accent` reachable as BUTTON's primary cell.
export function matrixCells(families: Family[]): Map<string, Set<string>> {
	const out = new Map<string, Set<string>>();
	for (const family of families) {
		for (const [axis, values] of Object.entries(family.axes)) {
			const sets = values.map(
				(value) => new Set(classes(family.cva({ [axis]: value }))),
			);
			const first = sets[0];
			if (!first) continue;
			const shared = new Set(
				[...first].filter((name) => sets.every((set) => set.has(name))),
			);
			values.forEach((value, index) => {
				const set = sets[index];
				if (!set) return;
				const cell = new Set([...set].filter((name) => !shared.has(name)));
				if (cell.size > 0) out.set(`${family.name}.${axis}.${value}`, cell);
			});
		}
	}
	return out;
}
