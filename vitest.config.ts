import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: [
			"packages/config",
			"packages/vite",
			"packages/cli",
			"plugins/db",
			"plugins/auth",
			"plugins/api",
			"plugins/app",
			"tests/integration",
		],
	},
});
