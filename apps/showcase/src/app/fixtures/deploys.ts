import type { AppRouter } from "../../../.stack/worker";
import { ago } from "./ago.ts";

type Deploys = AppRouter["deploys"];
type Deploy = Deploys["list"]["__output"][number];
type Step = Deploys["get"]["__output"]["steps"][number];
type ChangedFile = Deploys["files"]["__output"][number];

export const DEPLOYS: Deploy[] = [
	{
		id: "d1",
		author: "Ana Ruiz",
		message: "Cache build output between deploys",
		branch: "main",
		commit: "a41c9e2",
		age: ago(2),
		state: "active",
		environment: "production",
	},
	{
		id: "d2",
		author: "Ben Kaya",
		message: "Move image resizing to the edge",
		branch: "preview/img-edge",
		commit: "7d0e2b1",
		age: ago(18),
		state: "done",
		environment: "preview",
	},
	{
		id: "d3",
		author: "Ema Okafor",
		message: "Pin wrangler to 4.12",
		branch: "main",
		commit: "0c5e4aa",
		age: ago(60),
		state: "failed",
		environment: "production",
	},
	{
		id: "d4",
		author: "Ana Ruiz",
		message: "Add Frankfurt to the region list",
		branch: "preview/regions",
		commit: "b71d0e2",
		age: ago(180),
		state: "waiting",
		environment: "preview",
	},
	{
		id: "d5",
		author: "Nightly schedule",
		message: "Nightly rebuild",
		branch: "main",
		commit: "e93a6c0",
		age: ago(1440),
		state: "done",
		environment: "production",
	},
];

// Every deploy runs the same steps.
export const STEPS: Step[] = [
	{
		id: "install",
		name: "Install",
		state: "done",
		took: "38 s",
		log: `[10:40:04] pnpm install --frozen-lockfile
[10:40:31] Packages: +812
[10:40:42] Done in 38 s`,
	},
	{
		id: "build",
		name: "Build",
		state: "done",
		took: "51 s",
		log: `[10:40:43] vite build
[10:41:20] 214 modules transformed
[10:41:34] Built in 51 s`,
	},
	{
		id: "upload",
		name: "Upload",
		state: "active",
		took: "13 s",
		log: `[10:41:35] Uploading 38 files
[10:41:48] 31 of 38 uploaded`,
	},
];

// What a deploy changed: its files, its description before and after, its
// release notes and its build log.
interface Changes {
	files: ChangedFile[];
	description?: { before: string; after: string };
	notes: string;
	log: string;
}

const CACHE: Changes = {
	files: [
		{
			path: "src/build/cache.ts",
			before: `import { hash } from "./hash.ts";

export async function restore(key: string) {
	return null;
}

export async function save(key: string, dir: string) {
	await upload(key, dir);
}`,
			after: `import { hash } from "./hash.ts";
import { bucket } from "./bucket.ts";

export async function restore(key: string) {
	const hit = await bucket.get(hash(key));
	return hit ? hit.unpack() : null;
}

export async function save(key: string, dir: string) {
	await bucket.put(hash(key), await pack(dir));
}`,
		},
		{
			path: "src/build/bucket.ts",
			before: "",
			after: `export const bucket = env.BUILD_CACHE;
export const ttl = 60 * 60 * 24 * 7;`,
			mark: "added",
		},
		{
			path: "src/build/steps/install.ts",
			before: `export const install = step("Install", async (ctx) => {
	await ctx.run("pnpm install --frozen-lockfile");
});`,
			after: `export const install = step("Install", async (ctx) => {
	if (await ctx.restore("node_modules")) return;
	await ctx.run("pnpm install --frozen-lockfile");
	await ctx.save("node_modules");
});`,
		},
		{
			path: "docs/deploys/caching-build-output-between-deploys.md",
			before: "Every deploy installs from scratch.",
			after:
				"A deploy restores the last build's dependencies when the lockfile has not changed.",
		},
	],
	description: {
		before:
			"Every deploy installs its dependencies from scratch, which takes about a minute on a large project.",
		after:
			"A deploy now restores the last build's dependencies when the lockfile has not changed, so installs take seconds on a large project.",
	},
	notes: `Installs restore the last build's dependencies when \`pnpm-lock.yaml\` has not changed.

- A cached install takes **about 4 s** instead of a minute.
- The cache keeps for seven days; a deploy with \`--no-cache\` skips it.
- Each project's cache is its own, so a preview never reads production's.

Read [how the cache is keyed](#cache) before you change the install step.`,
	log: `[10:40:02] Cloning acme/acme-web at a41c9e2
[10:40:04] Restoring cache for pnpm-lock.yaml
[10:40:05] Cache hit: node_modules (412 packages)
[10:40:05] stack generate
[10:40:06] wrote .stack/app.css
[10:40:06] wrote .stack/worker.ts
[10:40:06] wrote .stack/wrangler.jsonc
[10:40:07] tsc --noEmit
[10:40:12] 0 errors
[10:40:12] vite build
[10:40:13] resolving 10 plugins
[10:40:16] 214 modules transformed
[10:40:17] dist/index.html  0.46 kB
[10:40:17] built in 4.92s
[10:40:18] Saving cache for pnpm-lock.yaml
[10:40:19] Uploading 38 files
[10:40:21] Deployed to acme.dev`,
};

