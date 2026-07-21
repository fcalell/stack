import { describe, expect, it } from "vitest";
import { aggregateViteConfig } from "./codegen.ts";

describe("aggregateViteConfig", () => {
	it("emits defineConfig import + plugins array + server port", () => {
		const result = aggregateViteConfig({
			imports: [{ source: "@tailwindcss/vite", default: "tailwindcss" }],
			pluginCalls: [
				{
					kind: "call",
					callee: { kind: "identifier", name: "tailwindcss" },
					args: [],
				},
			],
			resolveAliases: [],
			devServerPort: 3000,
			serverProxy: [],
			fsAllow: [],
			resolveDedupe: [],
		});

		expect(result).toContain('import { defineConfig } from "vite";');
		expect(result).toContain('import tailwindcss from "@tailwindcss/vite";');
		expect(result).toContain("export default defineConfig(");
		// Call expression with no args (`tailwindcss()`) lands in the array
		// alongside framework-preset providersPlugin calls added elsewhere.
		expect(result).toMatch(/plugins:\s*\[[^\]]*tailwindcss\(\)/);
		// Dev server port must be set on the `server` block, not the root.
		expect(result).toMatch(/server:\s*\{[^}]*port:\s*3000/);
	});

	it("includes resolve.alias when aliases are provided", () => {
		const result = aggregateViteConfig({
			imports: [],
			pluginCalls: [],
			resolveAliases: [{ find: "@", replacement: "./src" }],
			devServerPort: 0,
			serverProxy: [],
			fsAllow: [],
			resolveDedupe: [],
		});

		// Alias must land inside the `resolve.alias` object, not as a bare
		// key/value somewhere else in the config.
		expect(result).toMatch(
			/resolve:\s*\{[^}]*alias:\s*\{[^}]*"@":\s*"\.\/src"/,
		);
	});

	it("renders server.fs.allow with the workspace-root base when entries exist", () => {
		const result = aggregateViteConfig({
			imports: [],
			pluginCalls: [],
			resolveAliases: [],
			resolveDedupe: [],
			devServerPort: 3000,
			serverProxy: [],
			fsAllow: [{ kind: "string", value: "/linked/pkg" }],
		});

		expect(result).toContain(
			'import { defineConfig, searchForWorkspaceRoot } from "vite";',
		);
		// A custom allow list disables Vite's workspace auto-detection, so the
		// consumer's own root must be the first entry ahead of contributions.
		expect(result).toMatch(
			/fs:\s*\{[^}]*allow:\s*\[\s*searchForWorkspaceRoot\(process\.cwd\(\)\),\s*"\/linked\/pkg"/,
		);
	});

	it("omits server.fs and the searchForWorkspaceRoot import without entries", () => {
		const result = aggregateViteConfig({
			imports: [],
			pluginCalls: [],
			resolveAliases: [],
			devServerPort: 3000,
			serverProxy: [],
			fsAllow: [],
			resolveDedupe: [],
		});

		expect(result).not.toContain("searchForWorkspaceRoot");
		expect(result).not.toContain("fs:");
	});
});
