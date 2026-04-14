import { readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { defineConfig } from "../src/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureRoot = join(__dirname, "fixture");

// Clean previous output
rmSync(join(fixtureRoot, "dist"), { recursive: true, force: true });
rmSync(join(fixtureRoot, ".stack"), { recursive: true, force: true });
rmSync(join(fixtureRoot, ".vite-cache"), { recursive: true, force: true });

const config = defineConfig({ apiProxy: false });
config.root = fixtureRoot;
config.build = {
	...config.build,
	outDir: "dist",
	emptyOutDir: true,
};
config.cacheDir = join(fixtureRoot, ".vite-cache");
config.logLevel = "warn";

await build(config);

const html = readFileSync(join(fixtureRoot, "dist/index.html"), "utf8");
console.log("--- dist/index.html ---");
console.log(html);

console.log("\n--- dist/assets ---");
try {
	const files = readdirSync(join(fixtureRoot, "dist/assets"));
	console.log(files.filter((f) => /\.(woff2|css|js)$/.test(f)));
} catch {
	console.log("(no assets directory)");
}

console.log("\n--- .stack/routes.d.ts ---");
console.log(readFileSync(join(fixtureRoot, ".stack/routes.d.ts"), "utf8"));
