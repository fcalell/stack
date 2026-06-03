import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { attachWatcher } from "#commands/dev";
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

	it("returns no FSWatcher handles when the watch path does not exist", () => {
		const root = mkdtempSync(join(tmpdir(), "stack-dev-watch-"));
		try {
			const handles = attachWatcher({
				spec: {
					name: "missing",
					paths: "does/not/exist",
					handler: vi.fn(),
				},
				cwd: root,
			});
			expect(handles).toEqual([]);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
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

describe("attachWatcher debounce isolation", () => {
	let root: string;
	const cleanup: Array<() => void> = [];

	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "stack-dev-watch-"));
	});
	afterEach(() => {
		for (const fn of cleanup.splice(0)) fn();
		rmSync(root, { recursive: true, force: true });
	});

	// Each watcher must own its debounce state. Two watchers firing within
	// the debounce window of each other should both invoke their handler —
	// the prior implementation captured a single `debounceTimer` in the loop
	// closure, so the second touch cancelled the first watcher's pending fire.
	it("does not drop a sibling watcher's handler when a second watcher fires inside the debounce window", async () => {
		const dirA = join(root, "a");
		const dirB = join(root, "b");
		mkdirSync(dirA, { recursive: true });
		mkdirSync(dirB, { recursive: true });

		const handlerA = vi.fn(async () => {});
		const handlerB = vi.fn(async () => {});

		const debounce = 80;
		const handles = [
			...attachWatcher({
				spec: { name: "watch-a", paths: "a", handler: handlerA, debounce },
				cwd: root,
			}),
			...attachWatcher({
				spec: { name: "watch-b", paths: "b", handler: handlerB, debounce },
				cwd: root,
			}),
		];
		cleanup.push(() => {
			for (const h of handles) {
				try {
					h.close();
				} catch {}
			}
		});
		expect(handles).toHaveLength(2);

		// Touch A, then ~20ms later touch B — well inside the 80ms debounce.
		// If the timer were shared, A's handler would be cancelled by B's
		// touch and only B would fire.
		writeFileSync(join(dirA, "file.txt"), "1");
		await new Promise((r) => setTimeout(r, 20));
		writeFileSync(join(dirB, "file.txt"), "1");

		// Wait for both debounces to settle.
		await new Promise((r) => setTimeout(r, debounce + 200));

		expect(handlerA).toHaveBeenCalledTimes(1);
		expect(handlerB).toHaveBeenCalledTimes(1);
	});

	it("coalesces a burst of events on a single watcher into one handler call", async () => {
		const dir = join(root, "burst");
		mkdirSync(dir, { recursive: true });
		const handler = vi.fn(async () => {});
		const debounce = 60;
		const handles = attachWatcher({
			spec: { name: "burst", paths: "burst", handler, debounce },
			cwd: root,
		});
		cleanup.push(() => {
			for (const h of handles) {
				try {
					h.close();
				} catch {}
			}
		});

		// Three writes inside the debounce window — should produce a single
		// handler invocation after the burst settles.
		writeFileSync(join(dir, "a.txt"), "1");
		await new Promise((r) => setTimeout(r, 10));
		writeFileSync(join(dir, "b.txt"), "1");
		await new Promise((r) => setTimeout(r, 10));
		writeFileSync(join(dir, "c.txt"), "1");

		await new Promise((r) => setTimeout(r, debounce + 200));

		expect(handler).toHaveBeenCalledTimes(1);
	});

	it("respects the `ignore` filter and never fires the handler for a matching path", async () => {
		const dir = join(root, "ignored");
		mkdirSync(dir, { recursive: true });
		const handler = vi.fn(async () => {});
		const debounce = 50;
		const handles = attachWatcher({
			spec: {
				name: "ignored",
				paths: "ignored",
				ignore: ["skip-me"],
				handler,
				debounce,
			},
			cwd: root,
		});
		cleanup.push(() => {
			for (const h of handles) {
				try {
					h.close();
				} catch {}
			}
		});

		writeFileSync(join(dir, "skip-me.txt"), "1");
		await new Promise((r) => setTimeout(r, debounce + 150));

		expect(handler).not.toHaveBeenCalled();
	});
});
