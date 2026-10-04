import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import {
	dirname,
	isAbsolute,
	join,
	matchesGlob,
	posix,
	relative,
	sep,
} from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { pnpmWorkspaceTemplate } from "../templates/pnpm-workspace.ts";
import { StackError } from "./errors.ts";
import { isStackPackage } from "./stack-packages.ts";

// This package's root, from `src/lib/` or `dist/lib/`.
const CLI_DIR = fileURLToPath(new URL("../..", import.meta.url));

type Manifest = Record<string, unknown> & {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
};

// Brings the app's install in line with the stack packages its `package.json`
// names, then installs. Inside the pnpm workspace this CLI belongs to, each is
// the workspace's own package (`workspace:*`) and the workspace root installs;
// elsewhere `pnpm-workspace.yaml` takes each from stack's repository.
export function installStack(cwd: string): void {
	const pkgPath = join(cwd, "package.json");
	const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as Manifest;
	const workspace = stackWorkspaceRoot(cwd);
	// Every writer of a stack spec (init, add, a plugin's `dependencies`) writes
	// the GitHub one; both install modes settle the specs here.
	if (workspace) {
		const next = JSON.stringify(toWorkspaceSpecs(pkg), null, "\t");
		if (next !== JSON.stringify(pkg, null, "\t")) {
			writeFileSync(pkgPath, `${next}\n`);
		}
	} else {
		const names = Object.keys({
			...pkg.dependencies,
			...pkg.devDependencies,
		}).filter(isStackPackage);
		const workspacePath = join(cwd, "pnpm-workspace.yaml");
		writeFileSync(
			workspacePath,
			pnpmWorkspaceTemplate(
				existsSync(workspacePath) ? readFileSync(workspacePath, "utf8") : null,
				names,
			),
		);
	}
	const result = spawnSync("pnpm", ["install"], {
		cwd: workspace ?? cwd,
		stdio: "inherit",
	});
	if (result.status !== 0) {
		throw new StackError(
			`pnpm install failed (exit ${result.status ?? "signal"}).`,
			"INSTALL_FAILED",
		);
	}
}

// The manifest with every stack package taken from the workspace.
export function toWorkspaceSpecs(pkg: Manifest): Manifest {
	const rewrite = (deps?: Record<string, string>) =>
		deps &&
		Object.fromEntries(
			Object.entries(deps).map(([name, spec]) => [
				name,
				isStackPackage(name) ? "workspace:*" : spec,
			]),
		);
	return {
		...pkg,
		dependencies: rewrite(pkg.dependencies),
		devDependencies: rewrite(pkg.devDependencies),
	};
}

// The root of the pnpm workspace `dir` belongs to, when the CLI at `cliDir`
// is a project of that workspace too. pnpm takes the nearest
// `pnpm-workspace.yaml` above a directory as its workspace, whose `packages`
// globs name the projects.
export function stackWorkspaceRoot(
	dir: string,
	cliDir: string = CLI_DIR,
): string | null {
	const target = realpathSync(dir);
	let root = target;
	while (!existsSync(join(root, "pnpm-workspace.yaml"))) {
		const parent = dirname(root);
		if (parent === root) return null;
		root = parent;
	}
	const manifest = parse(
		readFileSync(join(root, "pnpm-workspace.yaml"), "utf8"),
	) as { packages?: string[] } | null;
	// pnpm accepts `./apps/*`, `..` segments and repeated slashes.
	const globs = (manifest?.packages ?? []).map((p) => ({
		exclude: p.startsWith("!"),
		glob: posix.normalize(p.replace(/^!/, "")),
	}));
	const isProject = (path: string): boolean => {
		const rel = relative(root, path);
		if (rel.startsWith("..") || isAbsolute(rel)) return false;
		const project = rel.split(sep).join("/");
		const matches = (exclude: boolean) =>
			globs.some((g) => g.exclude === exclude && matchesGlob(project, g.glob));
		return matches(false) && !matches(true);
	};
	return isProject(target) && isProject(realpathSync(cliDir)) ? root : null;
}
