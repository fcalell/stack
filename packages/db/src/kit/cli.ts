#!/usr/bin/env tsx
import { resolve } from "node:path";
import { parseArgs } from "node:util";

const { positionals, values } = parseArgs({
	allowPositionals: true,
	options: {
		studio: { type: "boolean", default: false },
		config: { type: "string", default: "db.config.ts" },
	},
});

const command = positionals[0];

if (!command || !["dev", "deploy"].includes(command)) {
	console.log("Usage: db-kit <dev|deploy> [--studio] [--config path]");
	process.exit(1);
}

const configPath = resolve(values.config!);
const mod = await import(configPath);
const config = mod.default;

if (!config?.dialect || !["d1", "sqlite"].includes(config.dialect)) {
	console.error(`Invalid config at ${configPath}`);
	process.exit(1);
}

if (command === "dev") {
	const { dev } = await import("#kit/dev");
	dev(config, { studio: values.studio ?? false });
} else {
	const { deploy } = await import("#kit/deploy");
	deploy(config);
}
