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
	return `import { createPlugin } from "@fcalell/cli";
import { Init } from "@fcalell/cli/events";

export interface ${pascalCase(name)}Options {
\t// Add plugin-specific options here.
}

export const ${varName} = createPlugin("${name}", {
\tlabel: "${label}",
\tpackage: "${packageName}",

\tregister(ctx, bus, _events) {
\t\tbus.on(Init.Scaffold, (p) => {
\t\t\tp.files.push({
\t\t\t\tpath: "src/${varName}/index.ts",
\t\t\t\tcontent: \`// Scaffolded by ${packageName}.\\nexport const hello = "${name}";\\n\`,
\t\t\t});
\t\t\tp.dependencies["${packageName}"] = "^0.0.0";
\t\t});
\t},
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
	return `import { createEventBus, Init } from "@fcalell/cli/events";
import { createMockCtx } from "@fcalell/cli/testing";
import { describe, expect, it } from "vitest";
import { ${varName}, type ${pascalCase(name)}Options } from "./index";

describe("${varName} plugin", () => {
\tit("has the expected name, label, and package", () => {
\t\texpect(${varName}.name).toBe("${name}");
\t\texpect(${varName}.cli.label).toBeTypeOf("string");
\t\texpect(${varName}.cli.package).toBe("${packageName}");
\t});

\tit("contributes a scaffold file on Init.Scaffold", async () => {
\t\tconst bus = createEventBus();
\t\tconst ctx = createMockCtx<${pascalCase(name)}Options>({ options: {} });
\t\t${varName}.cli.register(ctx, bus, ${varName}.events);

\t\tconst scaffold = await bus.emit(Init.Scaffold, {
\t\t\tfiles: [],
\t\t\tdependencies: {},
\t\t\tdevDependencies: {},
\t\t\tgitignore: [],
\t\t});

\t\texpect(scaffold.files).toContainEqual(
\t\t\texpect.objectContaining({ path: "src/${varName}/index.ts" }),
\t\t);
\t\texpect(scaffold.dependencies["${packageName}"]).toBeDefined();
\t});
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

function toCamelCase(name: string): string {
	return name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function pascalCase(name: string): string {
	const camel = toCamelCase(name);
	return camel.charAt(0).toUpperCase() + camel.slice(1);
}
