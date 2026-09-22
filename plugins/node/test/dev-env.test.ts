import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { plugin } from "@fcalell/cli";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import { cliSlots } from "@fcalell/cli/cli-slots";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { api } from "@fcalell/plugin-api";
import { node } from "../src/index.ts";

// Declares two env vars and a runtime, so api emits a worker and node
// contributes its dev process.
const probe = plugin("probe", {
	label: "Probe",
	contributes: [
		api.slots.env.contribute(() => [
			{ name: "STACK_TEST_UNSET", devDefault: "from-default" },
			{ name: "STACK_TEST_SET", devDefault: "from-default" },
		]),
		api.slots.pluginRuntimes.contribute(() => ({
			plugin: "probe",
			import: { source: "probe-runtime", default: "probeRuntime" },
			identifier: "probeRuntime",
			options: {},
		})),
	],
});

async function nodeProcessEnv(): Promise<Record<string, string> | undefined> {
	const discovered = [api, node, probe].map((factory) => {
		const config = factory();
		return {
			name: config.__plugin,
			cli: factory.cli,
			factory,
			options: config.options,
		} as unknown as DiscoveredPlugin;
	});
	const { graph } = buildGraphFromDiscovered({
		discovered,
		app: { name: "dev-env", domain: "example.com" },
		cwd: mkdtempSync(join(tmpdir(), "stack-dev-env-")),
	});
	const processes = await graph.resolve(cliSlots.devProcesses);
	return processes.find((p) => p.name === "node")?.env;
}

test("the dev process carries a declared var's devDefault when the shell leaves it unset", async () => {
	delete process.env.STACK_TEST_UNSET;
	const env = await nodeProcessEnv();
	assert.equal(env?.STACK_TEST_UNSET, "from-default");
	assert.equal(env?.STACK_DEV, "1");
});

test("the dev process leaves a var the shell sets to the shell's value", async () => {
	process.env.STACK_TEST_SET = "from-shell";
	const env = await nodeProcessEnv();
	assert.equal(env?.STACK_TEST_SET, undefined);
	assert.equal({ ...process.env, ...env }.STACK_TEST_SET, "from-shell");
});
