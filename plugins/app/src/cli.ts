import { join } from "node:path";
import type { CliPlugin, GeneratedFile } from "@fcalell/config/plugin";
import fg from "fast-glob";
import type { AppOptions } from "./index";
import { buildTree, emitDts, emitRoutes } from "./routes-core";

const LAYOUT_TEMPLATE = `import type { ParentProps } from "solid-js";

export default function RootLayout(props: ParentProps) {
\treturn <main>{props.children}</main>;
}
`;

const INDEX_TEMPLATE = `export default function HomePage() {
\treturn <h1>Hello from @fcalell/stack</h1>;
}
`;

function getPagesDir(options: AppOptions): string {
	if (options.routes && typeof options.routes === "object") {
		return options.routes.pagesDir ?? "src/app/pages";
	}
	return "src/app/pages";
}

const plugin: CliPlugin<AppOptions> = {
	name: "app",
	label: "App",

	detect(ctx) {
		return ctx.hasPlugin("app");
	},

	async prompt(_ctx) {
		return {};
	},

	async scaffold(ctx, _answers) {
		await ctx.writeIfMissing("src/app/pages/_layout.tsx", LAYOUT_TEMPLATE);
		await ctx.writeIfMissing("src/app/pages/index.tsx", INDEX_TEMPLATE);

		ctx.addDependencies({
			"@fcalell/plugin-app": "workspace:*",
			"@fcalell/ui": "workspace:*",
			"solid-js": "^1.9.0",
		});
		ctx.addToGitignore(".stack");
	},

	bindings() {
		return [];
	},

	async generate(ctx): Promise<GeneratedFile[]> {
		const appOptions = ctx.getPluginOptions<AppOptions>("app");
		if (appOptions?.routes === false) return [];

		const pagesDir = getPagesDir(appOptions ?? {});
		const absPagesDir = join(ctx.cwd, pagesDir);

		let pageFiles: string[];
		try {
			pageFiles = fg
				.sync(["**/*.tsx", "**/*.jsx"], { cwd: absPagesDir })
				.sort();
		} catch {
			pageFiles = [];
		}

		if (pageFiles.length === 0) return [];

		const { root, notFoundFile } = buildTree(pageFiles, absPagesDir);
		const { typedRoutesTypes } = emitRoutes(root, ctx.cwd, notFoundFile);
		const dtsContent = emitDts(typedRoutesTypes);

		return [
			{
				path: ".stack/routes.d.ts",
				content: dtsContent,
			},
		];
	},

	worker: undefined,

	async dev(ctx) {
		const port = ctx.getPort("app");

		return {
			processes: [
				{
					name: "app",
					command: "npx",
					args: ["stack-vite", "dev", "--port", String(port)],
					defaultPort: 3000,
					readyPattern: /Local:/,
					color: "cyan",
				},
			],
			banner: [`App: http://localhost:${port}`],
		};
	},

	async build(_ctx) {
		return {
			async preBuild() {
				// routes plugin is applied via vitePlugins in the preset
			},
		};
	},

	async deploy(ctx) {
		ctx.log.info("Building app...");
		// TODO: run stack-vite build + wrangler pages deploy
	},
};

export default plugin;
