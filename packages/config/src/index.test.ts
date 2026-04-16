import { describe, expect, it } from "vitest";
import { defineConfig, getPlugin, type PluginConfig } from "./index";

function fakePlugin<N extends string>(
	name: N,
	opts?: { requires?: string[] },
): PluginConfig<N, { value: string }> {
	return {
		__plugin: name,
		requires: opts?.requires,
		options: { value: name },
	};
}

describe("defineConfig", () => {
	it("returns a StackConfig with validate method", () => {
		const config = defineConfig({ plugins: [fakePlugin("db")] });
		expect(config.plugins).toHaveLength(1);
		expect(config.plugins[0].__plugin).toBe("db");
		expect(typeof config.validate).toBe("function");
	});

	it("preserves domain and dev options", () => {
		const config = defineConfig({
			domain: "example.com",
			plugins: [fakePlugin("app")],
			dev: { studioPort: 4983 },
		});
		expect(config.domain).toBe("example.com");
		expect(config.dev?.studioPort).toBe(4983);
	});

	it("accepts an empty plugins array", () => {
		const config = defineConfig({ plugins: [] });
		expect(config.plugins).toHaveLength(0);
		expect(config.validate().valid).toBe(true);
	});

	describe("dev validation", () => {
		it("throws when dev.studioPort is 0", () => {
			expect(() =>
				defineConfig({ plugins: [], dev: { studioPort: 0 } }),
			).toThrow("dev.studioPort must be a positive integer");
		});

		it("throws when dev.studioPort is negative", () => {
			expect(() =>
				defineConfig({ plugins: [], dev: { studioPort: -1 } }),
			).toThrow("dev.studioPort must be a positive integer");
		});

		it("throws when dev.studioPort is a float", () => {
			expect(() =>
				defineConfig({ plugins: [], dev: { studioPort: 4.5 } }),
			).toThrow("dev.studioPort must be a positive integer");
		});

		it("accepts valid studioPort", () => {
			expect(() =>
				defineConfig({ plugins: [], dev: { studioPort: 4983 } }),
			).not.toThrow();
		});
	});
});

describe("validate", () => {
	it("returns valid for a single plugin with no dependencies", () => {
		const config = defineConfig({ plugins: [fakePlugin("db")] });
		const result = config.validate();
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("returns valid when all dependencies are satisfied", () => {
		const config = defineConfig({
			plugins: [fakePlugin("db"), fakePlugin("auth", { requires: ["db"] })],
		});
		const result = config.validate();
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("reports missing dependency", () => {
		const config = defineConfig({
			plugins: [fakePlugin("auth", { requires: ["db"] })],
		});
		const result = config.validate();
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]?.plugin).toBe("auth");
		expect(result.errors[0]?.message).toContain('Requires "db"');
		expect(result.errors[0]?.fix).toBe("Run: stack add db");
	});

	it("reports multiple missing dependencies", () => {
		const plugin: PluginConfig = {
			__plugin: "complex",
			requires: ["db", "auth"],
			options: {},
		};
		const config = defineConfig({ plugins: [plugin] });
		const result = config.validate();
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(2);
		expect(result.errors[0]?.message).toContain('"db"');
		expect(result.errors[1]?.message).toContain('"auth"');
	});

	it("reports duplicate plugin names", () => {
		const config = defineConfig({
			plugins: [fakePlugin("db"), fakePlugin("db")],
		});
		const result = config.validate();
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]?.message).toContain("Duplicate plugin");
	});

	it("reports both duplicates and missing deps", () => {
		const config = defineConfig({
			plugins: [
				fakePlugin("db"),
				fakePlugin("db"),
				fakePlugin("auth", { requires: ["missing"] }),
			],
		});
		const result = config.validate();
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(2);
	});

	it("does not throw — always returns a result", () => {
		const config = defineConfig({
			plugins: [fakePlugin("auth", { requires: ["db"] })],
		});
		expect(() => config.validate()).not.toThrow();
	});
});

describe("getPlugin", () => {
	it("extracts a plugin by name", () => {
		const config = defineConfig({
			plugins: [fakePlugin("db"), fakePlugin("auth")],
		});
		const db = getPlugin(config, "db");
		expect(db.__plugin).toBe("db");
		expect(db.options).toEqual({ value: "db" });
	});

	it("throws when plugin is not found", () => {
		const config = defineConfig({ plugins: [fakePlugin("db")] });
		expect(() => getPlugin(config, "auth")).toThrow(
			'Plugin "auth" not found in config',
		);
	});

	it("returns the first match when duplicates exist", () => {
		const first: PluginConfig<"db", { id: number }> = {
			__plugin: "db",
			options: { id: 1 },
		};
		const second: PluginConfig<"db", { id: number }> = {
			__plugin: "db",
			options: { id: 2 },
		};
		const config = defineConfig({ plugins: [first, second] });
		expect(getPlugin(config, "db").options.id).toBe(1);
	});
});
