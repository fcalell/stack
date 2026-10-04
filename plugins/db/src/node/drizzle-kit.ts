import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { runCommand } from "./exec.ts";

// drizzle-kit is the plugin's own dependency, never the consumer's. Its
// `exports` lists `.` and `./api` only, so `drizzle-kit/bin.cjs` is not
// resolvable: resolve the package entry from this module and take the bin
// beside it, as a realpath so the probes below resolve from where
// drizzle-kit itself will.
export function drizzleKitBin(): string {
	const entry = createRequire(import.meta.url).resolve("drizzle-kit");
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

// Runs the plugin's drizzle-kit with node, cwd the consumer root:
// drizzle-kit resolves the config's `schema` and `out` against cwd.
export function runDrizzleKit(
	cwd: string,
	args: string[],
): { stdout: string; stderr: string } {
	const bin = drizzleKitBin();
	assertDrizzleOrm(bin);
	return runCommand(process.execPath, [bin, ...args], cwd);
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
