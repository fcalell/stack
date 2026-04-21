import { describe, expect, it } from "vitest";
import { aggregateViteConfig } from "./codegen";

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
		});

		expect(result).toContain('import { defineConfig } from "vite"');
		expect(result).toContain('import tailwindcss from "@tailwindcss/vite"');
		expect(result).toContain("export default defineConfig(");
		expect(result).toContain("plugins: [tailwindcss()");
		expect(result).toContain("port: 3000");
	});

	it("includes resolve.alias when aliases are provided", () => {
		const result = aggregateViteConfig({
			imports: [],
			pluginCalls: [],
			resolveAliases: [{ find: "@", replacement: "./src" }],
			devServerPort: 0,
		});

		expect(result).toContain("resolve: {");
		expect(result).toContain('"@": "./src"');
	});
});
