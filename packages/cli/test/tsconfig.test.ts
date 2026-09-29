import assert from "node:assert/strict";
import {
	mkdirSync,
	mkdtempSync,
	readdirSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import ts from "typescript";
import { tsconfigLayout, tsconfigTemplate } from "../src/templates/tsconfig.ts";

const packageDir = resolve(import.meta.dirname, "..");

// A consumer with an app and a worker, holding the three things that
// collide in one program: the Workers runtime's `Element`, which hides DOM's
// `append(...nodes)` behind its HTMLRewriter overload, a Workers-only global,
// and the DOM. Each side names the other's global under an expected error, so
// a global leaking across fails the check as surely as a missing one.
const GLOBALS: Record<string, string> = {
	".stack/worker-configuration.d.ts": `interface Env { GREETING: string }
declare class HTMLRewriter {}
interface Element { append(content: string): Element }
`,
	"src/app/probe.ts": `document.body.append(document.createElement("div"));
// @ts-expect-error: the Workers runtime stays out of the app
new HTMLRewriter();
`,
	"src/worker/probe.ts": `export const greet = (env: Env): string => env.GREETING;
// @ts-expect-error: the DOM stays out of the worker
document.title;
`,
};

// The api plugin's shape in miniature: a procedure factory whose type is
// inferred and names `Env`, a route whose output is inferred from a handler
// reading it, the generated worker exporting the router type, a node test
// beside the shared code, and an app calling the router through a typed
// client. The app has to see the procedure's input and output without
// loading a worker source, since those only type-check with the Workers
// globals.
const ROUTER: Record<string, string> = {
	"src/shared/rpc.ts": `export interface Procedure<I, O> { input: I; output: O }
export type Client<R> = {
	[K in keyof R]: R[K] extends Procedure<infer I, infer O>
		? (input: I) => Promise<O>
		: Client<R[K]>;
};
export const createClient = <R>(): Client<R> => ({}) as Client<R>;
`,
	"src/shared/rpc.test.ts": `import assert from "node:assert/strict";
import { createClient } from "./rpc.ts";
assert.ok(createClient());
`,
	".stack/procedure.ts": `import type { Procedure } from "../src/shared/rpc.ts";
const context = (env: Env) => ({ env });
export const procedure = <I>() => ({
	query: <O>(
		handler: (args: { input: I; context: ReturnType<typeof context> }) => O,
	) => ({ handler }) as unknown as Procedure<I, O>,
});
`,
	"src/worker/routes/greetings.ts": `import { procedure } from "virtual:stack-procedure";
export const greetings = {
	hello: procedure<{ name: string }>().query(({ input, context }) => ({
		text: \`\${context.env.GREETING}, \${input.name}\`,
	})),
};
`,
	"src/worker/routes/index.ts": `export * from "./greetings.ts";
`,
	".stack/worker.ts": `import * as routes from "../src/worker/routes/index.ts";
export type AppRouter = typeof routes;
export default { fetch: (env: Env): string => env.GREETING };
`,
	"src/app/api.ts": `import type { AppRouter } from "../../.stack/worker";
import { createClient } from "../shared/rpc.ts";
const client = createClient<AppRouter>();
export const text: Promise<string> = client.greetings
	.hello({ name: "Ada" })
	.then((out) => out.text);
// @ts-expect-error: the input is typed
client.greetings.hello({ name: 1 });
// @ts-expect-error: the output is typed
export const count: Promise<number> = client.greetings.hello({ name: "Ada" });
`,
};

function consumer(
	files: Array<[string, string]>,
	fixture: Record<string, string>,
): string {
	const dir = mkdtempSync(join(tmpdir(), "stack-tsconfig-"));
	// `extends` and the ambient types resolve from the consumer's own
	// node_modules, as they would after `stack init`. Linked entry by entry,
	// so the build info `tsc -b` writes to `node_modules/.tmp` stays in the
	// fixture.
	mkdirSync(join(dir, "node_modules"));
	for (const entry of readdirSync(join(packageDir, "node_modules"))) {
		if (entry === ".tmp") continue;
		symlinkSync(
			join(packageDir, "node_modules", entry),
			join(dir, "node_modules", entry),
		);
	}
	for (const [path, content] of [...Object.entries(fixture), ...files]) {
		mkdirSync(dirname(join(dir, path)), { recursive: true });
		writeFileSync(join(dir, path), content);
	}
	return dir;
}

// Every diagnostic `tsc -b` reports over the root `tsconfig.json`: the root
// itself, or each project a solution references, built in reference order.
function diagnostics(dir: string): string[] {
	const found: string[] = [];
	const host = ts.createSolutionBuilderHost(ts.sys, undefined, (d) => {
		const where = d.file ? `${d.file.fileName.slice(dir.length + 1)}: ` : "";
		found.push(
			`${where}${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`,
		);
	});
	ts.createSolutionBuilder(host, [join(dir, "tsconfig.json")], {}).build();
	return found;
}

const split = () =>
	tsconfigTemplate({
		solid: true,
		native: false,
		worker: true,
		node: false,
		procedurePaths: { "virtual:stack-procedure": ["./.stack/procedure.ts"] },
		nativeTypes: [],
	});

test("an app with a worker type-checks each tree with its own globals", () => {
	assert.deepEqual(diagnostics(consumer(split(), GLOBALS)), []);
});

test("the app types a procedure's input and output through the worker's declarations", () => {
	assert.deepEqual(
		diagnostics(consumer(split(), { ...GLOBALS, ...ROUTER })),
		[],
	);
});

// The node target in miniature: the server's services and the worker read
// Node's globals, with no Workers declarations generated, and the app keeps
// the DOM. Each side names the other's global under an expected error, so a
// service landing in the app's program, or the DOM in the server's, fails.
const NODE: Record<string, string> = {
	"src/app/probe.ts": `document.body.append(document.createElement("div"));
`,
	"src/server/services/probe.ts": `export const port: string | undefined = process.env.PORT;
// @ts-expect-error: the DOM stays out of the server
document.title;
`,
	"src/worker/probe.ts": `export const host: string | undefined = process.env.HOST;
// @ts-expect-error: the DOM stays out of the worker
document.title;
`,
};

const nodeSplit = () =>
	tsconfigTemplate({
		...tsconfigLayout(["api", "node", "solid"]),
		procedurePaths: { "virtual:stack-procedure": ["./.stack/procedure.ts"] },
		nativeTypes: [],
	});

test("the node target's server project reads Node's globals and holds the services", () => {
	const worker = JSON.parse(
		new Map(nodeSplit()).get("tsconfig.worker.json") ?? "{}",
	);
	assert.deepEqual(worker.compilerOptions.types, ["node"]);
	assert.ok(worker.include.includes("src/server"));
	assert.ok(!worker.include.includes(".stack/worker-configuration.d.ts"));
	assert.deepEqual(diagnostics(consumer(nodeSplit(), NODE)), []);
});
