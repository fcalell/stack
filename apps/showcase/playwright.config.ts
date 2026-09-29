import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

// The gates run against the production build served by `vite preview`: the
// same bytes every run, no dev-server transforms, HMR client or dev-only
// React warnings in the console.
export default defineConfig({
	testDir: "gates",
	fullyParallel: true,
	forbidOnly: true,
	reporter: [["list"], ["./gates/lib/gaps.ts"]],
	use: {
		...devices["Desktop Chrome"],
		baseURL: `http://localhost:${PORT}`,
		viewport: { width: 1280, height: 800 },
		deviceScaleFactor: 1,
	},
	projects: [{ name: "chromium" }],
	webServer: {
		command: `stack build && vite preview --config .stack/vite.config.ts --port ${PORT} --strictPort`,
		url: `http://localhost:${PORT}`,
		reuseExistingServer: false,
		timeout: 180_000,
	},
});
