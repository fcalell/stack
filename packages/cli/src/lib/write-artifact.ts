import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

// Write one generated file so a process watching it under `stack dev` (wrangler
// on `.stack/wrangler.toml`, Vite on `.stack/vite.config.ts`) never reads it
// empty or half-written, and never sees it change when nothing did. A file
// whose content is already on disk is left alone (mtime and inode kept, so no
// watcher fires); a changed one is written whole to a sibling temporary file
// and renamed over the target, which replaces it in one step. A plain
// `writeFile` truncates the target first, and wrangler reading its config in
// that window exits with "Missing entry-point" and is not restarted.
// Returns whether the file was written.
export async function writeArtifact(
	absPath: string,
	content: string,
): Promise<boolean> {
	const current = await readFile(absPath, "utf-8").catch(() => null);
	if (current === content) return false;
	await mkdir(dirname(absPath), { recursive: true });
	const temp = join(
		dirname(absPath),
		`.${basename(absPath)}.${process.pid}.tmp`,
	);
	try {
		await writeFile(temp, content);
		await rename(temp, absPath);
	} catch (err) {
		await rm(temp, { force: true });
		throw err;
	}
	return true;
}
