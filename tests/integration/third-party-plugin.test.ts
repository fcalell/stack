import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, plugin } from "@fcalell/cli";
import { buildTestGraph } from "@fcalell/cli/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Third-party plugins built via `plugin()` with an explicit `package` option
// compose with first-party plugins through the same build-graph path.

const THIRD_PARTY_PACKAGE = "@acme/stack-plugin-widget";

describe("Third-party plugin discovery", () => {
	let cwd: string;

	beforeEach(() => {
		cwd = mkdtempSync(join(tmpdir(), "stack-third-party-"));
	});

	afterEach(() => {
		rmSync(cwd, { recursive: true, force: true });
	});

	it("discovers a plugin published under an arbitrary npm namespace", async () => {
		// Build a real plugin() factory — the same shape a third-party package
		// would export — and register a module mock so discovery's dynamic
		// import resolves it.
		const widget = plugin<"widget", { color?: string }>("widget", {
			label: "Widget",
			package: THIRD_PARTY_PACKAGE,
			contributes: [],
		});

		vi.doMock(THIRD_PARTY_PACKAGE, () => ({ widget }));

		const config = defineConfig({
			app: { name: "app", domain: "example.com" },
			plugins: [widget({ color: "red" })],
		});

		const { collected } = await buildTestGraph({ config, cwd });

		expect(collected).toHaveLength(1);
		const first = collected[0];
		expect(first?.discovered.name).toBe("widget");
		expect(first?.discovered.cli.package).toBe(THIRD_PARTY_PACKAGE);
		expect(first?.discovered.options).toEqual({ color: "red" });

		vi.doUnmock(THIRD_PARTY_PACKAGE);
	});

	it("third-party plugin composes with first-party plugins through the real pipeline", async () => {
		const widget = plugin<"widget", Record<string, never>>("widget", {
			label: "Widget",
			package: THIRD_PARTY_PACKAGE,
			contributes: [],
		});

		vi.doMock(THIRD_PARTY_PACKAGE, () => ({ widget }));

		const { api } = await import("@fcalell/plugin-api");

		const config = defineConfig({
			app: { name: "app", domain: "example.com" },
			plugins: [api(), widget()],
		});

		const { collected } = await buildTestGraph({ config, cwd });
		const names = collected.map((c) => c.discovered.name);
		expect(names).toContain("api");
		expect(names).toContain("widget");

		vi.doUnmock(THIRD_PARTY_PACKAGE);
	});

	it("third-party plugin can contribute to first-party slots", async () => {
		const { cloudflare } = await import("@fcalell/plugin-cloudflare");

		const widget = plugin<"widget", Record<string, never>>("widget", {
			label: "Widget",
			package: THIRD_PARTY_PACKAGE,
			requires: ["cloudflare"],
			contributes: [
				cloudflare.slots.secrets.contribute(() => [
					{ name: "WIDGET_KEY", devDefault: "dev-widget-key" },
				]),
			],
		});

		vi.doMock(THIRD_PARTY_PACKAGE, () => ({ widget }));

		const config = defineConfig({
			app: { name: "app", domain: "example.com" },
			plugins: [cloudflare(), widget()],
		});

		const { graph } = await buildTestGraph({ config, cwd });
		const secrets = await graph.resolve(cloudflare.slots.secrets);
		expect(secrets.map((s) => s.name)).toContain("WIDGET_KEY");

		vi.doUnmock(THIRD_PARTY_PACKAGE);
	});
});
