import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateServiceBarrel, hasServiceFiles } from "./barrel.ts";

// The barrel lands in the consumer's tracked tree, so the real assertion is
// that the consumer's formatter has nothing to say about it: anything else
// dirties a tracked file on every `stack generate`.
const require_ = createRequire(import.meta.url);
const biomeBin = join(
	dirname(require_.resolve("@biomejs/biome/package.json")),
	"bin",
	"biome",
);

function formatBarrel(source: string): string {
	return execFileSync(
		process.execPath,
		[biomeBin, "format", "--stdin-file-path=index.ts"],
		{ input: source, encoding: "utf8" },
	);
}

const scratchDirs: string[] = [];

afterEach(() => {
	while (scratchDirs.length > 0) {
		const dir = scratchDirs.pop();
		if (dir) rmSync(dir, { recursive: true, force: true });
	}
});

function makeCwd(files: string[]): string {
	const dir = mkdtempSync(join(tmpdir(), "node-barrel-"));
	scratchDirs.push(dir);
	if (files.length > 0) {
		const servicesDir = join(dir, "src", "server", "services");
		mkdirSync(servicesDir, { recursive: true });
		for (const file of files) {
			writeFileSync(join(servicesDir, file), "// fixture");
		}
	}
	return dir;
}

describe("generateServiceBarrel", () => {
	it("imports each service's default export and lists them sorted", () => {
		const cwd = makeCwd(["queue.ts", "board-watcher.ts"]);
		const barrel = generateServiceBarrel(cwd);
		expect(barrel).toContain('import boardWatcher from "./board-watcher.ts";');
		expect(barrel).toContain('import queue from "./queue.ts";');
		expect(barrel).toContain("export const services = [boardWatcher, queue];");
	});

	it("excludes tests, declarations, and the barrel itself", () => {
		const cwd = makeCwd([
			"board.ts",
			"board.test.ts",
			"types.d.ts",
			"index.ts",
		]);
		const barrel = generateServiceBarrel(cwd);
		expect(barrel).toContain('import board from "./board.ts";');
		expect(barrel).not.toContain("test");
		expect(barrel).not.toContain("types");
		expect(barrel).toContain("export const services = [board];");
	});

	it("emits a barrel the formatter leaves alone, however many services", () => {
		for (const count of [1, 2, 8, 20]) {
			const files = Array.from({ length: count }, (_, i) => `service-${i}.ts`);
			const barrel = generateServiceBarrel(makeCwd(files));
			expect(formatBarrel(barrel), `${count} services`).toBe(barrel);
		}
	});

	it("breaks the list one per line once it outgrows the line width", () => {
		const cwd = makeCwd(
			[
				"board",
				"gate",
				"mcp",
				"meter",
				"proposals",
				"review",
				"runs",
				"sessions",
			].map((name) => `${name}.ts`),
		);
		expect(generateServiceBarrel(cwd)).toContain(
			"export const services = [\n\tboard,\n\tgate,\n",
		);
	});
});

describe("hasServiceFiles", () => {
	it("is false for a missing services directory", () => {
		expect(hasServiceFiles(makeCwd([]))).toBe(false);
	});

	it("is false when only excluded files exist", () => {
		expect(hasServiceFiles(makeCwd(["index.ts", "x.test.ts"]))).toBe(false);
	});

	it("is true when a service module exists", () => {
		expect(hasServiceFiles(makeCwd(["board.ts"]))).toBe(true);
	});
});
