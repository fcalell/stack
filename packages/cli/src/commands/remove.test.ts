import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StackConfig } from "#config";
import { Remove } from "#events";
import type { DiscoveredPlugin } from "#lib/discovery";
import { MissingPluginError, StackError } from "#lib/errors";
import { defineEvent } from "#lib/event-bus";

// Stub generate — remove() calls it after rewriting the config, but for these
// tests we care only about the rewrite and the Remove event emission.
const generateMock = vi.fn<(configPath: string) => Promise<void>>(
	async () => {},
);
vi.mock("#commands/generate", () => ({
	generate: (...args: [string]) => generateMock(...args),
}));

let mockConfig: StackConfig = {
	app: { name: "app", domain: "example.com" },
	plugins: [],
	validate: () => ({ valid: true, errors: [] }),
};
let mockDiscovered: DiscoveredPlugin[] = [];
vi.mock("#lib/config", () => ({
	loadConfig: vi.fn(async () => mockConfig),
}));
vi.mock("#lib/discovery", () => ({
	discoverPlugins: vi.fn(async () => mockDiscovered),
}));

function makePlugin(
	name: string,
	opts: {
		dependsOn?: string[];
		register?: DiscoveredPlugin["cli"]["register"];
	} = {},
): DiscoveredPlugin {
	return {
		name,
		cli: {
			name,
			label: `${name} plugin`,
			package: `@fcalell/plugin-${name}`,
			after: (opts.dependsOn ?? []).map((dep) =>
				defineEvent<void>(dep, `${dep}.ready`),
			),
			callbacks: {},
			commands: {},
			register: opts.register ?? (() => {}),
		},
		events: {},
		options: {},
	};
}

const { remove } = await import("./remove");

const baseConfigSource = `import { defineConfig } from "@fcalell/cli";
import { db } from "@fcalell/plugin-db";
import { solidUi } from "@fcalell/plugin-solid-ui";

export default defineConfig({
	app: { name: "app", domain: "example.com" },
	plugins: [
		db(),
		solidUi(),
	],
});
`;

describe("remove()", () => {
	let dir: string;
	const originalCwd = process.cwd();

	beforeEach(() => {
		generateMock.mockClear();
		mockConfig = {
			app: { name: "app", domain: "example.com" },
			plugins: [],
			validate: () => ({ valid: true, errors: [] }),
		};
		mockDiscovered = [];
		dir = mkdtempSync(join(tmpdir(), "stack-remove-"));
		writeFileSync(join(dir, "stack.config.ts"), baseConfigSource);
		process.chdir(dir);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		rmSync(dir, { recursive: true, force: true });
	});

	it("throws MissingPluginError when the plugin is not in config", async () => {
		mockConfig = {
			app: { name: "app", domain: "example.com" },
			plugins: [{ __plugin: "db", options: {} }],
			validate: () => ({ valid: true, errors: [] }),
		};
		mockDiscovered = [makePlugin("db")];

		await expect(remove("auth", "stack.config.ts")).rejects.toBeInstanceOf(
			MissingPluginError,
		);
	});

	it("throws StackError with PLUGIN_HAS_DEPENDENTS when other plugins depend on it", async () => {
		mockConfig = {
			app: { name: "app", domain: "example.com" },
			plugins: [
				{ __plugin: "db", options: {} },
				{ __plugin: "auth", options: {} },
			],
			validate: () => ({ valid: true, errors: [] }),
		};
		mockDiscovered = [
			makePlugin("db"),
			makePlugin("auth", { dependsOn: ["db"] }),
		];

		let caught: unknown;
		try {
			await remove("db", "stack.config.ts");
		} catch (err) {
			caught = err;
		}

		expect(caught).toBeInstanceOf(StackError);
		if (caught instanceof StackError) {
			expect(caught.code).toBe("PLUGIN_HAS_DEPENDENTS");
			expect(caught.message).toContain("auth");
		}
	});

	it("emits the Remove event and rewrites stack.config.ts without the plugin", async () => {
		const removedFiles: string[] = [];

		mockConfig = {
			app: { name: "app", domain: "example.com" },
			plugins: [
				{ __plugin: "db", options: {} },
				{ __plugin: "solid-ui", options: {} },
			],
			validate: () => ({ valid: true, errors: [] }),
		};
		mockDiscovered = [
			makePlugin("db", {
				register: (_ctx, bus) => {
					bus.on(Remove, (p) => {
						p.files.push("src/schema/");
						p.dependencies.push("@fcalell/plugin-db");
						removedFiles.push(...p.files);
					});
				},
			}),
			makePlugin("solid-ui"),
		];

		await remove("db", "stack.config.ts");

		const rewritten = readFileSync(join(dir, "stack.config.ts"), "utf-8");
		expect(rewritten).not.toMatch(/\bdb\(\)/);
		expect(rewritten).toMatch(/solidUi\(\)/);
		expect(generateMock).toHaveBeenCalledWith("stack.config.ts");
		// Prove the Remove event actually fired on the plugin's handler.
		expect(removedFiles).toContain("src/schema/");
	});
});
