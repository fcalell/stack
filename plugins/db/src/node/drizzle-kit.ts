import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { runCommand } from "./exec.ts";

// drizzle-kit is the plugin's optional peer: the app declares it as a
// devDependency (`stack init` and `stack add db` write it), so an install that
// only runs the app holds none of it. Its `exports` lists `.` and `./api`
// only, so `drizzle-kit/bin.cjs` is not resolvable: resolve the package entry
// from this module and take the bin beside it, as a realpath so the probes
// below resolve from where drizzle-kit itself will.
export function drizzleKitBin(): string {
	let entry: string;
	try {
		entry = createRequire(import.meta.url).resolve("drizzle-kit");
	} catch {
		throw new Error(
			"drizzle-kit is not installed: the db commands run it. Add it to the app's devDependencies (`pnpm add -D drizzle-kit`).",
		);
	}
	return join(dirname(realpathSync(entry)), "bin.cjs");
}

// drizzle-kit declares no drizzle-orm and `import()`s it from its own
// location; without one it prints an install hint and exits 1. Resolving is
// the check drizzle-kit makes, so nothing is executed here.
function assertDrizzleOrm(bin: string): void {
	try {
		createRequire(bin).resolve("drizzle-orm/version");
	} catch {
		throw new Error(
			`drizzle-orm is not resolvable from drizzle-kit (${dirname(bin)}). Declare drizzle-orm at the project root, or restore pnpm's hoist (node_modules/.pnpm/node_modules), then retry.`,
		);
	}
}

// drizzle-kit exits 0 even when its sqlite driver fails to load, so a broken
// push or migrate would report success. Load the driver from drizzle-kit's
// location up front and fail with the fix instead. drizzle-kit declares no
// better-sqlite3 and loads whichever copy pnpm hoists: plugin-db's 13, which
// ships prebuilt binaries, or better-auth's 12 peer, built by its install script.
export function assertSqliteDriver(): void {
	const requireFromKit = createRequire(drizzleKitBin());
	try {
		// Constructing a Database is the real probe: the binding loads
		// lazily, so a bare require() passes even with no binary.
		const Database = requireFromKit("better-sqlite3");
		new Database(":memory:").close();
	} catch (err) {
		const detail =
			err instanceof Error ? err.message.split("\n")[0] : String(err);
		throw new Error(
			`better-sqlite3 failed to load from drizzle-kit (${detail}). Build its binding: approve the build (allowBuilds: better-sqlite3: true in pnpm-workspace.yaml) and run \`pnpm rebuild better-sqlite3\`, then retry.`,
		);
	}
}

// drizzle-kit asks, per table or column the schema creates while another is
// dropped, whether it is a rename. Its prompt needs a TTY, which a child with
// piped output never has, so it fails and drizzle-kit still exits 0. The
// answer is always the first choice, "create": a rename is an add and a drop,
// never an in-place rename, because the worker live during a deploy still
// reads the old name (guide/destructive-change.md), and the drop is then
// behind the migration check's `-- stack:allow-destructive`. This preload
// makes the child's streams look like a terminal and presses Enter as each
// prompt starts listening; a run with no ambiguity never prompts.
const ANSWER_CREATE = `process.stdin.isTTY = true;
process.stdout.isTTY = true;
if (!process.stdin.setRawMode) process.stdin.setRawMode = () => process.stdin;
const on = process.stdin.on;
process.stdin.on = function (event, listener) {
	const result = on.call(this, event, listener);
	if (event === "keypress") {
		setImmediate(() => this.emit("keypress", "\\r", { name: "return", sequence: "\\r" }));
	}
	return result;
};
`;

// drizzle-kit reports most failures as an `Error:` on stderr and exits 0, so
// a failed generate would pass for "no changes". Treat that text as the
// failure it is.
const FAILED = /^\s*(?:[A-Za-z]*Error\b|ERROR\b)/m;

// Runs the plugin's drizzle-kit with node, cwd the consumer root:
// drizzle-kit resolves the config's `schema` and `out` against cwd.
// `createOnConflict` answers its rename prompts with "create" (see above);
// `generate` and the drift check set it, `push` does not (its prompts also
// confirm data loss, which only a person answers).
export function runDrizzleKit(
	cwd: string,
	args: string[],
	{ createOnConflict = false }: { createOnConflict?: boolean } = {},
): { stdout: string; stderr: string } {
	const bin = drizzleKitBin();
	assertDrizzleOrm(bin);
	let node = [bin, ...args];
	if (createOnConflict) {
		const preload = join(cwd, ".db-kit", "answer-create.cjs");
		mkdirSync(dirname(preload), { recursive: true });
		writeFileSync(preload, ANSWER_CREATE, "utf-8");
		node = ["--require", preload, ...node];
	}
	const result = runCommand(process.execPath, node, cwd);
	if (FAILED.test(result.stderr) || FAILED.test(result.stdout)) {
		throw new Error(
			`Command failed: drizzle-kit ${args.join(" ")}\n${result.stderr || result.stdout}`,
		);
	}
	return result;
}

interface DrizzleConfig {
	schema: string;
	out?: string;
	dbCredentials?: { url: string };
	tablesFilter?: string[];
}

// A plain object with no import line: drizzle-kit loads the file with
// `require` and takes `default ?? module`, and an import of its
// `defineConfig` (the identity function) would resolve from the consumer,
// which holds no drizzle-kit. Paths stay
// relative to cwd: drizzle-kit 0.31 mangles an absolute `out`.
export function writeDrizzleConfig(
	configPath: string,
	config: DrizzleConfig,
): void {
	mkdirSync(dirname(configPath), { recursive: true });
	const body = JSON.stringify({ dialect: "sqlite", ...config }, null, "\t");
	writeFileSync(configPath, `export default ${body};\n`, "utf-8");
}
