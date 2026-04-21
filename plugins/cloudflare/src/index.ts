import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { log } from "@clack/prompts";
import { createPlugin, type } from "@fcalell/cli";
import { Generate } from "@fcalell/cli/events";
import { aggregateDevVars, aggregateWrangler } from "./node/codegen";
import { type CodegenWranglerPayload, cloudflareOptionsSchema } from "./types";

export const cloudflare = createPlugin("cloudflare", {
	label: "Cloudflare",
	events: {
		Wrangler: type<CodegenWranglerPayload>(),
	},

	schema: cloudflareOptionsSchema,

	register(ctx, bus, events) {
		bus.on(Generate, async (p) => {
			const wranglerPayload = await bus.emit(events.Wrangler, {
				bindings: [],
				routes: [],
				vars: {},
				secrets: [],
				compatibilityDate: new Date().toISOString().split("T")[0] ?? "",
			});

			const consumerWranglerPath = join(ctx.cwd, "wrangler.toml");
			const consumerWrangler = existsSync(consumerWranglerPath)
				? readFileSync(consumerWranglerPath, "utf-8")
				: null;

			p.files.push({
				path: ".stack/wrangler.toml",
				content: aggregateWrangler({
					consumerWrangler,
					payload: wranglerPayload,
					name: ctx.app.name,
				}),
			});

			const devVars = aggregateDevVars(wranglerPayload.secrets);
			if (devVars && !existsSync(join(ctx.cwd, ".dev.vars"))) {
				p.files.push({ path: ".dev.vars", content: devVars });
			}

			// Queue `wrangler types` to run after the CLI writes .stack/wrangler.toml.
			// Failures are non-fatal: dev/build still runs with a stale env typing.
			p.postWrite.push(async () => {
				const result = spawnSync(
					"npx",
					[
						"wrangler",
						"types",
						".stack/worker-configuration.d.ts",
						"-c",
						".stack/wrangler.toml",
					],
					{ cwd: ctx.cwd, stdio: "pipe" },
				);
				if (result.status !== 0) {
					const stderr = result.stderr?.toString().trim() ?? "";
					log.warn(
						`wrangler types failed (Env typings may be stale)${stderr ? `: ${stderr}` : ""}`,
					);
				}
			});
		});
	},
});

export type {
	CloudflareOptions,
	CodegenWranglerPayload,
	WranglerBindingSpec,
	WranglerRouteSpec,
} from "./types";
