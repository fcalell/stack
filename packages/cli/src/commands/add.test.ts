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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StackConfig } from "#config";
import { Init } from "#events";
import type { DiscoveredPlugin } from "#lib/discovery";
import { MissingPluginError } from "#lib/errors";

const generateMock = vi.fn<(configPath: string) => Promise<void>>(
	async () => {},
);
vi.mock("#commands/generate", () => ({
	generate: (...args: [string]) => generateMock(...args),
}));

let mockAvailable: DiscoveredPlugin[] = [];
let mockConfig: StackConfig | null = null;
let mockConfigError: unknown = null;

vi.mock("#lib/discovery", () => ({
	loadAvailablePlugins: vi.fn(async () => mockAvailable),
	dependencyNames: (p: DiscoveredPlugin) =>
		p.cli.depends
			.filter((d) => d.source !== "core")
			.map((d) => d.source)
			.filter((s, i, a) => a.indexOf(s) === i),
}));

vi.mock("#lib/config", () => ({
	loadConfig: vi.fn(async () => {
		if (mockConfigError) throw mockConfigError;
		if (!mockConfig) throw new Error("no mock config");
		return mockConfig;
	}),
}));

function makePlugin(
	name: string,
	opts: {
		implicit?: boolean;
		label?: string;
		register?: DiscoveredPlugin["cli"]["register"];
	} = {},
): DiscoveredPlugin {
	return {
		name,
		cli: {
			name,
			label: opts.label ?? `${name} plugin`,
			implicit: opts.implicit ?? false,
			package: `@fcalell/plugin-${name}`,
			depends: [],
			callbacks: {},
			commands: {},
			register: opts.register ?? (() => {}),
		},
		events: {},
		options: {},
	};
}

const { add } = await import("./add");

const baseConfigSource = `import { defineConfig } from "@fcalell/cli";
import { db } from "@fcalell/plugin-db";

export default defineConfig({
	app: { name: "app", domain: "example.com" },
	plugins: [
		db(),
	],
});
`;

describe("add()", () => {
	let dir: string;
	const originalCwd = process.cwd();

	beforeEach(() => {
		generateMock.mockClear();
		mockAvailable = [];
		mockConfig = null;
		mockConfigError = null;
		dir = mkdtempSync(join(tmpdir(), "stack-add-"));
		writeFileSync(join(dir, "stack.config.ts"), baseConfigSource);
		process.chdir(dir);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		rmSync(dir, { recursive: true, force: true });
	});

	it("throws MissingPluginError for unknown plugin", async () => {
		mockAvailable = [makePlugin("db"), makePlugin("auth")];
		mockConfig = {
			app: { name: "app", domain: "example.com" },
			plugins: [{ __plugin: "db", options: {} }],
			validate: () => ({ valid: true, errors: [] }),
		};

		await expect(add("nonexistent", "stack.config.ts")).rejects.toBeInstanceOf(
			MissingPluginError,
		);
	});

	it("is a no-op when the plugin is already configured", async () => {
		mockAvailable = [makePlugin("db")];
		mockConfig = {
			app: { name: "app", domain: "example.com" },
			plugins: [{ __plugin: "db", options: {} }],
			validate: () => ({ valid: true, errors: [] }),
		};

		await add("db", "stack.config.ts");

		// Generate should NOT be called for a no-op.
		expect(generateMock).not.toHaveBeenCalled();

		// Config is unchanged (only one db() call, no duplicates added).
		const after = readFileSync(join(dir, "stack.config.ts"), "utf-8");
		const dbMatches = after.match(/\bdb\(/g) ?? [];
		expect(dbMatches).toHaveLength(1);
	});

	it("scaffolds plugin files, rewrites config, and regenerates", async () => {
		const templatePath = join(dir, "__tmpl-auth.ts");
		writeFileSync(templatePath, "// auth scaffold\n");

		mockAvailable = [
			makePlugin("db"),
			makePlugin("auth", {
				label: "Auth",
				register: (_ctx, bus) => {
					bus.on(Init.Scaffold, (p) => {
						p.files.push({
							source: pathToFileURL(templatePath),
							target: "src/worker/plugins/auth.ts",
						});
					});
				},
			}),
		];
		mockConfig = {
			app: { name: "app", domain: "example.com" },
			plugins: [{ __plugin: "db", options: {} }],
			validate: () => ({ valid: true, errors: [] }),
		};

		await add("auth", "stack.config.ts");

		// Scaffolded file written
		const scaffoldPath = join(dir, "src/worker/plugins/auth.ts");
		expect(existsSync(scaffoldPath)).toBe(true);
		expect(readFileSync(scaffoldPath, "utf-8")).toContain("auth scaffold");

		// Config updated with auth import AND an auth() call in the plugins array
		const rewritten = readFileSync(join(dir, "stack.config.ts"), "utf-8");
		expect(rewritten).toContain('from "@fcalell/plugin-auth"');
		expect(rewritten).toMatch(/\bauth\(\s*\)/);

		expect(generateMock).toHaveBeenCalledWith("stack.config.ts");
	});

	it("inlines prompt answers into the plugin call", async () => {
		mockAvailable = [
			makePlugin("auth", {
				label: "Auth",
				register: (_ctx, bus) => {
					bus.on(Init.Prompt, (p) => {
						p.configOptions.auth = {
							cookies: { prefix: "myapp" },
							organization: true,
						};
					});
				},
			}),
		];
		mockConfig = {
			app: { name: "app", domain: "example.com" },
			plugins: [],
			validate: () => ({ valid: true, errors: [] }),
		};

		await add("auth", "stack.config.ts");

		const rewritten = readFileSync(join(dir, "stack.config.ts"), "utf-8");
		expect(rewritten).toContain('prefix: "myapp"');
		expect(rewritten).toMatch(/organization:\s*true/);
	});

	it("writes a direct plugin() call when there are no prompt answers", async () => {
		mockAvailable = [makePlugin("api")];
		mockConfig = {
			app: { name: "app", domain: "example.com" },
			plugins: [],
			validate: () => ({ valid: true, errors: [] }),
		};

		await add("api", "stack.config.ts");

		const rewritten = readFileSync(join(dir, "stack.config.ts"), "utf-8");
		expect(rewritten).toMatch(/\bapi\(\s*\)/);
	});

	it("throws MissingPluginError when the plugin has an unmet dependency", async () => {
		// auth depends on db. Config contains only api — dependency check fails.
		const dbEvent = { id: Symbol("db:ready"), source: "db", name: "ready" };
		mockAvailable = [
			{
				...makePlugin("auth", { label: "Auth" }),
				cli: {
					...makePlugin("auth", { label: "Auth" }).cli,
					depends: [dbEvent],
				},
			},
			makePlugin("db"),
			makePlugin("api"),
		];
		mockConfig = {
			app: { name: "app", domain: "example.com" },
			plugins: [{ __plugin: "api", options: {} }],
			validate: () => ({ valid: true, errors: [] }),
		};

		await expect(add("auth", "stack.config.ts")).rejects.toBeInstanceOf(
			MissingPluginError,
		);
	});
});
