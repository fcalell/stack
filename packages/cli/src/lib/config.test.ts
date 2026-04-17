import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "./config";
import { ConfigLoadError } from "./errors";

describe("loadConfig", () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "stack-config-"));
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it("throws ConfigLoadError for a nonexistent config file", async () => {
		const missing = join(dir, "does-not-exist.ts");
		await expect(loadConfig(missing)).rejects.toBeInstanceOf(ConfigLoadError);
	});

	it("throws ConfigLoadError when the module has no default export", async () => {
		const path = join(dir, "no-default.mjs");
		writeFileSync(path, "export const foo = 1;\n");
		await expect(loadConfig(path)).rejects.toBeInstanceOf(ConfigLoadError);
	});

	it("throws ConfigLoadError when the default export is not a StackConfig", async () => {
		const path = join(dir, "invalid.mjs");
		writeFileSync(path, "export default { foo: 'bar' };\n");
		await expect(loadConfig(path)).rejects.toBeInstanceOf(ConfigLoadError);
	});

	it("throws ConfigLoadError with CONFIG_LOAD code for invalid config", async () => {
		const path = join(dir, "invalid2.mjs");
		writeFileSync(path, "export default 42;\n");
		await expect(loadConfig(path)).rejects.toMatchObject({
			code: "CONFIG_LOAD",
			name: "ConfigLoadError",
		});
	});

	it("returns the config when the default export is a valid StackConfig", async () => {
		const path = join(dir, "valid.mjs");
		writeFileSync(
			path,
			`export default {
				plugins: [],
				validate() { return { valid: true, errors: [] }; },
			};\n`,
		);
		const config = await loadConfig(path);
		expect(config.plugins).toEqual([]);
		expect(config.validate()).toEqual({ valid: true, errors: [] });
	});
});
