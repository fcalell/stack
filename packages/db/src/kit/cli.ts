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
const commands = ["dev", "deploy", "init", "reset"];

if (!command || !commands.includes(command)) {
	console.log(
		"Usage: db-kit <dev|deploy|init|reset> [--studio] [--config path]",
	);
	process.exit(1);
}

if (command === "init") {
	const { init } = await import("#kit/init");
	await init();
	process.exit(0);
}

const configPath = resolve(values.config ?? "db.config.ts");

const { ensureDeps } = await import("#kit/deps");
ensureDeps(configPath);

const mod = await import(configPath);
const config = mod.default;

if (!config?.dialect || !["d1", "sqlite"].includes(config.dialect)) {
	console.error(`Invalid config at ${configPath}`);
	process.exit(1);
}

if (command === "dev") {
	const { dev } = await import("#kit/dev");
	dev(config, { studio: values.studio ?? false });
} else if (command === "deploy") {
	const { deploy } = await import("#kit/deploy");
	deploy(config);
} else if (command === "reset") {
	const { reset } = await import("#kit/reset");
	reset(config);
}
