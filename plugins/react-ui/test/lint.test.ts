import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import { cliSlots } from "@fcalell/cli/cli-slots";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { react } from "@fcalell/plugin-react";
import { vite } from "@fcalell/plugin-vite";
import { binPath } from "@fcalell/ui-core/harness";
import { reactUi } from "../src/index.ts";
import { LINT_RULES } from "../src/node/lint.ts";

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rules = readFileSync(join(pkgDir, "guide/rules.md"), "utf8");

// `.stack/biome.json` as `stack generate` writes it for a web app.
async function lintConfig(routes?: { dir: string }): Promise<string> {
	const plugins = [
		{ factory: vite, config: vite() },
		{ factory: react, config: react({ routes }) },
		{ factory: reactUi, config: reactUi() },
	];
	const { graph } = buildGraphFromDiscovered({
		discovered: plugins.map(
			({ factory, config }) =>
				({
					name: config.__plugin,
					cli: factory.cli,
					factory,
					options: config.options,
				}) as unknown as DiscoveredPlugin,
		),
		app: { name: "lint", domain: "example.com" },
		cwd: mkdtempSync(join(tmpdir(), "stack-react-ui-")),
	});
	const files = await graph.resolve(cliSlots.artifactFiles);
	const file = files.find((f) => f.path === ".stack/biome.json");
	assert.ok(file);
	return file.content;
}

// A scratch consumer: the shared preset and the generated plugins, both
// reached the way an install reaches them (`node_modules/@fcalell/…`).
let app: string;

before(async () => {
	app = mkdtempSync(join(tmpdir(), "stack-lint-"));
	const scope = join(app, "node_modules/@fcalell");
	mkdirSync(scope, { recursive: true });
	symlinkSync(pkgDir, join(scope, "plugin-react-ui"), "dir");
	symlinkSync(
		resolve(pkgDir, "../../packages/biome-config"),
		join(scope, "biome-config"),
		"dir",
	);
	// The preset reads the repo's ignore file, which an app always has.
	writeFileSync(join(app, ".gitignore"), "node_modules\n.stack\n");
	mkdirSync(join(app, ".stack"));
	writeFileSync(join(app, ".stack/biome.json"), await lintConfig());
	writeFileSync(
		join(app, "biome.json"),
		JSON.stringify({
			extends: ["@fcalell/biome-config/shared.json", "./.stack/biome.json"],
		}),
	);
	mkdirSync(join(app, "src/app"), { recursive: true });
	mkdirSync(join(app, "src/worker"), { recursive: true });
});

after(() => rmSync(app, { recursive: true, force: true }));

function lint(path: string, source: string): { ok: boolean; output: string } {
	writeFileSync(join(app, path), source);
	try {
		const output = execFileSync(
			binPath(pkgDir, "biome"),
			["lint", "--max-diagnostics=50", path],
			{ cwd: app, encoding: "utf8", stdio: "pipe" },
		);
		return { ok: true, output };
	} catch (error) {
		const { stdout, stderr } = error as { stdout: string; stderr: string };
		return { ok: false, output: `${stdout}${stderr}` };
	}
}

