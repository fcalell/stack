import { writeFile as fsWriteFile } from "node:fs/promises";
import { generateCode, loadFile, type ProxifiedModule } from "magicast";

interface ConfigAst {
	mod: ProxifiedModule;
	/** The object literal passed to `defineConfig({...})`. */
	// biome-ignore lint/suspicious/noExplicitAny: magicast proxies are dynamically typed
	config: any;
}

/**
 * Load `stack.config.ts` via magicast, hand its config object to the mutator,
 * then write it back. Preserves comments, formatting, and anything the
 * mutator doesn't touch.
 *
 * Throws `EditConfigError` with actionable instructions when the file can't
 * be edited in place (e.g. `defineConfig` wrapped in a condition).
 */
export async function editConfig(
	path: string,
	mutate: (ast: ConfigAst) => void | Promise<void>,
): Promise<void> {
	try {
		const mod = await loadFile(path);
		const config = getConfigObject(mod, path);
		await mutate({ mod, config });
		const { code } = generateCode(mod, {
			format: false,
			useTabs: true,
			tabWidth: 4,
			quote: "double",
		});
		await fsWriteFile(path, tabifyLeadingSpaces(code));
	} catch (error) {
		if (error instanceof EditConfigError) throw error;
		throw new EditConfigError(path, describe(error));
	}
}

function describe(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * Magicast/recast emits new nodes with 4-space base indentation on top of
 * parent tab levels. Collapse any leading run of 4-space multiples into tabs
 * so newly-inserted content matches the project's tab-indented style.
 */
function tabifyLeadingSpaces(code: string): string {
	return code.replace(/^(\t*)( {4})+/gm, (_, tabs: string, spaces: string) => {
		return tabs + "\t".repeat(spaces.length / 4);
	});
}

// biome-ignore lint/suspicious/noExplicitAny: magicast proxies are dynamically typed
function getConfigObject(mod: ProxifiedModule, path: string): any {
	// biome-ignore lint/suspicious/noExplicitAny: magicast proxies are dynamically typed
	const defaultExport = mod.exports.default as any;

	if (!defaultExport || defaultExport.$type !== "function-call") {
		throw new EditConfigError(
			path,
			"expected `export default defineConfig({...})`",
		);
	}

	const args = defaultExport.$args;
	if (!args || args.length === 0) {
		throw new EditConfigError(path, "defineConfig() has no arguments");
	}

	const config = args[0];
	if (!config || config.$type !== "object") {
		throw new EditConfigError(
			path,
			"defineConfig() was not called with an object literal",
		);
	}

	return config;
}

export class EditConfigError extends Error {
	constructor(path: string, detail: string) {
		super(
			`Could not automatically edit ${path} (${detail}). ` +
				"Your config uses a shape this tool can't modify in place. " +
				"Add the section manually, or simplify the config so the default " +
				"export is a direct `defineConfig({ ... })` call.",
		);
		this.name = "EditConfigError";
	}
}
