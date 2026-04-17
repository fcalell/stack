import { existsSync, mkdirSync } from "node:fs";
import { basename, resolve } from "node:path";
import { log, outro } from "@clack/prompts";
import { StackError } from "#lib/errors";
import { scaffoldFiles } from "#lib/scaffold";
import {
	pluginIndexTemplate,
	pluginIndexTestTemplate,
	pluginPackageJsonTemplate,
	pluginReadmeTemplate,
	pluginRuntimeTemplate,
	pluginTsconfigTemplate,
} from "#templates/plugin";

export interface InitPluginOptions {
	name: string;
	package?: string;
	dir?: string;
}

// Scaffolds a minimal, working plugin skeleton that a third-party author can
// publish as-is. Mirrors the conventions documented in .claude/rules/conventions.md:
// subpath exports for "." and "./runtime", co-located tests, and no barrel index.
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

	const original = process.cwd();
	process.chdir(targetDir);

	try {
		const label = name
			.split("-")
			.map((part) => (part ? part[0]?.toUpperCase() + part.slice(1) : part))
			.join(" ");

		const created = scaffoldFiles([
			["package.json", pluginPackageJsonTemplate({ name, packageName })],
			["tsconfig.json", pluginTsconfigTemplate()],
			["src/index.ts", pluginIndexTemplate({ name, packageName, label })],
			["src/index.test.ts", pluginIndexTestTemplate({ name, packageName })],
			["src/worker/index.ts", pluginRuntimeTemplate({ name })],
			["README.md", pluginReadmeTemplate({ name, packageName, label })],
		]);

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
				`  pnpm test`,
			].join("\n"),
		);
		outro(`Done!`);
	} finally {
		process.chdir(original);
	}
}