const WRANGLER: Changes = {
	files: [
		{
			path: "package.json",
			before: `{
	"name": "acme-web",
	"engines": { "node": ">=18" },
	"devDependencies": {
		"typescript": "^5.9.2",
		"wrangler": "^4.10.0"
	}
}`,
			after: `{
	"name": "acme-web",
	"engines": { "node": ">=18" },
	"devDependencies": {
		"typescript": "^5.9.2",
		"wrangler": "4.12.0"
	}
}`,
			mark: "dependencies",
		},
		{
			path: "pnpm-lock.yaml",
			before: `  wrangler:
    specifier: ^4.10.0
    version: 4.10.3`,
			after: `  wrangler:
    specifier: 4.12.0
    version: 4.12.0`,
			mark: "generated",
		},
	],
	notes:
		"Pins `wrangler` to 4.12 so every deploy builds with the same version.",
	log: `[09:51:40] Cloning acme/acme-web at 0c5e4aa
[09:51:42] Restoring cache for pnpm-lock.yaml
[09:51:42] Cache miss: the lockfile changed
[09:51:43] pnpm install --frozen-lockfile
[09:51:55] Packages: +414
[09:51:56] ERR_PNPM_UNSUPPORTED_ENGINE wrangler@4.12.0 needs node >=20.0.0
[09:51:56] Your Node version is 18.20.4
[09:51:56] Install failed after 13 s`,
};

const IMAGES: Changes = {
	files: [
		{
			path: "src/images/resize.ts",
			before: `export function resize(url: string, width: number) {
	return fetch(\`/resize?url=\${url}&w=\${width}\`);
}`,
			after: `export function resize(url: string, width: number) {
	return fetch(url, { cf: { image: { width, fit: "scale-down" } } });
}`,
		},
	],
	notes:
		"Images resize at the edge, so a first view no longer waits on the origin.",
	log: `[10:24:10] Cloning acme/acme-web at 7d0e2b1
[10:24:12] Cache hit: node_modules (412 packages)
[10:24:20] built in 3.41s
[10:24:23] Deployed to img-edge.acme-web.preview.acme.dev`,
};

const REGIONS: Changes = {
	files: [
		{
			path: "src/regions.ts",
			before: `export const regions = ["iad", "sin"];`,
			after: `export const regions = ["fra", "iad", "sin"];`,
		},
	],
	description: {
		before: "Deploys run in Washington and Singapore.",
		after: "Deploys run in Frankfurt, Washington and Singapore.",
	},
	notes: "Adds Frankfurt, `fra`, to the regions a deploy runs in.",
	log: `[07:12:30] Cloning acme/acme-web at b71d0e2
[07:12:31] Waiting for an approval to deploy to a new region`,
};

const NIGHTLY: Changes = {
	files: [],
	notes: "The nightly rebuild deploys `main` as it stands, with no new commit.",
	log: `[03:00:00] Cloning acme/acme-web at e93a6c0
[03:00:02] Cache hit: node_modules (412 packages)
[03:00:09] built in 3.02s
[03:00:12] Deployed to acme.dev`,
};

export const CHANGES: Record<string, Changes> = {
	d1: CACHE,
	d2: IMAGES,
	d3: WRANGLER,
	d4: REGIONS,
	d5: NIGHTLY,
};
