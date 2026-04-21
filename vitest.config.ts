import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: [
			"packages/cli",
			"plugins/cloudflare",
			"plugins/db",
			"plugins/auth",
			"plugins/api",
			"plugins/vite",
			"plugins/solid",
			"plugins/solid-ui",
			"tests/integration",
		],
	},
});
