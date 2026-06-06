import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EditConfigError, removePluginCall } from "#lib/config-writer";

const baseConfig = `import { defineConfig } from "@fcalell/cli";
import { db } from "@fcalell/plugin-db";
import { solidUi } from "@fcalell/plugin-solid-ui";

export default defineConfig({
	domain: "example.com",
	plugins: [
		db(),
		solidUi(),
	],
});
`;

describe("removePluginCall", () => {
	let dir: string;
	let configPath: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "stack-config-writer-"));
		configPath = join(dir, "stack.config.ts");
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it("removes a kebab-case plugin matched via its camelCase callee", async () => {
		writeFileSync(configPath, baseConfig);

		await removePluginCall(configPath, "solid-ui");

		const result = readFileSync(configPath, "utf-8");
		expect(result).not.toMatch(/solidUi\(/);
		// Other plugins stay in place
		expect(result).toMatch(/db\(\)/);
	});

	it("removes a plain plugin call", async () => {
		writeFileSync(configPath, baseConfig);

		await removePluginCall(configPath, "db");

		const result = readFileSync(configPath, "utf-8");
		expect(result).not.toMatch(/\bdb\(\)/);
		expect(result).toMatch(/solidUi\(\)/);
	});

	it("is a no-op when the plugin is not present", async () => {
		writeFileSync(configPath, baseConfig);

		await removePluginCall(configPath, "auth");

		const after = readFileSync(configPath, "utf-8");
		// The config still mentions the originals.
		expect(after).toMatch(/db\(\)/);
		expect(after).toMatch(/solidUi\(\)/);
	});

	it("throws EditConfigError on malformed config (non-defineConfig default export)", async () => {
		const source = `const config = defineConfig({ plugins: [db()] });
export default config;
`;
		writeFileSync(configPath, source);

		await expect(removePluginCall(configPath, "db")).rejects.toBeInstanceOf(
			EditConfigError,
		);
	});
});
