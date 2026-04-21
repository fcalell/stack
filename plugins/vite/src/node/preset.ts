import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

// Pass-through stub for when no plugin contributed providers. plugin-vite is
// framework-agnostic, so the stub must not import any framework runtime —
// the consumer's JSX transform compiles `props.children` with whatever
// pragma is active (Solid, React, Preact, …).
const PROVIDERS_STUB = `export default function Providers(props) {
	return props.children;
}
`;

export interface ProvidersPluginOptions {
	// Path (absolute or relative to `cwd`) to the generated providers module.
	// Defaults to `.stack/virtual-providers.tsx` relative to the Vite config
	// file via its `root` — consumers rarely override this.
	modulePath?: string;
	cwd?: string;
}

export function providersPlugin(opts: ProvidersPluginOptions = {}): Plugin {
	const VIRTUAL_ID = "virtual:stack-providers";
	const RESOLVED_ID = `\0${VIRTUAL_ID}`;
	const cwd = opts.cwd ?? process.cwd();
	const modulePath = opts.modulePath
		? resolve(cwd, opts.modulePath)
		: resolve(cwd, ".stack/virtual-providers.tsx");

	return {
		name: "fcalell:stack-providers",

		resolveId(id) {
			if (id !== VIRTUAL_ID) return null;
			if (existsSync(modulePath)) return modulePath;
			return RESOLVED_ID;
		},

		load(id) {
			if (id !== RESOLVED_ID) return null;
			return PROVIDERS_STUB;
		},
	};
}
