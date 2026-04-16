import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const root = resolve(import.meta.dirname, "../..");

export default defineConfig({
	resolve: {
		alias: {
			"@fcalell/config/plugin": resolve(root, "packages/config/src/plugin.ts"),
			"@fcalell/config": resolve(root, "packages/config/src/index.ts"),
			"@fcalell/cli/codegen": resolve(
				root,
				"packages/cli/src/lib/codegen.ts",
			),
			"@fcalell/cli/discovery": resolve(
				root,
				"packages/cli/src/lib/discovery.ts",
			),
			"@fcalell/plugin-db/cli": resolve(root, "plugins/db/src/cli.ts"),
			"@fcalell/plugin-db": resolve(root, "plugins/db/src/index.ts"),
			"@fcalell/plugin-auth/cli": resolve(root, "plugins/auth/src/cli.ts"),
			"@fcalell/plugin-auth": resolve(root, "plugins/auth/src/index.ts"),
			"@fcalell/plugin-api/cli": resolve(root, "plugins/api/src/cli.ts"),
			"@fcalell/plugin-api": resolve(root, "plugins/api/src/index.ts"),
			"@fcalell/plugin-app/cli": resolve(root, "plugins/app/src/cli.ts"),
			"@fcalell/plugin-app": resolve(root, "plugins/app/src/index.ts"),
		},
	},
	test: {
		name: "integration",
	},
});
