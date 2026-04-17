import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ConfigLoadError, ConfigValidationError } from "#lib/errors";
import { generate } from "./generate";

describe("generate() error modes", () => {
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
