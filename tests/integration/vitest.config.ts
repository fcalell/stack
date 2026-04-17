import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const root = resolve(import.meta.dirname, "../..");

export default defineConfig({
	resolve: {
		alias: {
			"@fcalell/cli/codegen": resolve(root, "packages/cli/src/lib/codegen.ts"),
			"@fcalell/cli/discovery": resolve(
				root,
				"packages/cli/src/lib/discovery.ts",
			),
			"@fcalell/cli/events": resolve(root, "packages/cli/src/events.ts"),
			"@fcalell/cli/errors": resolve(root, "packages/cli/src/lib/errors.ts"),
			"@fcalell/cli/testing": resolve(root, "packages/cli/src/testing.ts"),
			"@fcalell/cli": resolve(root, "packages/cli/src/config.ts"),
			"#config": resolve(root, "packages/cli/src/config.ts"),
			"#lib/create-plugin": resolve(
				root,
				"packages/cli/src/lib/create-plugin.ts",
			),
			"#lib/event-bus": resolve(root, "packages/cli/src/lib/event-bus.ts"),
			"@fcalell/plugin-db": resolve(root, "plugins/db/src/index.ts"),
			"@fcalell/plugin-auth": resolve(root, "plugins/auth/src/index.ts"),
			"@fcalell/plugin-api": resolve(root, "plugins/api/src/index.ts"),
			"@fcalell/plugin-vite": resolve(root, "plugins/vite/src/index.ts"),
			"@fcalell/plugin-solid": resolve(root, "plugins/solid/src/index.ts"),
			"@fcalell/plugin-solid-ui": resolve(
				root,
				"plugins/solid-ui/src/index.ts",
			),
		},
	},
	test: {
		name: "integration",
	},
});
