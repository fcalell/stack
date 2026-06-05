import { describe, expect, it } from "vitest";
import { packageJsonTemplate } from "./package-json";

function parse(plugins: string[]): {
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
	scripts: Record<string, string>;
} {
	return JSON.parse(packageJsonTemplate({ name: "demo", plugins }));
}

describe("packageJsonTemplate", () => {
	it("ships tsx so the scaffolded `stack` bin can launch", () => {
		// The `stack` bin shebang execs tsx. Without tsx in the consumer it
		// fails with `exec: tsx: not found`, so every scaffold must include it.
		const { devDependencies } = parse([]);
		expect(devDependencies.tsx).toBeDefined();
	});

	it("ships the Biome binary so the `lint`/`check` scripts can run", () => {
		// biome-config only carries config; without @biomejs/biome the scripts
		// fail with `biome: command not found`.
		expect(parse([]).devDependencies["@biomejs/biome"]).toBeDefined();
	});

	it("maps each selected plugin to its @fcalell/plugin-* package", () => {
		const { dependencies } = parse(["cloudflare", "native-ui"]);
		expect(dependencies["@fcalell/plugin-cloudflare"]).toBe("workspace:*");
		expect(dependencies["@fcalell/plugin-native-ui"]).toBe("workspace:*");
	});

	it("adds wrangler only when a worker plugin (api/db) is selected", () => {
		expect(parse(["expo"]).devDependencies.wrangler).toBeUndefined();
		expect(parse(["db"]).devDependencies.wrangler).toBeDefined();
	});

	it("adds @types/react only for native (expo) consumers", () => {
		// The native `tsconfig.app.json` needs it to resolve `react/jsx-runtime`.
		expect(parse(["expo"]).devDependencies["@types/react"]).toBeDefined();
		expect(parse(["db"]).devDependencies["@types/react"]).toBeUndefined();
	});

	it("type-checks the native composite solution with `tsc -b`", () => {
		// A native consumer with a worker has split composite projects under a
		// solution tsconfig, which only `tsc -b` walks.
		expect(parse(["expo", "api"]).scripts["check-types"]).toBe("tsc -b");
	});

	it("type-checks a single-project consumer with `tsc --noEmit`", () => {
		expect(parse(["db"]).scripts["check-types"]).toBe("tsc --noEmit");
		expect(parse(["expo"]).scripts["check-types"]).toBe("tsc --noEmit");
	});

	it("exposes a `check` script that runs types then lint", () => {
		const { scripts } = parse(["db"]);
		expect(scripts.check).toBe("pnpm check-types && pnpm lint");
		expect(scripts.lint).toContain("biome");
	});
});
