import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildGraphFromConfig } from "@fcalell/cli/build-graph";
import { cliSlots } from "@fcalell/cli/cli-slots";

// What `stack dev` and `stack build` write holds no trace of `serve`'s controls:
// the files generate writes are what both run from.
// (`/fixtures` is the workbench's own file, which stays.)
const TRACES =
	/fixtureControls|plugin-screens\/serve|\/fixture(?!s)|STACK_SERVE/;

test("the generated output of an app holds no trace of the served controls", async () => {
	const cwd = fileURLToPath(
		new URL("../../../../apps/showcase/", import.meta.url),
	);
	// Discovery resolves the config's plugins from the working directory.
	process.chdir(cwd);
	const config = (await import(`${cwd}stack.config.ts`)).default;
	const { graph } = await buildGraphFromConfig({ config, cwd });
	const files = await graph.resolve(cliSlots.artifactFiles);
	assert.ok(files.some((file) => file.path === ".stack/wrangler.toml"));
	assert.ok(files.some((file) => file.path === ".stack/worker.ts"));
	for (const file of files)
		assert.doesNotMatch(file.content, TRACES, file.path);
});
