import { spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { ServeRun, ServeStep, ServeTarget } from "../types.ts";
import { startServer } from "./serve-process.ts";

// `stack screens serve`: the app's real server on throwaway state, seeded.

export const SEED_FILE = "src/app/seed.ts";

export interface ServeInputs {
	cwd: string;
	flags: Record<string, unknown>;
	steps: ServeStep[];
	envs: Array<(serve: { url: string }) => Record<string, string>>;
	targets: ServeTarget[];
	// The oRPC prefix the seed's client calls.
	rpc: string | null;
	// The vite binary that builds the web client; null without a web client.
	vite: { bin: string; outDir: string } | null;
}

function freePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const server = createServer();
		server.once("error", reject);
		server.listen(0, "127.0.0.1", () => {
			const { port } = server.address() as { port: number };
			server.close(() => resolve(port));
		});
	});
}

function buildClient(
	serve: ServeRun,
	vite: { bin: string; outDir: string },
): void {
	const built = spawnSync(
		process.execPath,
		[
			vite.bin,
			"build",
			"--config",
			".stack/vite.config.ts",
			"--outDir",
			serve.client as string,
			"--emptyOutDir",
		],
		{ cwd: serve.cwd, encoding: "utf8" },
	);
	if (built.status !== 0)
		throw new Error(
			`the web client did not build:\n${(built.stderr || built.stdout).trim()}`,
		);
}

// The seed's `client`: the app's API client with the cookie `/fixture/link`
// sets; with no fixture member (an app without auth) it is unsigned.
async function seedContext(serve: ServeRun, rpc: string | null, dir: string) {
	const answer = await fetch(`${serve.url}/fixture/link`, {
		redirect: "manual",
	});
	if (answer.status !== 404 && answer.status !== 302)
		throw new Error(`/fixture/link answered ${answer.status}`);
	const cookie = answer.headers
		.getSetCookie()
		.map((line) => line.split(";")[0])
		.join("; ");
	const { createClient } = await import("@fcalell/plugin-api/client");
	return {
		client: createClient({
			url: `${serve.url}${rpc ?? "/rpc"}`,
			headers: { cookie, origin: serve.url },
		}),
		url: serve.url,
		dir,
		async fx(path: string) {
			const reply = await fetch(`${serve.url}${path}`);
			if (!reply.ok) throw new Error(`${path} answered ${reply.status}`);
			return reply.text();
		},
	};
}

export async function serve(inputs: ServeInputs): Promise<void> {
	const { cwd, flags, steps, envs, targets, rpc, vite } = inputs;
	const dir = mkdtempSync(join(tmpdir(), "stack-serve-"));
	const state = join(dir, "state");
	mkdirSync(state);
	let stop: (() => Promise<void>) | null = null;
	let stopped = false;
	const cleanup = async () => {
		if (stopped) return;
		stopped = true;
		await stop?.();
		if (flags.keep === true) console.log(`stack screens serve: kept ${dir}`);
		else rmSync(dir, { recursive: true, force: true });
	};

	for (const signal of ["SIGINT", "SIGTERM"] as const)
		process.on(signal, () =>
			cleanup().then(
				() => process.exit(0),
				(error) => {
					console.error(error);
					process.exit(1);
				},
			),
		);

	try {
		const port = typeof flags.port === "number" ? flags.port : await freePort();
		const url = `http://localhost:${port}`;
		const run: ServeRun = {
			cwd,
			dir,
			state,
			client: vite ? join(dir, "client") : null,
			port,
			url,
			env: { STACK_SERVE_DIR: dir, STACK_SERVE_PORT: String(port) },
		};
		if (vite) buildClient(run, vite);
		for (const env of envs) Object.assign(run.env, env({ url }));
		for (const step of steps) await step.run(run);

		if (typeof flags.entry === "string") {
			stop = await startServer(run, "server", process.execPath, [flags.entry]);
		} else {
			const target = targets[0];
			if (!target) throw new Error("no deploy target in the config to serve");
			stop = await target.start(run);
		}

		const seedFile = join(cwd, SEED_FILE);
		if (existsSync(seedFile)) {
			const seed = (
				(await import(pathToFileURL(seedFile).href)) as {
					default: unknown;
				}
			).default;
			if (typeof seed !== "function")
				throw new Error(
					`${SEED_FILE} must export default defineServeSeed(...)`,
				);
			await seed(await seedContext(run, rpc, dir));
		}

		writeFileSync(
			join(dir, "serve.json"),
			JSON.stringify({ url, pid: process.pid }),
		);
		console.log(`stack screens serve: ${url}`);
		// The signal handlers end the run; the server's process keeps this one alive.
		await new Promise<void>(() => {});
	} finally {
		await cleanup();
	}
}
