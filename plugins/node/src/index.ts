import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ContributionCtx } from "@fcalell/cli";
import { plugin, slot } from "@fcalell/cli";
import { cliSlots, emitArtifact } from "@fcalell/cli/cli-slots";
import { api } from "@fcalell/plugin-api";
import { vite } from "@fcalell/plugin-vite";
import { generateServiceBarrel, hasServiceFiles } from "./node/barrel";
import { aggregateServer } from "./node/codegen";
import {
	type NodeOptions,
	nodeOptionsSchema,
	type ServiceEntry,
} from "./types";

const SOURCE = "node";

// Resolved server port. Defaults to 8788; overrideable via options.port.
const serverPort = slot.value<number, NodeOptions>({
	source: SOURCE,
	name: "serverPort",
	seed: (ctx) => ctx.options.port ?? 8788,
});

// Codegen entries for the generated server's `services` array. The consumer
// barrel lands here as one entry; other plugins can contribute their own
// background services the same way.
const services = slot.list<ServiceEntry>({
	source: SOURCE,
	name: "services",
	sortBy: (a, b) => a.name.localeCompare(b.name),
	uniqueBy: (e) => e.name,
});

// Whether the consumer has service modules under `src/server/services`.
// Mirrors api's routesHandler: the seed is the single source of truth the
// barrel emission and the barrel import both resolve, so they can never
// disagree about whether the directory participates.
const consumerServices = slot.value<{ identifier: string } | null>({
	source: SOURCE,
	name: "consumerServices",
	seed: (ctx) => (hasServiceFiles(ctx.cwd) ? { identifier: "services" } : null),
});

// The rendered `src/server/services/index.ts` barrel; null skips emission
// (no header-only stub in service-less consumer trees).
const serviceBarrelSource = slot.derived({
	source: SOURCE,
	name: "serviceBarrelSource",
	compute: (_inp, ctx): string | null => {
		if (!hasServiceFiles(ctx.cwd)) return null;
		return generateServiceBarrel(ctx.cwd);
	},
});

// The rendered `.stack/server.ts` source. Null when there is nothing to
// serve or run: no worker (api emitted none) and no services.
const serverSource = slot.derived({
	source: SOURCE,
	name: "serverSource",
	inputs: {
		port: serverPort,
		entries: services,
		worker: api.slots.workerSource,
		prefixes: api.slots.routePrefixes,
	},
	compute: (inp): string | null => {
		const hasWorker = inp.worker !== null;
		if (!hasWorker && inp.entries.length === 0) return null;
		return aggregateServer({
			port: inp.port,
			hasWorker,
			workerPaths: inp.prefixes,
			services: inp.entries,
		});
	},
});

export const node = plugin("node", {
	label: "Node server",

	schema: nodeOptionsSchema,

	requires: ["api"],

	dependencies: {
		"@fcalell/plugin-node": "workspace:*",
	},

	slots: {
		serverPort,
		services,
		consumerServices,
		serviceBarrelSource,
		serverSource,
	},

	contributes: (self) => [
		// Consumer services barrel → one services entry. Resolves the
		// consumerServices seed so import + barrel emission stay wired (or
		// not) together.
		self.slots.services.contribute(async (ctx) => {
			const consumer = await ctx.resolve(self.slots.consumerServices);
			if (!consumer) return undefined;
			return {
				name: "consumer",
				imports: [
					{
						source: "../src/server/services",
						named: [consumer.identifier],
					},
				],
				expression: { kind: "identifier", name: consumer.identifier },
			} as ServiceEntry;
		}),

		emitArtifact(".stack/server.ts", self.slots.serverSource),
		emitArtifact(
			"src/server/services/index.ts",
			self.slots.serviceBarrelSource,
		),

		// Dev process: run the generated server directly under the consumer's
		// node (type stripping; no build step). STACK_DEV=1 mirrors wrangler's
		// .dev.vars signal so the worker runtime enters dev mode.
		cliSlots.devProcesses.contribute(async (ctx) => {
			if ((await ctx.resolve(self.slots.serverSource)) === null) {
				return undefined;
			}
			const port = await ctx.resolve(self.slots.serverPort);
			return {
				name: "node",
				command: "node",
				args: ["--watch", ".stack/server.ts"],
				defaultPort: port,
				readyPattern: /listening on/i,
				color: "green",
				env: { STACK_DEV: "1" },
			};
		}),

		// Same-origin dev: the vite dev server proxies worker-owned paths to
		// this server, so API clients keep their relative URLs in dev exactly
		// like prod (where this server serves the SPA itself). Inert without
		// vite in the config.
		vite.slots.serverProxy.contribute(async (ctx) => {
			const port = await ctx.resolve(self.slots.serverPort);
			const prefixes = await ctx.resolve(api.slots.routePrefixes);
			const target = `http://localhost:${port}`;
			return [
				...prefixes.map((path) => ({ path, target })),
				{ path: "/ws", target, ws: true },
			];
		}),

		// Services barrel watcher — regenerates when service files appear or
		// disappear (api's route watcher pattern).
		cliSlots.devWatchers.contribute((ctx: ContributionCtx) => ({
			name: "services",
			paths: "src/server/services/**",
			ignore: ["**/index.ts"],
			debounce: 300,
			async handler(_path: string, type: "add" | "unlink" | "change") {
				if (type === "add" || type === "unlink") {
					const barrelContent = generateServiceBarrel(ctx.cwd);
					writeFileSync(
						join(ctx.cwd, "src/server/services/index.ts"),
						barrelContent,
					);
					ctx.log.info("Service barrel regenerated");
				}
			},
		})),

		// Remove: clean the services directory on `stack remove node`.
		cliSlots.removeFiles.contribute(() => "src/server/"),
	],
});

export type { NodeOptions, ServiceEntry } from "./types";
