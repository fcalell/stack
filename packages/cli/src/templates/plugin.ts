import { toPascalCase as pascalCase, toCamelCase } from "#lib/naming";

interface PluginPackageJsonOptions {
	name: string;
	packageName: string;
}

export function pluginPackageJsonTemplate(
	options: PluginPackageJsonOptions,
): string {
	const pkg = {
		name: options.packageName,
		version: "0.0.0",
		type: "module",
		sideEffects: false,
		exports: {
			".": "./src/index.ts",
			"./runtime": "./src/worker/index.ts",
		},
		license: "MIT",
		scripts: {
			"check-types": "tsc --noEmit --pretty",
			lint: "biome check --write --unsafe",
			check: "pnpm check-types && pnpm lint",
			test: "vitest run",
		},
		dependencies: {
			"@fcalell/cli": "workspace:*",
		},
		devDependencies: {
			"@fcalell/typescript-config": "workspace:*",
			typescript: "^5.9.3",
			vitest: "^3.0.0",
		},
	};

	return `${JSON.stringify(pkg, null, "\t")}\n`;
}

export function pluginTsconfigTemplate(): string {
	const config = {
		extends: "@fcalell/typescript-config/node-tsx.json",
		include: ["src"],
	};
	return `${JSON.stringify(config, null, "\t")}\n`;
}

interface PluginIndexOptions {
	name: string;
	packageName: string;
	label: string;
}

export function pluginIndexTemplate(options: PluginIndexOptions): string {
	const { name, packageName, label } = options;
	const varName = toCamelCase(name);
	return `import { plugin, slot } from "@fcalell/cli";

export interface ${pascalCase(name)}Options {
\t// Add plugin-specific options here.
}

// Example slot this plugin owns. Other plugins contribute to it; this
// plugin derives / composes the final value.
const example = slot.list<string>({ source: "${name}", name: "example" });

export const ${varName} = plugin("${name}", {
\tlabel: "${label}",
\tpackage: "${packageName}",

\tslots: { example },

\tdependencies: {
\t\t"${packageName}": "^0.0.0",
\t},

\tcontributes: [
\t\t// example.contribute(() => "hello"),
\t],
});
`;
}

interface PluginIndexTestOptions {
	name: string;
	packageName: string;
}

export function pluginIndexTestTemplate(
	options: PluginIndexTestOptions,
): string {
	const { name, packageName } = options;
	const varName = toCamelCase(name);
	return `import { cliSlots } from "@fcalell/cli/cli-slots";
import { buildTestGraphFromPlugins } from "@fcalell/cli/testing";
import { describe, expect, it } from "vitest";
import { ${varName} } from "./index";

// Drive every test through a real graph and assert on a resolved slot VALUE —
// never on identity echoes (\`${varName}.name\`, a slot's \`source\`, \`label\`),
// which break only on rename and protect nothing. See the "Don't write
// low-value tests" rule: a good test names a behavior whose break a real
// consumer would feel.
describe("${varName} plugin", () => {
\tit("auto-wires its package into cli.slots.initDeps", async () => {
\t\tconst { graph } = buildTestGraphFromPlugins({
\t\t\tplugins: [{ factory: ${varName}, options: {} }],
\t\t});

\t\tconst deps = await graph.resolve(cliSlots.initDeps);

\t\texpect(deps).toHaveProperty("${packageName}");
\t});

\t// Once you uncomment \`example.contribute(...)\` in index.ts, assert on its
\t// effect here, e.g.:
\t//   const items = await graph.resolve(${varName}.slots.example);
\t//   expect(items).toContain("hello");
});
`;
}

interface PluginRuntimeOptions {
	name: string;
}

// Minimal RuntimePlugin stub so third-party plugins that want worker-side
// behaviour have a starting point. The stub is intentionally no-op — authors
// replace `context()` with their own logic.
export function pluginRuntimeTemplate(options: PluginRuntimeOptions): string {
	const { name } = options;
	const varName = toCamelCase(name);
	return `import type { RuntimePlugin } from "@fcalell/cli/runtime";

export interface ${pascalCase(name)}RuntimeOptions {
\t// Runtime options live here. They are plain values read at generate time
\t// and inlined into .stack/worker.ts as JS literals.
}

export default function ${varName}Runtime(
\t_options: ${pascalCase(name)}RuntimeOptions = {},
): RuntimePlugin<"${name}"> {
\treturn {
\t\tname: "${name}",
\t\tcontext() {
\t\t\treturn {};
\t\t},
\t};
}
`;
}

interface PluginReadmeOptions {
	name: string;
	packageName: string;
	label: string;
}

export function pluginReadmeTemplate(options: PluginReadmeOptions): string {
	const { name, packageName, label } = options;
	return `# ${packageName}

${label} plugin for [\`@fcalell/stack\`](https://github.com/fcalell/stack).

## Install

\`\`\`bash
pnpm add ${packageName}
\`\`\`

## Usage

\`\`\`ts
// stack.config.ts
import { defineConfig } from "@fcalell/cli";
import { ${toCamelCase(name)} } from "${packageName}";

export default defineConfig({
  plugins: [${toCamelCase(name)}()],
});
\`\`\`

## Publishing

1. Replace \`workspace:*\` dependencies in \`package.json\` with fixed versions.
2. Run \`pnpm test\` and \`pnpm check-types\`.
3. Publish: \`pnpm publish --access public\`.

## License

MIT
`;
}
