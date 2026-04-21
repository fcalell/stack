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
import { Init } from "#events";
import type { DiscoveredPlugin } from "#lib/discovery";
import { MissingPluginError } from "#lib/errors";

// Stub generate — init() calls it at the end. We just want to verify the flag
// path scaffolds and writes the config correctly.
const generateMock = vi.fn<(configPath: string) => Promise<void>>(
	async () => {},
);
vi.mock("#commands/generate", () => ({
	generate: (...args: [string]) => generateMock(...args),
}));

let mockAvailable: DiscoveredPlugin[] = [];
vi.mock("#lib/discovery", () => ({
	loadAvailablePlugins: vi.fn(async () => mockAvailable),
	dependencyNames: (p: DiscoveredPlugin) =>
		p.cli.after
			.filter((d) => d.source !== "core")
			.map((d) => d.source)
			.filter((s, i, a) => a.indexOf(s) === i),
}));

function makePlugin(
	name: string,
	opts: {
		register?: DiscoveredPlugin["cli"]["register"];
	} = {},
): DiscoveredPlugin {
	return {
		name,
		cli: {
			name,
			label: `${name} plugin`,
			package: `@fcalell/plugin-${name}`,
			after: [],
			callbacks: {},
			commands: {},
			register: opts.register ?? (() => {}),
		},
		events: {},
		options: {},
	};
}

const { init } = await import("./init");

describe("init() with --plugins flag", () => {
	let dir: string;
	const originalCwd = process.cwd();

	beforeEach(() => {
		generateMock.mockClear();
		mockAvailable = [];
		dir = mkdtempSync(join(tmpdir(), "stack-init-"));
	});

	afterEach(() => {
		process.chdir(originalCwd);
		rmSync(dir, { recursive: true, force: true });
	});

	it("scaffolds base files and stack.config.ts with the selected plugins", async () => {
		mockAvailable = [makePlugin("db"), makePlugin("api")];

		await init(dir, { plugins: ["db", "api"], domain: "example.com" });

		expect(existsSync(join(dir, "package.json"))).toBe(true);
		expect(existsSync(join(dir, "tsconfig.json"))).toBe(true);
		expect(existsSync(join(dir, "biome.json"))).toBe(true);
		expect(existsSync(join(dir, ".gitignore"))).toBe(true);
		expect(existsSync(join(dir, "stack.config.ts"))).toBe(true);

		const config = readFileSync(join(dir, "stack.config.ts"), "utf-8");
		expect(config).toContain('from "@fcalell/plugin-db"');
		expect(config).toContain('from "@fcalell/plugin-api"');
		expect(config).toContain('domain: "example.com"');

		expect(generateMock).toHaveBeenCalledWith("stack.config.ts");
	});

	it("throws MissingPluginError when --plugins contains an unknown name", async () => {
		mockAvailable = [makePlugin("db")];

		await expect(
			init(dir, { plugins: ["nonexistent"], domain: "example.com" }),
		).rejects.toBeInstanceOf(MissingPluginError);
	});

	it("scaffolds plugin-contributed files from Init.Scaffold", async () => {
		// Write the template that the plugin registers, then point the spec at it.
		const templatePath = join(dir, "__tmpl-schema.ts");
		writeFileSync(templatePath, "// schema entry\n");

		mockAvailable = [
			makePlugin("db", {
				register: (_ctx, bus) => {
					bus.on(Init.Scaffold, (p) => {
						p.files.push({
							source: pathToFileURL(templatePath),
							target: "src/schema/index.ts",
							plugin: "db",
						});
					});
				},
			}),
		];

		await init(dir, { plugins: ["db"], domain: "app.example.com" });

		const schema = readFileSync(join(dir, "src/schema/index.ts"), "utf-8");
		expect(schema).toContain("schema entry");
	});
});
