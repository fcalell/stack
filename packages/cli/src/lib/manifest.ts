import { readFileSync } from "node:fs";

// The CLI's own package.json, one level above `src/` and `dist/` alike.
export const cliManifest = JSON.parse(
	readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as { name: string };
