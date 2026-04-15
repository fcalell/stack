#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const configFiles = [
	"vite.config.ts",
	"vite.config.js",
	"vite.config.mts",
	"vite.config.mjs",
];

const hasUserConfig = configFiles.some((f) => existsSync(resolve(f)));

if (!hasUserConfig) {
	const defaultConfig = fileURLToPath(
		new URL("../src/default-config.ts", import.meta.url),
	);
	process.argv.splice(2, 0, "--config", defaultConfig);
}

await import("vite/bin/vite.js");
