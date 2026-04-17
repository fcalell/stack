import {
	appendFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { log } from "@clack/prompts";
import { ScaffoldError } from "#lib/errors";

export function writeIfMissing(path: string, content: string): boolean {
	if (existsSync(path)) {
		log.info(`${path} already exists, skipping`);
		return false;
	}
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, content);
	return true;
}

export function scaffoldFiles(
	entries: ReadonlyArray<readonly [path: string, content: string]>,
): string[] {
	const created: string[] = [];
	for (const [path, content] of entries) {
		if (writeIfMissing(path, content)) created.push(path);
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
