import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { bundleServer, rewriteSource } from "./bundle.ts";

const modules = fileURLToPath(new URL("../server/modules.ts", import.meta.url));

test("a worker URL and a loadModules call are rewritten for the bundle", () => {
	const out = rewriteSource(
		'const w = new Worker(new URL("./w.ts", import.meta.url), { workerData: 1 });',
		"/app/src/lib/start.ts",
		(path) => `./workers/${path.split("/").at(-1)}.mjs`,
	);
	assert.equal(
		out,
		'const w = new Worker(new URL("./workers/w.ts.mjs", import.meta.url), { workerData: 1 });',
	);
});

test("the bundle holds its workers and its listed directories", async () => {
	const cwd = mkdtempSync(join(tmpdir(), "bundle-"));
	try {
		mkdirSync(join(cwd, "src", "jobs"), { recursive: true });
		mkdirSync(join(cwd, ".stack"));
		writeFileSync(
			join(cwd, "src", "jobs", "alpha.ts"),
			"export default { kind: 'alpha' };",
		);
		writeFileSync(
			join(cwd, "src", "jobs", "beta.ts"),
			"export default { kind: 'beta' };",
		);
		writeFileSync(
			join(cwd, "src", "jobs", "beta.test.ts"),
			"throw new Error()",
		);
		writeFileSync(
			join(cwd, "src", "inner.ts"),
			"import { parentPort } from 'node:worker_threads';\nparentPort?.postMessage('inner');",
		);
		writeFileSync(
			join(cwd, "src", "worker.ts"),
			[
				"import { Worker } from 'node:worker_threads';",
				"import { parentPort } from 'node:worker_threads';",
				"const inner = new Worker(new URL('./inner.ts', import.meta.url));",
				"inner.on('message', (m) => parentPort?.postMessage('via ' + m));",
			].join("\n"),
		);
		writeFileSync(
			join(cwd, ".stack", "entry.ts"),
			[
				"import { Worker } from 'node:worker_threads';",
				`import { loadModules } from ${JSON.stringify(modules)};`,
				"const kinds = await loadModules(new URL('../src/jobs/', import.meta.url));",
				"const worker = new Worker(new URL('../src/worker.ts', import.meta.url));",
				"const said = await new Promise((resolve) => worker.on('message', resolve));",
				"console.log(JSON.stringify({ kinds: Object.keys(kinds), said }));",
				"await worker.terminate();",
			].join("\n"),
		);
		const outDir = join(cwd, "dist", "server");
		await bundleServer({
			cwd,
			entry: join(cwd, ".stack", "entry.ts"),
			outDir,
			entries: [],
		});
		const run = spawnSync(process.execPath, [join(outDir, "server.mjs")], {
			cwd: tmpdir(),
			encoding: "utf8",
		});
		assert.equal(run.status, 0, run.stderr);
		assert.deepEqual(JSON.parse(run.stdout), {
			kinds: ["alpha", "beta"],
			said: "via inner",
		});
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
});

test("a module of src/bin is a tool bundled beside the server", async () => {
	const cwd = mkdtempSync(join(tmpdir(), "bundle-bin-"));
	try {
		mkdirSync(join(cwd, "src", "bin"), { recursive: true });
		mkdirSync(join(cwd, "src", "jobs"));
		mkdirSync(join(cwd, ".stack"));
		writeFileSync(join(cwd, ".stack", "entry.ts"), "console.log('server');");
		writeFileSync(
			join(cwd, "src", "jobs", "alpha.ts"),
			"export default { kind: 'alpha' };",
		);
		writeFileSync(
			join(cwd, "src", "inner.ts"),
			"import { parentPort } from 'node:worker_threads';\nparentPort?.postMessage('inner');",
		);
		writeFileSync(
			join(cwd, "src", "bin", "tool.ts"),
			[
				"import { Worker } from 'node:worker_threads';",
				`import { loadModules } from ${JSON.stringify(modules)};`,
				"const kinds = await loadModules(new URL('../jobs/', import.meta.url));",
				"const w = new Worker(new URL('../inner.ts', import.meta.url));",
				"const said = await new Promise((resolve) => w.on('message', resolve));",
				"console.log(JSON.stringify({ kinds: Object.keys(kinds), said, args: process.argv.slice(2) }));",
				"await w.terminate();",
			].join("\n"),
		);
		writeFileSync(join(cwd, "src", "bin", "tool.test.ts"), "throw new Error()");
		writeFileSync(join(cwd, "src", "bin", "types.d.ts"), "export {};");
		const outDir = join(cwd, "dist", "server");
		const { bins } = await bundleServer({
			cwd,
			entry: join(cwd, ".stack", "entry.ts"),
			outDir,
			entries: [],
		});
		assert.deepEqual(bins, ["tool.mjs"]);
		const run = spawnSync(
			process.execPath,
			[join(outDir, "bin", "tool.mjs"), "--help"],
			{ cwd: tmpdir(), encoding: "utf8" },
		);
		assert.equal(run.status, 0, run.stderr);
		assert.deepEqual(JSON.parse(run.stdout), {
			kinds: ["alpha"],
			said: "inner",
			args: ["--help"],
		});
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
});
