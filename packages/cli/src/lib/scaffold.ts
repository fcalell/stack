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
import type { ScaffoldSpec } from "#ast";
import { ScaffoldError } from "#lib/errors";

// Legacy accommodation for the CLI's own base-file templates (package.json,
// tsconfig.json, biome.json, .gitignore, stack.config.ts). Base templates are
// dynamic and return strings; they are not contributed via Init.Scaffold, so
// they do not flow through writeScaffoldSpecs. Plugin-contributed scaffolds
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

		const content = await readFile(spec.source, "utf8");
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

export function requireFeature(label: string, ok: boolean, hint: string): void {
	if (!ok) {
		throw new ScaffoldError(`${label} is not configured. ${hint}`);
	}
}

export function skipIfConfigured(label: string, configured: boolean): boolean {
	if (configured) {
		log.info(`${label} is already configured.`);
		return true;
	}
	return false;
}

export function ensureDir(path: string): boolean {
	if (existsSync(path)) return false;
	mkdirSync(path, { recursive: true });
	return true;
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
	scripts?: Record<string, string>;
}

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

	for (const field of ["imports", "dependencies", "scripts"] as const) {
		const additions = patch[field];
		if (!additions) continue;
		const existing = (pkg[field] ?? {}) as Record<string, string>;
		const missing = Object.entries(additions).filter(([k]) => !(k in existing));
		if (missing.length > 0) {
			pkg[field] = { ...existing, ...Object.fromEntries(missing) };
			changed = true;
		}
	}

	if (changed) {
		writeFileSync(pkgPath, `${JSON.stringify(pkg, null, "\t")}\n`);
	}
}
