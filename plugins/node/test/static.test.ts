import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createNodeServer } from "../src/server/create-node-server.ts";

async function freePort(): Promise<number> {
	const probe = createServer();
	await new Promise<void>((resolve) => probe.listen(0, resolve));
	const { port } = probe.address() as AddressInfo;
	await new Promise((resolve) => probe.close(resolve));
	return port;
}

// A GET for a client route the server answers, after starting it with the
// given static root.
async function deepLink(staticRoot: string | null): Promise<Response> {
	const port = await freePort();
	const server = createNodeServer({
		port,
		worker: null,
		staticRoot,
		log: { info: () => {}, error: console.error },
	});
	await server.start();
	try {
		return await fetch(`http://localhost:${port}/board/1`);
	} finally {
		await server.stop();
	}
}

// A directory holding a client shell; the process runs from it, so a
// static root that fell back to the working directory would serve it.
const root = mkdtempSync(join(tmpdir(), "stack-node-static-"));
writeFileSync(join(root, "index.html"), "<p>shell</p>");
process.chdir(root);

test("a deep link is answered with the web client's shell", async () => {
	const response = await deepLink(root);
	assert.equal(response.status, 200);
	assert.equal(await response.text(), "<p>shell</p>");
});

test("with no web client, nothing is served as static or as a shell", async () => {
	const response = await deepLink(null);
	assert.equal(response.status, 404);
});
