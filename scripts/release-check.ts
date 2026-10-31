// The check a release passes before anything is published (docs/architecture/releasing.md).
//
// It builds every package, packs the public ones, inspects the tarballs, installs consumer
// projects from those tarballs alone (so no workspace link and no registry copy of a stack
// package can stand in for a tarball), generates and builds them, counts the copies of each
// stack package the install holds, and ends with `pnpm -r publish --dry-run`. It publishes
// nothing, logs in nowhere and starts no server.
//
//   node scripts/release-check.ts [--out <dir>] [--only web,node,native] [--keep] [--no-build]
//
// `--out` is where the tarballs, the consumers and the logs go (a fresh directory under the
// system temp directory by default). `--keep` keeps each consumer's `node_modules`, which are
// removed after a consumer is checked to spare the disk. `--no-build` skips `turbo run build`
// when the packages are already built.

import { spawnSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

interface Consumer {
	name: string;
	plugins: string;
	// `stack build` runs for these; every consumer runs `stack generate`.
	build: boolean;
	// `tsc -b` runs for these. The native consumer is left out: plugin-auth's `src/expo.tsx`
	// imports the types of two optional peers the scaffold does not install.
	typecheck: boolean;
}

const CONSUMERS: Consumer[] = [
	{
		name: "web",
		plugins: "cloudflare,db,auth,api,vite,react,react-ui,screens",
		build: true,
		typecheck: true,
	},
	{
		name: "node",
		plugins: "node,db,auth,api,vite,react,react-ui",
		build: true,
		typecheck: true,
	},
	{
		name: "native",
		plugins: "expo,native-ui,db,auth,api,cloudflare",
		build: false,
		typecheck: false,
	},
];

const root = resolve(import.meta.dirname, "..");
const { values } = parseArgs({
	options: {
		out: { type: "string" },
		only: { type: "string" },
		keep: { type: "boolean", default: false },
		"no-build": { type: "boolean", default: false },
	},
});

const out = resolve(
	values.out ?? mkdtempSync(join(tmpdir(), "stack-release-check-")),
);
const tarballs = join(out, "tarballs");
const logs = join(out, "logs");
mkdirSync(tarballs, { recursive: true });
mkdirSync(logs, { recursive: true });

const failures: string[] = [];
const fail = (message: string): void => {
	failures.push(message);
	console.error(`FAIL ${message}`);
};

// Runs a command with its output in `logs/<log>.log`; a non-zero exit is a failure.
function run(
	log: string,
	command: string,
	args: string[],
	cwd: string = root,
): boolean {
	console.log(`$ ${command} ${args.join(" ")}   (${log}.log)`);
	const result = spawnSync(command, args, { cwd, encoding: "utf8" });
	writeFileSync(
		join(logs, `${log}.log`),
		`${result.stdout ?? ""}${result.stderr ?? ""}`,
	);
	if (result.status !== 0) {
		fail(
			`${command} ${args.join(" ")} exited ${result.status}, see ${log}.log`,
		);
		return false;
	}
	return true;
}

interface Manifest {
	name: string;
	version: string;
	private?: boolean;
	license?: string;
	repository?: { directory?: string };
	publishConfig?: { access?: string };
	bin?: Record<string, string>;
	exports?: Record<string, unknown>;
}

function walk(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
		entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
	);
}

// The leaves of an `exports` value: every file path it can resolve to.
function targets(value: unknown): string[] {
	if (typeof value === "string") return [value];
	if (value && typeof value === "object")
		return Object.values(value).flatMap(targets);
	return [];
}

// ---------------------------------------------------------------- build and pack

if (!values["no-build"]) run("build", "pnpm", ["turbo", "run", "build"]);

const packed = run("pack", "pnpm", [
	"-r",
	"--filter",
	"./packages/*",
	"--filter",
	"./plugins/*",
	"pack",
	"--pack-destination",
	tarballs,
]);

// ---------------------------------------------------------------- the tarballs

