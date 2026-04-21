import {
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ScaffoldError } from "#lib/errors";
import { writeScaffoldSpecs } from "#lib/scaffold";

describe("writeScaffoldSpecs", () => {
	let templatesDir: string;
	let cwd: string;

	beforeEach(() => {
		templatesDir = mkdtempSync(join(tmpdir(), "scaffold-tmpl-"));
		cwd = mkdtempSync(join(tmpdir(), "scaffold-cwd-"));
	});

	afterEach(() => {
		rmSync(templatesDir, { recursive: true, force: true });
		rmSync(cwd, { recursive: true, force: true });
	});

	it("copies each template to its target, creating parent dirs", async () => {
		const tmpl = join(templatesDir, "schema.ts");
		writeFileSync(tmpl, "// schema content\n");

		const created = await writeScaffoldSpecs(
			[
				{
					source: pathToFileURL(tmpl),
					target: "src/schema/index.ts",
					plugin: "db",
				},
			],
			cwd,
		);

		expect(created).toEqual(["src/schema/index.ts"]);
		const out = readFileSync(join(cwd, "src/schema/index.ts"), "utf8");
		expect(out).toBe("// schema content\n");
	});

	it("skips targets that already exist and omits them from the created list", async () => {
		const tmpl = join(templatesDir, "schema.ts");
		writeFileSync(tmpl, "// new content\n");
		writeFileSync(join(cwd, "existing.ts"), "// original");

		const created = await writeScaffoldSpecs(
			[
				{
					source: pathToFileURL(tmpl),
					target: "existing.ts",
					plugin: "db",
				},
			],
			cwd,
		);

		expect(created).toEqual([]);
		expect(readFileSync(join(cwd, "existing.ts"), "utf8")).toBe("// original");
	});

	it("throws ScaffoldError on duplicate target before any writes", async () => {
		const tmplA = join(templatesDir, "a.ts");
		const tmplB = join(templatesDir, "b.ts");
		writeFileSync(tmplA, "// a\n");
		writeFileSync(tmplB, "// b\n");

		await expect(
			writeScaffoldSpecs(
				[
					{
						source: pathToFileURL(tmplA),
						target: "src/same.ts",
						plugin: "alpha",
					},
					{
						source: pathToFileURL(tmplB),
						target: "src/same.ts",
						plugin: "beta",
					},
				],
				cwd,
			),
		).rejects.toBeInstanceOf(ScaffoldError);

		// Nothing landed on disk because the duplicate check runs first.
		expect(existsSync(join(cwd, "src/same.ts"))).toBe(false);
	});

	it("resolves targets relative to the provided cwd", async () => {
		const tmpl = join(templatesDir, "t.ts");
		writeFileSync(tmpl, "// t\n");

		await writeScaffoldSpecs(
			[
				{
					source: pathToFileURL(tmpl),
					target: "nested/deep/file.ts",
					plugin: "db",
				},
			],
			cwd,
		);

		expect(existsSync(join(cwd, "nested/deep/file.ts"))).toBe(true);
	});
});
