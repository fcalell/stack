import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateServiceBarrel, hasServiceFiles } from "./barrel";

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
		expect(barrel).toContain('import boardWatcher from "./board-watcher";');
		expect(barrel).toContain('import queue from "./queue";');
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
		expect(barrel).toContain('import board from "./board";');
		expect(barrel).not.toContain("test");
		expect(barrel).not.toContain("types");
		expect(barrel).toContain("export const services = [board];");
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