const unpacked = join(out, "unpacked");
const seen: Manifest[] = [];
const rows: string[] = [];
for (const file of packed
	? readdirSync(tarballs)
			.filter((f) => f.endsWith(".tgz"))
			.sort()
	: []) {
	const dir = join(unpacked, file.replace(/\.tgz$/, ""));
	mkdirSync(dir, { recursive: true });
	run(`untar-${file}`, "tar", ["-xzf", join(tarballs, file), "-C", dir]);
	const pkgDir = join(dir, "package");
	const manifest = JSON.parse(
		readFileSync(join(pkgDir, "package.json"), "utf8"),
	) as Manifest;
	seen.push(manifest);
	const files = walk(pkgDir).map((f) => f.slice(pkgDir.length + 1));
	const label = manifest.name;

	if (manifest.private) fail(`${label} is private`);
	if (manifest.license !== "MIT") fail(`${label} has no MIT license field`);
	if (!files.includes("LICENSE")) fail(`${label} ships no LICENSE`);
	if (!manifest.repository?.directory)
		fail(`${label} has no repository.directory`);
	if (manifest.publishConfig?.access !== "public")
		fail(`${label} has no publishConfig.access "public"`);
	if (/workspace:/.test(JSON.stringify(manifest)))
		fail(`${label} keeps a workspace: range after pack`);
	if (files.some((f) => /\.test\./.test(f))) fail(`${label} ships a test file`);
	for (const bin of Object.values(manifest.bin ?? {})) {
		if (!files.includes(bin.replace(/^\.\//, "")))
			fail(`${label} bin ${bin} is not in the tarball`);
	}
	for (const [key, value] of Object.entries(manifest.exports ?? {})) {
		for (const target of targets(value)) {
			const path = target.replace(/^\.\//, "");
			const present = path.includes("*")
				? files.some((f) => matchesPattern(path, f))
				: files.includes(path);
			if (!present) fail(`${label} exports ${key} -> ${target} is missing`);
		}
	}
	rows.push(
		`${label}@${manifest.version}  ${statSync(join(tarballs, file)).size} bytes  ${files.length} files`,
	);
}

function matchesPattern(pattern: string, file: string): boolean {
	const [head = "", tail = ""] = pattern.split("*");
	return file.startsWith(head) && file.endsWith(tail);
}

if (new Set(seen.map((m) => m.version)).size > 1)
	fail("the public packages are not at one version");

console.log("\nTarballs");
for (const row of rows) console.log(`  ${row}`);

// ---------------------------------------------------------------- the consumers

// Snapshots of each stack package in a lockfile: one per peer variant. Two of a package
// split the slot graph (`Slot '…' is defined twice`).
function copies(lockfile: string): Map<string, number> {
	const text = readFileSync(lockfile, "utf8");
	const snapshots = text.split("\nsnapshots:\n")[1] ?? "";
	const counts = new Map<string, number>();
	for (const line of snapshots.split("\n")) {
		const match = /^ {2}'?(@fcalell\/[a-z-]+)@/.exec(line);
		if (match?.[1]) counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
	}
	return counts;
}

const only = values.only?.split(",");
const cli = join(root, "packages/cli/dist/cli.js");
const consumersDir = join(out, "consumers");
for (const consumer of CONSUMERS) {
	if (!packed || (only && !only.includes(consumer.name))) continue;
	console.log(`\nConsumer ${consumer.name}: ${consumer.plugins}`);
	const dir = join(consumersDir, consumer.name);
	rmSync(dir, { recursive: true, force: true });
	mkdirSync(dir, { recursive: true });
	// Each stack package, direct or not, resolves to its tarball: what the registry will serve.
	const overrides = seen
		.map(
			(m) =>
				`  "${m.name}": "file:${join(tarballs, `${m.name.replace("@", "").replace("/", "-")}-${m.version}.tgz`)}"`,
		)
		.join("\n");
	writeFileSync(
		join(dir, "pnpm-workspace.yaml"),
		`overrides:\n${overrides}\nblockExoticSubdeps: false\n`,
	);
	const name = `consumer-${consumer.name}`;
	let ok = run(
		`${name}-init`,
		"node",
		[cli, "init", ".", "--plugins", consumer.plugins, "-y", "--force"],
		dir,
	);
	if (ok) {
		// A clean install from the lockfile init wrote: no directory left from its first passes.
		rmSync(join(dir, "node_modules"), { recursive: true, force: true });
		ok = run(`${name}-install`, "pnpm", ["install", "--frozen-lockfile"], dir);
	}
	if (ok)
		ok = run(`${name}-generate`, "pnpm", ["exec", "stack", "generate"], dir);
	if (ok && consumer.build)
		ok = run(`${name}-build`, "pnpm", ["exec", "stack", "build"], dir);
	if (ok && consumer.typecheck)
		ok = run(`${name}-types`, "pnpm", ["check-types"], dir);
	if (ok) {
		const counts = copies(join(dir, "pnpm-lock.yaml"));
		const installed = readdirSync(join(dir, "node_modules/@fcalell")).sort();
		for (const [pkg, n] of counts)
			if (n !== 1) fail(`${consumer.name}: ${n} copies of ${pkg}`);
		console.log(
			`  ${installed.length} stack packages in node_modules/@fcalell, ${counts.size} in the lockfile, ${[...counts.values()].every((n) => n === 1) ? "one copy each" : "MORE THAN ONE COPY"}`,
		);
	}
	if (!values.keep)
		rmSync(join(dir, "node_modules"), { recursive: true, force: true });
}

// ---------------------------------------------------------------- the dry run

// `--no-git-checks`: the dry run may run on any branch and with a dirty tree; the real publish
// leaves the flag off.
run("publish-dry-run", "pnpm", [
	"-r",
	"publish",
	"--dry-run",
	"--no-git-checks",
]);

console.log(`\nLogs and tarballs: ${out}`);
if (failures.length > 0) {
	console.error(`\n${failures.length} failure(s)`);
	process.exit(1);
}
console.log("Release check passed.");
