import {
	appendFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { log } from "@clack/prompts";
import type { StackConfig } from "@fcalell/config";
import type {
	BuildContext,
	DeployContext,
	DevContext,
	PluginContext,
} from "@fcalell/config/plugin";
import { editConfig } from "#lib/config-writer";
import { ask, choose, confirm, multi } from "#lib/prompt";

export function createPluginContext(opts: {
	cwd: string;
	config: StackConfig | null;
}): PluginContext {
	return {
		cwd: opts.cwd,
		config: opts.config,

		hasPlugin(name: string): boolean {
			return (
				opts.config?.plugins.some((p) => p.__plugin === name) ?? false
			);
		},

		getPluginOptions<T>(name: string): T | undefined {
			const found = opts.config?.plugins.find((p) => p.__plugin === name);
			return found?.options as T | undefined;
		},

		async writeFile(path: string, content: string): Promise<void> {
			const fullPath = join(opts.cwd, path);
			mkdirSync(dirname(fullPath), { recursive: true });
			writeFileSync(fullPath, content);
		},

		async writeIfMissing(path: string, content: string): Promise<boolean> {
			const fullPath = join(opts.cwd, path);
			if (existsSync(fullPath)) {
				log.info(`${path} already exists, skipping`);
				return false;
			}
			mkdirSync(dirname(fullPath), { recursive: true });
			writeFileSync(fullPath, content);
			return true;
		},

		async ensureDir(path: string): Promise<void> {
			const fullPath = join(opts.cwd, path);
			mkdirSync(fullPath, { recursive: true });
		},

		async fileExists(path: string): Promise<boolean> {
			return existsSync(join(opts.cwd, path));
		},

		async readFile(path: string): Promise<string> {
			return readFileSync(join(opts.cwd, path), "utf-8");
		},

		addDependencies(deps: Record<string, string>): void {
			patchDeps(opts.cwd, "dependencies", deps);
		},

		addDevDependencies(deps: Record<string, string>): void {
			patchDeps(opts.cwd, "devDependencies", deps);
		},

		addToGitignore(...entries: string[]): void {
			const gitignorePath = join(opts.cwd, ".gitignore");

			if (existsSync(gitignorePath)) {
				const content = readFileSync(gitignorePath, "utf-8");
				const missing = entries.filter((e) => !content.includes(e));
				if (missing.length > 0) {
					appendFileSync(
						gitignorePath,
						`\n${missing.join("\n")}\n`,
					);
				}
			} else {
				writeFileSync(
					gitignorePath,
					`${["node_modules", "dist", ...entries].join("\n")}\n`,
				);
			}
		},

		async addPluginToConfig(pluginOpts: {
			importSource: string;
			importName: string;
			options: Record<string, unknown>;
		}): Promise<void> {
			const configPath = join(opts.cwd, "stack.config.ts");
			await editConfig(configPath, ({ mod, config: ast }) => {
				mod.imports.$append({
					from: pluginOpts.importSource,
					imported: pluginOpts.importName,
					local: pluginOpts.importName,
				});

				if (!ast.plugins) {
					ast.plugins = [];
				}
			});
		},

		async removePluginFromConfig(name: string): Promise<void> {
			const configPath = join(opts.cwd, "stack.config.ts");
			await editConfig(configPath, ({ config: ast }) => {
				if (Array.isArray(ast.plugins)) {
					const idx = ast.plugins.findIndex(
						// biome-ignore lint/suspicious/noExplicitAny: magicast proxies are dynamically typed
						(p: any) =>
							p?.$type === "function-call" &&
							p.$callee === name,
					);
					if (idx >= 0) {
						ast.plugins.splice(idx, 1);
					}
				}
			});
		},

		prompt: {
			async text(
				message: string,
				textOpts?: { default?: string },
			): Promise<string> {
				return ask(message, textOpts?.default);
			},
			async confirm(message: string): Promise<boolean> {
				return confirm(message);
			},
			async select<T>(
				message: string,
				options: { label: string; value: T }[],
			): Promise<T> {
				const values = options.map((o) => o.value);
				return choose(
					message,
					values as [T & string, ...(T & string)[]],
				) as Promise<T>;
			},
			async multiselect<T>(
				message: string,
				options: { label: string; value: T }[],
			): Promise<T[]> {
				return multi(
					message,
					options.map((o) => ({
						label: o.label,
						value: o.value as T & string,
					})),
				) as Promise<T[]>;
			},
		},

		log: {
			info(msg: string): void {
				log.info(msg);
			},
			warn(msg: string): void {
				log.warn(msg);
			},
			success(msg: string): void {
				log.success(msg);
			},
			error(msg: string): void {
				log.error(msg);
			},
		},
	};
}

export function createDevContext(
	base: PluginContext,
	ports: Map<string, number>,
): DevContext {
	return {
		...base,
		getPort(name: string): number {
			const port = ports.get(name);
			if (port === undefined) {
				throw new Error(`No port assigned for "${name}"`);
			}
			return port;
		},
	};
}

export function createBuildContext(
	base: PluginContext,
	outDir: string,
): BuildContext {
	return { ...base, outDir };
}

export function createDeployContext(
	base: PluginContext,
	deployOpts?: { env?: string; preview?: boolean; dryRun?: boolean },
): DeployContext {
	return { ...base, ...deployOpts };
}

function patchDeps(
	cwd: string,
	field: "dependencies" | "devDependencies",
	deps: Record<string, string>,
): void {
	const pkgPath = join(cwd, "package.json");
	if (!existsSync(pkgPath)) {
		log.warn("No package.json found — skipping dependency setup.");
		return;
	}

	const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as Record<
		string,
		unknown
	>;
	const existing = (pkg[field] ?? {}) as Record<string, string>;
	const missing = Object.entries(deps).filter(([k]) => !(k in existing));

	if (missing.length > 0) {
		pkg[field] = { ...existing, ...Object.fromEntries(missing) };
		writeFileSync(pkgPath, `${JSON.stringify(pkg, null, "\t")}\n`);
	}
}
