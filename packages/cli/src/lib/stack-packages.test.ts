import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { pnpmWorkspaceTemplate } from "../templates/pnpm-workspace.ts";
import { cliManifest } from "./manifest.ts";
import {
	pinnedCommit,
	STACK_PACKAGES,
	stackBuildKey,
	stackGitSpec,
	stackPluginSpecs,
	stackSpec,
	stackSpecMode,
} from "./stack-packages.ts";

const SHA = "29e948348c79653f122143f0c8c20be0b9889513";

test("a published version selects npm, an unpublished checkout selects github", () => {
	assert.equal(stackSpecMode("0.1.0"), "npm");
	assert.equal(stackSpecMode("1.2.3-beta.1"), "npm");
	assert.equal(stackSpecMode("0.0.0"), "github");
});

test("the default mode follows the CLI's own manifest", () => {
	assert.equal(stackSpecMode(), stackSpecMode(cliManifest.version));
	assert.equal(
		stackSpec("@fcalell/plugin-db"),
		stackSpec("@fcalell/plugin-db", null, cliManifest.version),
	);
});

test("npm specs are a caret range of the CLI's version, whatever the commit", () => {
	assert.equal(stackSpec("@fcalell/plugin-db", null, "0.1.0"), "^0.1.0");
	assert.equal(stackSpec("@fcalell/cli", SHA, "0.1.0"), "^0.1.0");
});

test("github specs are subdirectory specs, at the commit when one is pinned", () => {
	assert.equal(
		stackSpec("@fcalell/plugin-db", null, "0.0.0"),
		"github:fcalell/stack#path:/plugins/db",
	);
	assert.equal(
		stackSpec("@fcalell/plugin-db", SHA, "0.0.0"),
		`github:fcalell/stack#${SHA}&path:/plugins/db`,
	);
});

test("only github specs pin a commit", () => {
	const specs = {
		"@fcalell/plugin-db": stackSpec("@fcalell/plugin-db", SHA, "0.0.0"),
	};
	assert.equal(pinnedCommit(specs, "0.0.0"), SHA);
	assert.equal(pinnedCommit(specs, "0.1.0"), null);
	assert.equal(pinnedCommit({ "@fcalell/plugin-db": "^0.1.0" }, "0.1.0"), null);
});

test("plugin specs follow the mode", () => {
	assert.deepEqual(stackPluginSpecs(["db", "nope"], null, "0.1.0"), {
		"@fcalell/plugin-db": "^0.1.0",
	});
	assert.deepEqual(stackPluginSpecs(["db"], SHA, "0.0.0"), {
		"@fcalell/plugin-db": `github:fcalell/stack#${SHA}&path:/plugins/db`,
	});
});

test("the npm workspace template carries only the third-party verdicts", () => {
	const yaml = pnpmWorkspaceTemplate(
		null,
		["@fcalell/plugin-auth", "@fcalell/plugin-react-ui"],
		"npm",
		null,
	);
	assert.doesNotMatch(yaml, /overrides/);
	assert.doesNotMatch(yaml, /blockExoticSubdeps/);
	assert.doesNotMatch(yaml, /childConcurrency|networkConcurrency/);
	assert.doesNotMatch(yaml, /git\+https|github/);
	assert.match(yaml, /allowBuilds/);
	assert.match(yaml, /esbuild: true/);
	assert.match(yaml, /better-sqlite3: true/);
	assert.match(yaml, /"@prisma\/client": false/);
	// The link mode takes the same verdicts.
	assert.equal(
		yaml,
		pnpmWorkspaceTemplate(
			null,
			["@fcalell/plugin-auth", "@fcalell/plugin-react-ui"],
			"link",
			null,
		),
	);
});

test("the github workspace template overrides each package and approves its prepare", () => {
	const yaml = pnpmWorkspaceTemplate(
		null,
		["@fcalell/plugin-vite"],
		"github",
		null,
	);
	assert.match(yaml, /overrides/);
	assert.match(yaml, /blockExoticSubdeps: false/);
	assert.match(yaml, /childConcurrency: 1/);
	assert.ok(yaml.includes(stackBuildKey("@fcalell/plugin-vite")));
	assert.ok(yaml.includes(stackGitSpec("@fcalell/cli")));
});

const REPO = new URL("../../../../", import.meta.url);

function manifest(dir: string): {
	name: string;
	private?: boolean;
	dependencies?: Record<string, string>;
} {
	return JSON.parse(readFileSync(new URL(`${dir}/package.json`, REPO), "utf8"));
}

test("each STACK_PACKAGES entry lists its manifest's @fcalell dependencies", () => {
	for (const [name, entry] of Object.entries(STACK_PACKAGES)) {
		const pkg = manifest(entry.dir);
		assert.equal(pkg.name, name);
		const declared = Object.keys(pkg.dependencies ?? {})
			.filter((dep) => dep.startsWith("@fcalell/"))
			.sort();
		assert.deepEqual(
			[...entry.dependencies].sort(),
			declared,
			`${name} dependencies drifted from ${entry.dir}/package.json`,
		);
	}
});

test("every public package of the repo has an entry", () => {
	const dirs = ["packages", "plugins"].flatMap((group) =>
		readdirSync(new URL(`${group}/`, REPO), { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => `${group}/${entry.name}`),
	);
	const listed = new Set<string>(Object.keys(STACK_PACKAGES));
	for (const dir of dirs) {
		let pkg: ReturnType<typeof manifest>;
		try {
			pkg = manifest(dir);
		} catch {
			continue;
		}
		if (pkg.private) continue;
		assert.ok(listed.has(pkg.name), `${pkg.name} (${dir}) has no entry`);
	}
});
