import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * The modules of a directory, by file name without the extension: a registry the code does not
 * list by hand (`jobs/*.ts`, `importers/*.ts`). The directory is `new URL("./dir/", import.meta.url)`,
 * written in the call: `stack build` reads that argument and imports the directory's modules into
 * the bundle, where a listing at run time would find no directory. A test, a declaration and an
 * `index` are not modules.
 */
export async function loadModules(
	directory: URL,
): Promise<Record<string, Record<string, unknown>>> {
	const dir = fileURLToPath(directory);
	const names = readdirSync(dir)
		.filter(
			(file) =>
				/\.(ts|mts)$/.test(file) &&
				!/\.d\.m?ts$/.test(file) &&
				!/\.test\.m?ts$/.test(file) &&
				!/^index\.m?ts$/.test(file),
		)
		.sort();
	const out: Record<string, Record<string, unknown>> = {};
	for (const file of names) {
		out[file.replace(/\.m?ts$/, "")] = (await import(
			pathToFileURL(`${dir}${dir.endsWith("/") ? "" : "/"}${file}`).href
		)) as Record<string, unknown>;
	}
	return out;
}
