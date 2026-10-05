import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { plugin } from "@fcalell/cli";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import { cliSlots } from "@fcalell/cli/cli-slots";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { api } from "@fcalell/plugin-api";
import { createServer as createViteServer } from "vite";
import { vite } from "../src/index.ts";

const FRAME_HEADERS = {
	"Content-Security-Policy": "frame-ancestors 'none'",
	"X-Frame-Options": "DENY",
};

function graphOf(web: boolean) {
	const other = plugin("other", { label: "other" });
	const plugins = [
		{ factory: api, config: api() },
		...(web
			? [{ factory: vite, config: vite() }]
			: [{ factory: other, config: other() }]),
	];
	const discovered = plugins.map(
		({ factory, config }) =>
			({
				name: config.__plugin,
				cli: factory.cli,
				factory,
				options: config.options,
			}) as unknown as DiscoveredPlugin,
	);
	return buildGraphFromDiscovered({
		discovered,
		app: { name: "vite-headers", domain: "example.com" },
		cwd: mkdtempSync(join(tmpdir(), "stack-vite-headers-")),
	}).graph;
}

test("the web client refuses every frame", async () => {
	const graph = graphOf(true);
	const headers = await graph.resolve(vite.slots.clientHeaders);
	assert.deepEqual(headers, FRAME_HEADERS);
	const files = await graph.resolve(cliSlots.artifactFiles);
	const config =
		files.find((f) => f.path === ".stack/vite.config.ts")?.content ?? "";
	assert.match(
		config,
		/headers: \{\s*"Content-Security-Policy": "frame-ancestors 'none'",\s*"X-Frame-Options": "DENY"\s*\}/,
	);
	assert.deepEqual(await graphOf(false).resolve(vite.slots.clientHeaders), {});
});

test("the dev server sends the client headers on documents and assets, never on proxied paths", async () => {
	const stub = createHttpServer((_req, res) => {
		res.setHeader("X-Frame-Options", "SAMEORIGIN");
		res.end("worker");
	});
	await new Promise<void>((resolve) => stub.listen(0, "127.0.0.1", resolve));
	const root = mkdtempSync(join(tmpdir(), "stack-vite-dev-"));
	writeFileSync(
		join(root, "index.html"),
		'<script type="module" src="/main.js"></script>',
	);
	writeFileSync(join(root, "main.js"), "export const x = 1;\n");
	const headers = await graphOf(true).resolve(vite.slots.clientHeaders);
	const dev = await createViteServer({
		root,
		configFile: false,
		logLevel: "silent",
		cacheDir: join(root, ".vite"),
		optimizeDeps: { noDiscovery: true },
		server: {
			port: 0,
			host: "127.0.0.1",
			headers,
			proxy: {
				"/rpc": {
					target: `http://127.0.0.1:${(stub.address() as AddressInfo).port}`,
				},
			},
		},
	});
	try {
		await dev.listen();
		const base = `http://127.0.0.1:${(dev.httpServer?.address() as AddressInfo).port}`;
		const get = (path: string, accept?: string) =>
			fetch(`${base}${path}`, accept ? { headers: { accept } } : undefined);
		for (const response of [
			await get("/"),
			await get("/connect/consent", "text/html"),
			await get("/main.js"),
		]) {
			assert.equal(response.status, 200);
			assert.equal(
				response.headers.get("content-security-policy"),
				"frame-ancestors 'none'",
			);
			assert.equal(response.headers.get("x-frame-options"), "DENY");
		}
		const proxied = await get("/rpc/x");
		assert.equal(await proxied.text(), "worker");
		assert.equal(proxied.headers.get("x-frame-options"), "SAMEORIGIN");
		assert.equal(proxied.headers.get("content-security-policy"), null);
	} finally {
		await dev.close();
		await new Promise((resolve) => stub.close(resolve));
	}
});
