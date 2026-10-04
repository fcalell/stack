import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { plugin } from "../src/lib/create-plugin.ts";
import {
	type DiscoveredPlugin,
	displacedBy,
	loadInstalledPlugins,
	resolveRequiresClosure,
	validateDependencies,
} from "../src/lib/discovery.ts";

// Links a stand-in first-party plugin into the app's `node_modules`, as a
// workspace install does.
function install(app: string, name: string): void {
	const dir = join(app, "..", `plugin-${name}`);
	mkdirSync(join(dir, "dist"), { recursive: true });
	writeFileSync(
		join(dir, "package.json"),
		JSON.stringify({
			name: `@fcalell/plugin-${name}`,
			type: "module",
			exports: { ".": "./dist/index.js" },
		}),
	);
	writeFileSync(
		join(dir, "dist/index.js"),
		`export const ${name} = { cli: { requires: [] } };`,
	);
	mkdirSync(join(app, "node_modules/@fcalell"), { recursive: true });
	symlinkSync(dir, join(app, "node_modules/@fcalell", `plugin-${name}`));
}

test("a plugin installed after an earlier load still loads", async () => {
	const app = join(mkdtempSync(join(tmpdir(), "stack-")), "app");
	mkdirSync(app);
	writeFileSync(join(app, "package.json"), "{}");
	install(app, "cloudflare");
	const original = process.cwd();
	process.chdir(app);
	try {
		const first = await loadInstalledPlugins(["cloudflare"]);
		assert.deepEqual(
			first.map((p) => p.name),
			["cloudflare"],
		);
		install(app, "db");
		const second = await loadInstalledPlugins(["cloudflare", "db"]);
		assert.deepEqual(
			second.map((p) => p.name),
			["cloudflare", "db"],
		);
	} finally {
		process.chdir(original);
	}
});

// Stand-ins mirroring the `requires` each `plugins/*/src/index.ts` declares,
// plus `bridge`, which names a server target after api.
const SERVER_TARGET = { oneOf: ["cloudflare", "node"] } as const;
const available: DiscoveredPlugin[] = (
	[
		["native-ui", ["expo", "api", "auth"]],
		["expo", []],
		["auth", ["api", "db"]],
		["db", ["api"]],
		["api", [SERVER_TARGET]],
		["cloudflare", []],
		["node", ["api"]],
		["bridge", ["api", "node"]],
	] as const
).map(([name, requires]) => {
	const factory = plugin(name, { label: name, requires });
	return { name, cli: factory.cli, factory, options: {} };
});

const SERVER_TARGETS = new Set<string>(SERVER_TARGET.oneOf);
const targets = (names: string[]) => names.filter((n) => SERVER_TARGETS.has(n));
const config = (...names: string[]) =>
	available.filter((p) => names.includes(p.name));

test("the closure of native-ui pulls one server target, cloudflare by default", async () => {
	const closure = await resolveRequiresClosure(["native-ui"], available);
	assert.deepEqual(targets(closure), ["cloudflare"]);
	assert.deepEqual([...closure].sort(), [
		"api",
		"auth",
		"cloudflare",
		"db",
		"expo",
		"native-ui",
	]);
});

test("a one-of takes the plugin the chooser picks", async () => {
	const closure = await resolveRequiresClosure(
		["native-ui"],
		available,
		async () => "node",
	);
	assert.deepEqual(targets(closure), ["node"]);
});

test("a selection that picks node adds no cloudflare", async () => {
	const closure = await resolveRequiresClosure(
		["native-ui", "node"],
		available,
		async () => assert.fail("a met one-of asks nothing"),
	);
	assert.deepEqual(targets(closure), ["node"]);
});

test("a one-of is met by a plugin required after it", async () => {
	const closure = await resolveRequiresClosure(["bridge"], available);
	assert.deepEqual(targets(closure), ["node"]);
});

test("validation rejects an api with no server target and names the choices", () => {
	assert.throws(
		() => validateDependencies(config("db", "api")),
		/\[api\] requires one of 'cloudflare', 'node', but none is in your config\. Add cloudflare\(\) or node\(\)/,
	);
	assert.doesNotThrow(() => validateDependencies(config("api", "node")));
});

test("validation rejects an api with both server targets", () => {
	assert.throws(
		() => validateDependencies(config("api", "cloudflare", "node")),
		/\[api\] requires exactly one of 'cloudflare', 'node', but your config has cloudflare, node\. Remove all but one\./,
	);
});

test("adding node to a cloudflare app leaves exactly node", async () => {
	const app = config("db", "api", "cloudflare");
	const displaced = displacedBy("node", app);
	assert.deepEqual(displaced, ["cloudflare"]);

	const kept = app.map((p) => p.name).filter((n) => !displaced.includes(n));
	const closure = await resolveRequiresClosure([...kept, "node"], available);
	assert.deepEqual(targets(closure), ["node"]);
	assert.doesNotThrow(() => validateDependencies(config(...closure)));
});

test("a plugin no one-of names displaces nothing", () => {
	assert.deepEqual(displacedBy("auth", config("db", "api", "cloudflare")), []);
	assert.deepEqual(displacedBy("node", config("expo")), []);
});
