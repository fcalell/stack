import { existsSync, mkdirSync } from "node:fs";
import { basename, resolve } from "node:path";
import { log, outro } from "@clack/prompts";
import { StackError } from "../lib/errors.ts";
import { stackWorkspaceRoot } from "../lib/install.ts";
import { writeIfMissingString } from "../lib/scaffold.ts";
import {
	pluginIndexTemplate,
	pluginPackageJsonTemplate,
	pluginReadmeTemplate,
	pluginRuntimeTemplate,
	pluginTsconfigBuildTemplate,
	pluginTsconfigTemplate,
} from "../templates/plugin.ts";
import { pnpmWorkspaceTemplate } from "../templates/pnpm-workspace.ts";

export interface InitPluginOptions {
	name: string;
	package?: string;
	dir?: string;
}

export interface PluginFilesOptions {
	name: string;
	packageName: string;
	// The plugin sits in stack's own workspace, which installs it: no
	// `pnpm-workspace.yaml` of its own.
	workspace: boolean;
}

// The plugin skeleton's files, by path relative to its directory.
export function pluginFiles(
	options: PluginFilesOptions,
): Array<[string, string]> {
	const { name, packageName, workspace } = options;
	const label = name
		.split("-")
		.map((part) => (part ? part[0]?.toUpperCase() + part.slice(1) : part))
		.join(" ");
	const files: Array<[string, string]> = [
		[
			"package.json",
			pluginPackageJsonTemplate({ name, packageName, workspace }),
		],
		["tsconfig.json", pluginTsconfigTemplate()],
		["tsconfig.build.json", pluginTsconfigBuildTemplate()],
		["src/index.ts", pluginIndexTemplate({ name, packageName, label })],
		["src/worker/index.ts", pluginRuntimeTemplate({ name })],
		["README.md", pluginReadmeTemplate({ name, packageName, label })],
	];
	if (!workspace) {
		files.push([
			"pnpm-workspace.yaml",
			pnpmWorkspaceTemplate(null, [
				"@fcalell/cli",
				"@fcalell/typescript-config",
			]),
		]);
	}
	return files;
}

// Scaffolds a minimal, working plugin skeleton that a third-party author can
// publish as-is. Mirrors the conventions documented in .helm/agents/conventions.md:
// subpath exports for "." and "./runtime", and no barrel index. Inside stack's
// own workspace it takes each stack package from the workspace, as `stack
// init` does for an app.
export async function initPlugin(options: InitPluginOptions): Promise<void> {
	const name = options.name.trim();
	if (!name) {
		throw new StackError(
			"Plugin name is required. Usage: stack plugin init <name>",
			"PLUGIN_INIT_INVALID_NAME",
		);
	}

	if (!/^[a-z][a-z0-9-]*$/.test(name)) {
		throw new StackError(
			`Invalid plugin name: "${name}". Use lowercase letters, digits, and dashes (e.g. "my-plugin").`,
			"PLUGIN_INIT_INVALID_NAME",
		);
	}

	const packageName = options.package ?? `stack-plugin-${name}`;
	const targetDir = options.dir
		? resolve(options.dir)
		: resolve(process.cwd(), "plugins", name);

	if (!existsSync(targetDir)) {
		mkdirSync(targetDir, { recursive: true });
	}
	const workspace = stackWorkspaceRoot(targetDir) !== null;

	const original = process.cwd();
	process.chdir(targetDir);

	try {
		const created: string[] = [];
		for (const [path, content] of pluginFiles({
			name,
			packageName,
			workspace,
		})) {
			if (writeIfMissingString(path, content)) created.push(path);
		}

		if (created.length === 0) {
			log.info(
				`No files created — ${basename(targetDir)} already contains a plugin.`,
			);
			return;
		}

		log.success(`Scaffolded ${packageName} in ${targetDir}`);
		log.info(
			[
				`Next steps:`,
				`  cd ${targetDir}`,
				`  pnpm install`,
				`  pnpm check`,
			].join("\n"),
		);
		outro(`Done!`);
	} finally {
		process.chdir(original);
	}
}
