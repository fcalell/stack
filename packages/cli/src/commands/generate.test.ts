import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { plugin } from "#config";
import { cliSlots } from "#lib/cli-slots";
import { ConfigLoadError, ConfigValidationError } from "#lib/errors";
import type { GeneratedFile } from "#specs";
import { buildTestGraphFromPlugins } from "#testing";
import { generate } from "./generate";

// A command-level test: build a graph from inline plugin factories,
// resolve `cliSlots.artifactFiles`, and assert the result. Mirrors what
// `generateFromConfig` does internally, without the `discoverPlugins`
// dynamic-import.
describe("artifactFiles + postWrite resolution (the generate path)", () => {
	it("concats artifact contributions from every plugin", async () => {
		const fakeA = plugin("fake-a", {
			label: "A",
			contributes: [
				cliSlots.artifactFiles.contribute(
					(): GeneratedFile => ({ path: ".stack/a.txt", content: "a" }),
				),
			],
		});
		const fakeB = plugin("fake-b", {
			label: "B",
			contributes: [
				cliSlots.artifactFiles.contribute(
					(): GeneratedFile => ({ path: ".stack/b.txt", content: "b" }),
				),
			],
		});

		const { graph } = buildTestGraphFromPlugins({
			plugins: [{ factory: fakeA }, { factory: fakeB }],
		});
		const files = await graph.resolve(cliSlots.artifactFiles);
		expect(files).toHaveLength(2);
		expect(files.map((f) => f.path).sort()).toEqual([
			".stack/a.txt",
			".stack/b.txt",
		]);
	});

	it("collects postWrite hooks in resolution order", async () => {
		const calls: string[] = [];
		const fake = plugin("fake-pw", {
			label: "PW",
			contributes: [
				cliSlots.postWrite.contribute(() => async () => {
					calls.push("one");
				}),
				cliSlots.postWrite.contribute(() => async () => {
					calls.push("two");
				}),
			],
		});
		const { graph } = buildTestGraphFromPlugins({
			plugins: [{ factory: fake }],
		});
		const hooks = await graph.resolve(cliSlots.postWrite);
		for (const h of hooks) await h();
		expect(calls).toEqual(["one", "two"]);
	});

	it("resolves identically regardless of plugin order", async () => {
		const fakeA = plugin("fake-ord-a", {
			label: "A",
			contributes: [
				cliSlots.artifactFiles.contribute(() => ({
					path: "a",
					content: "a",
				})),
			],
		});
		const fakeB = plugin("fake-ord-b", {
			label: "B",
			contributes: [
				cliSlots.artifactFiles.contribute(() => ({
					path: "b",
					content: "b",
				})),
			],
		});

		const first = buildTestGraphFromPlugins({
			plugins: [{ factory: fakeA }, { factory: fakeB }],
		});
		const second = buildTestGraphFromPlugins({
			plugins: [{ factory: fakeB }, { factory: fakeA }],
		});

		const aFiles = await first.graph.resolve(cliSlots.artifactFiles);
		const bFiles = await second.graph.resolve(cliSlots.artifactFiles);

		expect(new Set(aFiles.map((f) => f.path))).toEqual(
			new Set(bFiles.map((f) => f.path)),
		);
	});
});

describe("generate() — error paths", () => {
	let dir: string;
	const originalCwd = process.cwd();

	afterEach(() => {
		process.chdir(originalCwd);
		if (dir) rmSync(dir, { recursive: true, force: true });
	});

	it("throws ConfigLoadError when the config file is missing", async () => {
		dir = mkdtempSync(join(tmpdir(), "stack-gen-missing-"));
		process.chdir(dir);
		await expect(generate("stack.config.mjs")).rejects.toBeInstanceOf(
			ConfigLoadError,
		);
	});

	it("throws ConfigValidationError for a duplicate-plugin config", async () => {
		dir = mkdtempSync(join(tmpdir(), "stack-gen-dup-"));
		const configPath = join(dir, "stack.config.mjs");
		writeFileSync(
			configPath,
			`export default {
				plugins: [
					{ __plugin: "db", options: {} },
					{ __plugin: "db", options: {} },
				],
				validate() {
					return {
						valid: false,
						errors: [
							{
								plugin: "db",
								message: 'Duplicate plugin: "db" appears more than once.',
							},
						],
					};
				},
			};
`,
		);
		process.chdir(dir);

		let caught: unknown;
		try {
			await generate(configPath);
		} catch (err) {
			caught = err;
		}

		expect(caught).toBeInstanceOf(ConfigValidationError);
		if (caught instanceof ConfigValidationError) {
			expect(caught.errors).toHaveLength(1);
			expect(caught.errors[0]?.message).toContain("Duplicate");
			expect(caught.code).toBe("CONFIG_VALIDATION");
		}
	});
});
