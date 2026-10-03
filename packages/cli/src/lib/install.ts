import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pnpmWorkspaceTemplate } from "../templates/pnpm-workspace.ts";
import { StackError } from "./errors.ts";
import { isStackPackage } from "./stack-packages.ts";

// Brings `pnpm-workspace.yaml` in line with the stack packages `package.json`
// names, then installs.
export function installStack(cwd: string): void {
	const pkg = JSON.parse(readFileSync(join(cwd, "package.json"), "utf8")) as {
		dependencies?: Record<string, string>;
		devDependencies?: Record<string, string>;
	};
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
	const result = spawnSync("pnpm", ["install"], { cwd, stdio: "inherit" });
	if (result.status !== 0) {
		throw new StackError(
			`pnpm install failed (exit ${result.status ?? "signal"}).`,
			"INSTALL_FAILED",
		);
	}
}
