import { readFileSync } from "node:fs";

// The CLI's own package.json, one level above `src/` and `dist/` alike.
export const cliManifest = JSON.parse(
	readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as {
	name: string;
	version: string;
	peerDependencies: Record<string, string>;
};

// The ts-morph range an app declares as a devDependency: the CLI's optional peer, which prints the
// TypeScript `stack generate` writes.
export const TS_MORPH_SPEC = cliManifest.peerDependencies["ts-morph"] as string;
