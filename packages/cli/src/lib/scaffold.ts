import {
	appendFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

export function writeIfMissing(path: string, content: string): boolean {
	if (existsSync(path)) {
		console.log(`  ${path} already exists, skipping`);
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
		console.log(`\nCreated: ${created.join(", ")}`);
	}
}

export function requireFeature(label: string, ok: boolean, hint: string): void {
	if (!ok) {
		console.error(`${label} is not configured. ${hint}`);
		process.exit(1);
	}
}

export function skipIfConfigured(label: string, configured: boolean): boolean {
	if (configured) {
		console.log(`${label} is already configured.`);
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
