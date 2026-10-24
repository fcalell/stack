import { isAbsolute, relative, resolve, sep } from "node:path";
import { StackError } from "./errors.ts";

// Resolves `path` against `cwd` and answers the absolute path, refusing one
// that is the project root itself or lies outside it. Contributed paths
// (`removeFiles`, artifact `path`) are written and deleted, so a `..` segment
// or an absolute path must never reach the filesystem.
export function insideProject(cwd: string, path: string): string {
	const absolute = resolve(cwd, path);
	const rel = relative(cwd, absolute);
	if (
		rel === "" ||
		rel === ".." ||
		rel.startsWith(`..${sep}`) ||
		isAbsolute(rel)
	) {
		throw new StackError(
			`Refusing path "${path}": it is not inside the project (${cwd}).`,
			"PATH_OUTSIDE_PROJECT",
		);
	}
	return absolute;
}
