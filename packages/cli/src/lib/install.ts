import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import {
	dirname,
	isAbsolute,
	join,
	matchesGlob,
	posix,
	relative,
	resolve,
	sep,
} from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { pnpmWorkspaceTemplate } from "../templates/pnpm-workspace.ts";
import { StackError } from "./errors.ts";
import {
	isStackPackage,
	pinnedCommit,
	STACK_PACKAGES,
	type StackPackage,
	stackSpecMode,
} from "./stack-packages.ts";

// This package's root, from `src/lib/` or `dist/lib/`.
const CLI_DIR = fileURLToPath(new URL("../..", import.meta.url));

type Manifest = Record<string, unknown> & {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
};

// The commit the app's stack specs pin, read off its `package.json`.
export function pinnedStackCommit(cwd: string): string | null {
	const pkg = JSON.parse(
		readFileSync(join(cwd, "package.json"), "utf8"),
	) as Manifest;
	return pinnedCommit({ ...pkg.dependencies, ...pkg.devDependencies });
}

// Brings the app's install in line with the stack packages its `package.json`
// names, then installs. Inside the pnpm workspace this CLI belongs to, each is
// the workspace's own package (`workspace:*`) and the workspace root installs;
// an app that links a stack checkout (`@fcalell/cli` as `link:`) links each
// from that checkout; elsewhere each is an npm version range and
// `pnpm-workspace.yaml` carries only the third-party build verdicts. Only an
// unpublished CLI (version 0.0.0) takes each from stack's repository instead,
// with `pnpm-workspace.yaml` overriding each to its spec, at the commit the
// app's specs pin when they pin one. The yaml and the install belong to the
// app's own pnpm workspace when it is a project of one (a consumer monorepo),
// else to the app.
export function installStack(cwd: string): void {
	const pkgPath = join(cwd, "package.json");
	const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as Manifest;
	const workspace = stackWorkspaceRoot(cwd);
	const checkout = linkedCheckout(pkg, cwd);
	const root = pnpmWorkspaceRoot(cwd) ?? cwd;
	// Every writer of a stack spec (init, add, a plugin's `dependencies`) writes
	// the npm or GitHub one; the workspace and link modes settle the specs here.
	const settled = workspace
		? toWorkspaceSpecs(pkg)
		: checkout
			? toLinkSpecs(pkg, cwd, checkout)
			: pkg;
	const next = JSON.stringify(settled, null, "\t");
	if (next !== JSON.stringify(pkg, null, "\t")) {
		writeFileSync(pkgPath, `${next}\n`);
	}
	// Inside the workspace its root carries the build verdicts by hand.
	if (!workspace) {
		const names = Object.keys({
			...pkg.dependencies,
			...pkg.devDependencies,
		}).filter(isStackPackage);
		const workspacePath = join(root, "pnpm-workspace.yaml");
		writeFileSync(
			workspacePath,
			pnpmWorkspaceTemplate(
				existsSync(workspacePath) ? readFileSync(workspacePath, "utf8") : null,
				names,
				checkout ? "link" : stackSpecMode(),
				pinnedCommit({ ...pkg.dependencies, ...pkg.devDependencies }),
			),
		);
	}
	const result = spawnSync("pnpm", ["install"], {
		cwd: workspace ?? root,
		stdio: "inherit",
	});
	if ((result.error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
		throw new StackError(
			"pnpm is not installed; install it with `corepack enable` or `npm i -g pnpm`.",
			"INSTALL_FAILED",
		);
	}
	if (result.status !== 0) {
		throw new StackError(
			`pnpm install failed (exit ${result.status ?? "signal"}).`,
			"INSTALL_FAILED",
		);
	}
}

// The manifest with every stack package's spec given by `spec`.
function withStackSpecs(
	pkg: Manifest,
	spec: (name: StackPackage) => string,
): Manifest {
	const rewrite = (deps?: Record<string, string>) =>
		deps &&
		Object.fromEntries(
			Object.entries(deps).map(([name, current]) => [
				name,
				isStackPackage(name) ? spec(name) : current,
			]),
		);
	return {
		...pkg,
		dependencies: rewrite(pkg.dependencies),
		devDependencies: rewrite(pkg.devDependencies),
	};
}

// The manifest with every stack package taken from the workspace.
export function toWorkspaceSpecs(pkg: Manifest): Manifest {
	return withStackSpecs(pkg, () => "workspace:*");
}

// The manifest with every stack package linked from the checkout at
// `checkout`, by its path relative to the app.
function toLinkSpecs(pkg: Manifest, cwd: string, checkout: string): Manifest {
	return withStackSpecs(
		pkg,
		(name) =>
			`link:${relative(cwd, join(checkout, STACK_PACKAGES[name].dir)).split(sep).join("/")}`,
	);
}

// The root of the stack checkout the app links, read off its `@fcalell/cli`
// spec (`link:../stack/packages/cli` is `../stack`); null when the app does
// not link the CLI.
function linkedCheckout(pkg: Manifest, cwd: string): string | null {
	const spec = {
		...pkg.dependencies,
		...pkg.devDependencies,
	}["@fcalell/cli"];
	if (!spec?.startsWith("link:")) return null;
	const cli = resolve(cwd, spec.slice("link:".length));
	return resolve(
		cli,
		...STACK_PACKAGES["@fcalell/cli"].dir.split("/").map(() => ".."),
	);
}

// The root of the pnpm workspace `dir` is a project of, with the test of
// whether a path is one of its projects. pnpm takes the nearest
// `pnpm-workspace.yaml` above a directory as its workspace, whose `packages`
// globs name the projects; null when none is above `dir` or `dir` is not a
// project of it.
function workspaceOf(
	dir: string,
): { root: string; isProject: (path: string) => boolean } | null {
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
	return isProject(target) ? { root, isProject } : null;
}

// The root of the pnpm workspace `dir` is a project of (a consumer monorepo
// whose `packages` globs name the app), or null when the app is its own root.
export function pnpmWorkspaceRoot(dir: string): string | null {
	return workspaceOf(dir)?.root ?? null;
}

// The root of the pnpm workspace `dir` belongs to, when the CLI at `cliDir`
// is a project of that workspace too: stack's own checkout.
export function stackWorkspaceRoot(
	dir: string,
	cliDir: string = CLI_DIR,
): string | null {
	const workspace = workspaceOf(dir);
	return workspace?.isProject(realpathSync(cliDir)) ? workspace.root : null;
}
