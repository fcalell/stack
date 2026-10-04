import {
	appendFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { log } from "@clack/prompts";
import type { ScaffoldSpec } from "../ast/index.ts";
import { ScaffoldError } from "./errors.ts";

// Legacy accommodation for the CLI's own base-file templates (package.json,
// tsconfig.json, biome.json, .gitignore, stack.config.ts). Base templates are
// dynamic and return strings; they are not contributed via cliSlots.initScaffolds,
// so they do not flow through writeScaffoldSpecs. Plugin-contributed scaffolds
// must go through ScaffoldSpec + writeScaffoldSpecs — do not reach for this
// helper for plugin-driven content.
export function writeIfMissingString(path: string, content: string): boolean {
	if (existsSync(path)) {
		log.info(`${path} already exists, skipping`);
		return false;
	}
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, content);
	return true;
}

export async function writeScaffoldSpecs(
	specs: ScaffoldSpec[],
	cwd: string,
): Promise<string[]> {
	// Duplicate-target detection runs BEFORE any writes. Two plugins that
	// claim the same scaffold target is a programming error — the old
	// "last writer wins" behaviour silently dropped contributions.
	const seen = new Map<string, string>();
	for (const spec of specs) {
		const prior = seen.get(spec.target);
		if (prior !== undefined) {
			throw new ScaffoldError(
				`Duplicate scaffold target "${spec.target}" contributed by plugin-${prior} and plugin-${spec.plugin}`,
				spec.target,
			);
		}
		seen.set(spec.target, spec.plugin);
	}

	const created: string[] = [];
	for (const spec of specs) {
		const absTarget = resolve(cwd, spec.target);
		if (existsSync(absTarget)) continue;

		const content = spec.source
			? await readFile(spec.source, "utf8")
			: spec.content;
		await mkdir(dirname(absTarget), { recursive: true });
		await writeFile(absTarget, content);
		created.push(spec.target);
	}
	return created;
}

export function announceCreated(created: readonly string[]): void {
	if (created.length > 0) {
		log.success(`Created: ${created.join(", ")}`);
	}
}

export function ensureGitignore(...entries: string[]): boolean {
	const gitignorePath = join(process.cwd(), ".gitignore");
	let added = false;

	if (existsSync(gitignorePath)) {
		const content = readFileSync(gitignorePath, "utf-8");
		const missing = entries.filter((e) => !content.includes(e));
		if (missing.length > 0) {
			appendFileSync(gitignorePath, `\n${missing.join("\n")}\n`);
			added = true;
		}
	} else {
		writeFileSync(
			gitignorePath,
			`${["node_modules", "dist", ...entries].join("\n")}\n`,
		);
		added = true;
	}
	return added;
}

export interface PackageJsonPatch {
	imports?: Record<string, string>;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	scripts?: Record<string, string>;
	// Arbitrary top-level fields (e.g. Expo's `main`). Written only when the key
	// is absent, so a consumer-customized value is never overwritten.
	fields?: Record<string, unknown>;
}

const DEPENDENCY_FIELDS: readonly string[] = [
	"dependencies",
	"devDependencies",
];

export function patchPackageJson(cwd: string, patch: PackageJsonPatch): void {
	const pkgPath = join(cwd, "package.json");
	if (!existsSync(pkgPath)) {
		log.warn("No package.json found — skipping dependency setup.");
		return;
	}

	const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as Record<
		string,
		unknown
	>;
	let changed = false;
	const entries = (field: string) =>
		(pkg[field] ?? {}) as Record<string, string>;
	// A package either dependency field declares is present in both, so no
	// name is declared twice.
	const present = (field: string, name: string) =>
		DEPENDENCY_FIELDS.includes(field)
			? DEPENDENCY_FIELDS.some((f) => name in entries(f))
			: name in entries(field);

	for (const field of [
		"imports",
		"dependencies",
		"devDependencies",
		"scripts",
	] as const) {
		const additions = patch[field];
		if (!additions) continue;
		const existing = entries(field);
		const missing = Object.entries(additions).filter(
			([k]) => !present(field, k),
		);
		if (missing.length > 0) {
			const merged = [...Object.entries(existing), ...missing];
			// Dependency maps stay sorted by name, as the template writes them.
			if (DEPENDENCY_FIELDS.includes(field)) {
				merged.sort(([a], [b]) => a.localeCompare(b));
			}
			pkg[field] = Object.fromEntries(merged);
			changed = true;
		}
	}

	if (patch.fields) {
		for (const [key, value] of Object.entries(patch.fields)) {
			if (key in pkg) continue;
			pkg[key] = value;
			changed = true;
		}
	}

	if (changed) {
		writeFileSync(pkgPath, `${JSON.stringify(pkg, null, "\t")}\n`);
	}
}
