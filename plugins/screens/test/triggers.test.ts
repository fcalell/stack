import assert from "node:assert/strict";
import {
	mkdirSync,
	mkdtempSync,
	realpathSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { workspaceTriggers } from "../src/node/triggers.ts";

function write(path: string, content: string): void {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, content);
}

function manifest(path: string, fields: Record<string, unknown>): void {
	write(join(path, "package.json"), JSON.stringify(fields));
}

// An app whose `node_modules` holds a symlinked workspace package, a symlinked
// package with no source, and a package installed in place.
function workspace() {
	const root = realpathSync(mkdtempSync(join(tmpdir(), "stack-triggers-")));
	const app = join(root, "app");
	manifest(app, {
		dependencies: {
			"@ws/mixed": "workspace:*",
			"@ws/compiled": "workspace:*",
			"@ws/absent": "workspace:*",
			installed: "^1.0.0",
		},
	});

	const mixed = join(root, "packages/mixed");
	manifest(mixed, {
		exports: {
			".": { types: "./dist/index.d.ts", default: "./dist/index.js" },
			"./node/mode": { default: "./dist/node/mode.js" },
			"./globals.css": "./src/ui/globals.css",
			"./components/*": "./src/ui/components/*/index.tsx",
			"./lib/*": "./src/lib/*.ts",
		},
	});
	for (const file of [
		"src/index.ts",
		"src/node/mode.ts",
		"src/node/deep/theme.ts",
		"src/ui/globals.css",
		"src/ui/components/button/index.tsx",
		"src/ui/components/button/parts.tsx",
		"src/lib/words.ts",
	]) {
		write(join(mixed, file), "");
	}

	const compiled = join(root, "packages/compiled");
	manifest(compiled, { exports: { ".": { default: "./dist/index.js" } } });
	write(join(compiled, "src/index.ts"), "");

	const installed = join(app, "node_modules/installed");
	manifest(installed, { exports: { ".": "./dist/index.js" } });
	write(join(installed, "src/index.ts"), "");

	mkdirSync(join(app, "node_modules/@ws"), { recursive: true });
	symlinkSync(mixed, join(app, "node_modules/@ws/mixed"));
	symlinkSync(compiled, join(app, "node_modules/@ws/compiled"));
	return { app, mixed, compiled };
}

test("a linked package's compiled side is a trigger and its served sources are not", () => {
	const { app, mixed, compiled } = workspace();
	const triggers = workspaceTriggers(app);
	assert.deepEqual(
		triggers.sort(),
		[
			// `src/index.ts` is a file of a directory no source export serves, so it
			// is listed on its own; the directory beside it that is served is not.
			join(mixed, "src/index.ts"),
			`${join(mixed, "src/node")}/**`,
			// `./lib/*` serves `src/lib/`; `./globals.css` and `./components/*`
			// serve `src/ui/`.
			`${join(compiled, "src")}/**`,
		].sort(),
	);
});

test("a package installed in place and a dependency that is absent add no trigger", () => {
	const { app } = workspace();
	const triggers = workspaceTriggers(app);
	assert.equal(
		triggers.some((t) => t.includes("installed") || t.includes("absent")),
		false,
	);
});

test("an app that links nothing has no trigger", () => {
	const root = realpathSync(mkdtempSync(join(tmpdir(), "stack-triggers-")));
	manifest(root, { dependencies: { installed: "^1.0.0" } });
	assert.deepEqual(workspaceTriggers(root), []);
});
