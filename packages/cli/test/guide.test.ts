import assert from "node:assert/strict";
import { test } from "node:test";
import { buildGraphFromDiscovered } from "../src/lib/build-graph.ts";
import { cliSlots } from "../src/lib/cli-slots.ts";
import { plugin } from "../src/lib/create-plugin.ts";
import type { DiscoveredPlugin } from "../src/lib/discovery.ts";

function discover(...factories: DiscoveredPlugin["factory"][]) {
	return factories.map((factory) => ({
		name: factory.name,
		cli: factory.cli,
		factory,
		options: {},
	}));
}

async function guide(discovered: DiscoveredPlugin[]): Promise<string> {
	const { graph } = buildGraphFromDiscovered({
		discovered,
		app: { name: "app", domain: "example.com" },
		cwd: "/nonexistent",
	});
	const files = await graph.resolve(cliSlots.artifactFiles);
	const file = files.find((f) => f.path === ".stack/guide.md");
	assert.ok(file);
	return file.content;
}

test("the index lists each plugin's pages under its name, by its package", async () => {
	const ui = plugin("ui", {
		label: "UI",
		guide: [
			{ page: "rules", trigger: "Writing any `.tsx`" },
			{ page: "screen", trigger: "Building a screen" },
		],
	});
	const data = plugin("data", {
		label: "Data",
		package: "@acme/stack-data",
		guide: [{ page: "tables", trigger: "Adding a table" }],
	});
	assert.equal(
		await guide(discover(ui, data)),
		[
			"Stack's guide at this project's pin: each line says when to open a page, then the page. Open only the page the step in hand needs.",
			"",
			"## cli",
			"",
			"- Shaping, scoping or estimating a feature → node_modules/@fcalell/cli/guide/provided.md",
			"- Adding a plugin or changing an option in `stack.config.ts` → node_modules/@fcalell/cli/guide/config.md",
			"- Running a `stack` command, or deciding which one a change needs → node_modules/@fcalell/cli/guide/commands.md",
			"- A part the app needs that stack lacks: a component, variant, token, option or procedure feature → node_modules/@fcalell/cli/guide/gap.md",
			"",
			"## data",
			"",
			"- Adding a table → node_modules/@acme/stack-data/guide/tables.md",
			"",
			"## ui",
			"",
			"- Writing any `.tsx` → node_modules/@fcalell/plugin-ui/guide/rules.md",
			"- Building a screen → node_modules/@fcalell/plugin-ui/guide/screen.md",
			"",
		].join("\n"),
	);
});

test("the domains follow their names, never the config's order", async () => {
	const a = plugin("a", { label: "A", guide: [{ page: "p", trigger: "A" }] });
	const b = plugin("b", { label: "B", guide: [{ page: "p", trigger: "B" }] });
	assert.equal(await guide(discover(a, b)), await guide(discover(b, a)));
});

test("a page two plugins list is indexed once", async () => {
	const shared = {
		domain: "kit",
		package: "@acme/kit",
		page: "rules",
		trigger: "Kit",
	};
	const web = plugin("web", {
		label: "Web",
		contributes: [cliSlots.guide.contribute(() => shared)],
	});
	const phone = plugin("phone", {
		label: "Phone",
		contributes: [cliSlots.guide.contribute(() => shared)],
	});
	const index = await guide(discover(web, phone));
	assert.equal(index.split("node_modules/@acme/kit/guide/rules.md").length, 2);
});
