import { describe, expect, it } from "vitest";
import { plugin } from "#config";
import { cliSlots } from "#lib/cli-slots";
import type { DevReadyTask, ProcessSpec, WatcherSpec } from "#specs";
import { buildTestGraphFromPlugins } from "#testing";

describe("dev slot resolution", () => {
	it("aggregates processes, watchers, and ready setup across plugins", async () => {
		const apiLike = plugin("dev-api", {
			label: "API",
			contributes: [
				cliSlots.devProcesses.contribute(
					(): ProcessSpec => ({
						name: "wrangler",
						command: "npx",
						args: ["wrangler", "dev"],
						readyPattern: /Ready on/,
					}),
				),
				cliSlots.devWatchers.contribute(
					(): WatcherSpec => ({
						name: "routes",
						paths: "src/worker/routes/**",
						handler: async () => {},
					}),
				),
			],
		});
		const dbLike = plugin("dev-db", {
			label: "DB",
			contributes: [
				cliSlots.devReadySetup.contribute(
					(): DevReadyTask => ({
						name: "schema push",
						run: async () => {},
					}),
				),
			],
		});

		const { graph } = buildTestGraphFromPlugins({
			plugins: [{ factory: apiLike }, { factory: dbLike }],
		});

		const [procs, watchers, ready] = await Promise.all([
			graph.resolve(cliSlots.devProcesses),
			graph.resolve(cliSlots.devWatchers),
			graph.resolve(cliSlots.devReadySetup),
		]);

		expect(procs.map((p) => p.name)).toEqual(["wrangler"]);
		expect(procs[0]?.readyPattern?.test("Ready on 8787")).toBe(true);
		expect(watchers.map((w) => w.name)).toEqual(["routes"]);
		expect(ready.map((r) => r.name)).toEqual(["schema push"]);
	});

	it("is order-independent: reordering plugins produces the same result", async () => {
		const a = plugin("dev-ord-a", {
			label: "A",
			contributes: [
				cliSlots.devProcesses.contribute(
					(): ProcessSpec => ({ name: "a", command: "a", args: [] }),
				),
			],
		});
		const b = plugin("dev-ord-b", {
			label: "B",
			contributes: [
				cliSlots.devProcesses.contribute(
					(): ProcessSpec => ({ name: "b", command: "b", args: [] }),
				),
			],
		});
		const first = buildTestGraphFromPlugins({
			plugins: [{ factory: a }, { factory: b }],
		});
		const second = buildTestGraphFromPlugins({
			plugins: [{ factory: b }, { factory: a }],
		});
		const firstP = await first.graph.resolve(cliSlots.devProcesses);
		const secondP = await second.graph.resolve(cliSlots.devProcesses);
		expect(new Set(firstP.map((p) => p.name))).toEqual(
			new Set(secondP.map((p) => p.name)),
		);
	});
});