const heading = (text: string) => text.replaceAll("`", "");
const SECTIONS = [...rules.matchAll(/^## (.+)$/gm)].map((m) =>
	heading(m[1] ?? ""),
);

// Each rule, its section of the rules page, and a minimal offender.
const OFFENDERS: Record<(typeof LINT_RULES)[number], string[]> = {
	"no-class-on-component": [
		`<Text className="x" />`,
		`<Text class="x" />`,
		`<Group classList={{ a: true }} />`,
		`<Text style={{ margin: 0 }}>x</Text>`,
		`<Foo.Bar className="x" />`,
		`<div title={<Text className="x" />} />`,
	],
	"no-host-look": [
		`<div className="flex bg-surface" />`,
		`<div className="rounded-card" />`,
		`<div className="shadow-float" />`,
		`<div className="font-medium" />`,
		`<div className="transition-colors" />`,
		`<div className="border" />`,
		`<div className="border-t border-line" />`,
		`<div className="hover:bg-hover" />`,
		`<div className="border-0 bg-surface" />`,
		`<div className="w-4" />`,
		`<div className="flex px-2.5" />`,
		`<div className={cn("flex", on && "rounded-card")} />`,
		`<Foo render={<div className="bg-surface" />} />`,
	],
	"no-arbitrary-value": [
		`<div className="h-[34px]" />`,
		`<div className="flex bg-[#fff]" />`,
		`<div className="w-[calc(100%-2rem)]" />`,
	],
	"no-raw-style": [
		`<div style={{ color: "#fff" }} />`,
		`<div style={{ width: "34px" }} />`,
		`<div style={{ color: "rgb(1 2 3)" }} />`,
	],
	"no-img": [`<img src="a" alt="b" />`, `<img src="a" alt="b">x</img>`],
	"no-density": [`<div data-density="touch" />`],
	"no-map-rows": [
		`<div>{rows.map((r) => <ListRow key={r} title={r} />)}</div>`,
		`<div>{rows.map((r) => (<DefinitionRow key={r} label={r} value={r} />))}</div>`,
		`<div>{rows.map((r) => <div key={r}><Meter value={r} /></div>)}</div>`,
	],
};

// The section each rule's message names.
const SECTION: Record<(typeof LINT_RULES)[number], string> = {
	"no-class-on-component": "Classes are geometry, on host elements only",
	"no-host-look": "Classes are geometry, on host elements only",
	"no-arbitrary-value": "Tokens only",
	"no-raw-style": "Tokens only",
	"no-img": "A picture is an Image",
	"no-density": "A screen read from across a room declares its distance",
	"no-map-rows": "Collections take data",
};

for (const rule of LINT_RULES) {
	test(`${rule} fails its offenders and names its section of the rules page`, () => {
		assert.ok(SECTIONS.includes(SECTION[rule]), SECTION[rule]);
		for (const [index, jsx] of OFFENDERS[rule].entries()) {
			const result = lint(
				`src/app/${rule}-${index}.tsx`,
				`export const A = () => ${jsx};\n`,
			);
			assert.equal(result.ok, false, jsx);
			assert.ok(result.output.includes(`(rules.md: ${SECTION[rule]})`), jsx);
		}
	});
}

test("each rule is a file of lint/ that the rules page's table lists, and nothing else is", () => {
	const files = readdirSync(join(pkgDir, "lint"))
		.map((name) => name.replace(/\.grit$/, ""))
		.sort();
	assert.deepEqual(files, [...LINT_RULES].sort());
	for (const rule of LINT_RULES) {
		assert.ok(rules.includes(`| \`${rule}\` |`), rule);
	}
	const manifest = JSON.parse(
		readFileSync(join(pkgDir, "package.json"), "utf8"),
	) as { files: string[] };
	assert.ok(manifest.files.includes("lint"));
});

test("the legal geometry of the rules page passes", () => {
	// The page's own examples: every tsx block, each as one export.
	const blocks = [...rules.matchAll(/```tsx\n([\s\S]*?)```/g)].map(
		(m) => m[1] ?? "",
	);
	assert.ok(blocks.length > 10);
	const examples = blocks
		.map((block, index) => `export const E${index} = () => (<>\n${block}</>);`)
		.join("\n");
	assert.deepEqual(lint("src/app/examples.tsx", `${examples}\n`).ok, true);

	const geometry = lint(
		"src/app/geometry.tsx",
		`export const A = () => (
	<div className="flex min-h-0 min-w-0 flex-1 flex-col items-start justify-between gap-rows p-0 top-0 inset-0 w-full h-full size-full w-1/2">
		<span className="truncate md:flex touch:grid [&>svg]:size-full data-[open]:flex min-[400px]:flex" />
		<div className="border-0 bg-none rounded-none shadow-none transition-none" />
		<Foo render={<div className="flex" />} title="x" />
		<div style={{ width: "var(--x)" }} data-state="open" />
		<List items={rows.map((r) => ({ key: r }))} row={{ key: (r) => r, title: (r) => r }} />
	</div>
);\n`,
	);
	assert.deepEqual(geometry, { ok: true, output: geometry.output });
});

test("the rules run on the app's directory only", () => {
	const offender = `export const A = () => <div className="bg-surface" />;\n`;
	assert.equal(lint("src/worker/outside.tsx", offender).ok, true);
	assert.equal(lint("src/app/inside.tsx", offender).ok, false);
});

test("the sources the rules run on follow the routes directory", async () => {
	const includes = async (routes?: { dir: string }) => {
		const config = JSON.parse(await lintConfig(routes)) as {
			overrides: { includes: string[]; plugins: string[] }[];
		};
		assert.equal(config.overrides.length, 1);
		assert.deepEqual(
			config.overrides[0]?.plugins.map((p) => p.replace(/^.*\/lint\//, "")),
			LINT_RULES.map((rule) => `${rule}.grit`),
		);
		return config.overrides[0]?.includes;
	};
	assert.deepEqual(await includes(), ["src/app/**"]);
	assert.deepEqual(await includes({ dir: "src/web/routes" }), ["src/web/**"]);
});
