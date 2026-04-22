import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { StackError } from "#lib/errors";
import { initPlugin } from "./plugin";

describe("initPlugin()", () => {
	let dir: string;
	const originalCwd = process.cwd();

	afterEach(() => {
		process.chdir(originalCwd);
		if (dir) rmSync(dir, { recursive: true, force: true });
	});

	it("scaffolds a working plugin skeleton with defaults", async () => {
		dir = mkdtempSync(join(tmpdir(), "stack-plugin-init-"));
		const target = join(dir, "my-plugin");

		await initPlugin({ name: "my-plugin", dir: target });

		const pkgPath = join(target, "package.json");
		const tsconfigPath = join(target, "tsconfig.json");
		const indexPath = join(target, "src/index.ts");
		const testPath = join(target, "src/index.test.ts");
		const runtimePath = join(target, "src/worker/index.ts");
		const readmePath = join(target, "README.md");

		expect(existsSync(pkgPath)).toBe(true);
		expect(existsSync(tsconfigPath)).toBe(true);
		expect(existsSync(indexPath)).toBe(true);
		expect(existsSync(testPath)).toBe(true);
		expect(existsSync(runtimePath)).toBe(true);
		expect(existsSync(readmePath)).toBe(true);

		const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
			name: string;
			exports: Record<string, string>;
			dependencies: Record<string, string>;
		};
		expect(pkg.name).toBe("stack-plugin-my-plugin");
		expect(pkg.exports["."]).toBe("./src/index.ts");
		expect(pkg.exports["./runtime"]).toBe("./src/worker/index.ts");
		expect(pkg.dependencies["@fcalell/cli"]).toBe("workspace:*");

		const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf-8")) as {
			extends: string;
			include: string[];
		};
		expect(tsconfig.extends).toBe("@fcalell/typescript-config/node-tsx.json");
		expect(tsconfig.include).toEqual(["src"]);

		const index = readFileSync(indexPath, "utf-8");
		expect(index).toContain('plugin("my-plugin"');
		expect(index).toContain('package: "stack-plugin-my-plugin"');
		expect(index).toContain("export const myPlugin");
		expect(index).toContain("slots:");

		const test = readFileSync(testPath, "utf-8");
		expect(test).toContain("cli.collect");
		expect(test).toContain("slots.example");

		const runtime = readFileSync(runtimePath, "utf-8");
		expect(runtime).toContain('from "@fcalell/cli/runtime"');
		expect(runtime).toContain('name: "my-plugin"');

		const readme = readFileSync(readmePath, "utf-8");
		expect(readme).toContain("stack-plugin-my-plugin");
	});

	it("uses a custom package name when provided", async () => {
		dir = mkdtempSync(join(tmpdir(), "stack-plugin-init-"));
		const target = join(dir, "foo");

		await initPlugin({
			name: "foo",
			package: "@acme/stack-plugin-foo",
			dir: target,
		});

		const pkg = JSON.parse(
			readFileSync(join(target, "package.json"), "utf-8"),
		) as { name: string };
		expect(pkg.name).toBe("@acme/stack-plugin-foo");

		const index = readFileSync(join(target, "src/index.ts"), "utf-8");
		expect(index).toContain('package: "@acme/stack-plugin-foo"');
	});

	it("defaults target dir to ./plugins/<name> under cwd", async () => {
		dir = mkdtempSync(join(tmpdir(), "stack-plugin-init-"));
		process.chdir(dir);

		await initPlugin({ name: "bar" });

		const target = join(dir, "plugins", "bar");
		expect(existsSync(join(target, "package.json"))).toBe(true);
		expect(existsSync(join(target, "src/index.ts"))).toBe(true);
	});

	it("rejects invalid plugin names", async () => {
		await expect(initPlugin({ name: "Bad Name" })).rejects.toBeInstanceOf(
			StackError,
		);
		await expect(initPlugin({ name: "" })).rejects.toBeInstanceOf(StackError);
		await expect(initPlugin({ name: "9bad" })).rejects.toBeInstanceOf(
			StackError,
		);
	});

	it("handles multi-word plugin names with camelCase variables", async () => {
		dir = mkdtempSync(join(tmpdir(), "stack-plugin-init-"));
		const target = join(dir, "some-thing");

		await initPlugin({ name: "some-thing", dir: target });

		const index = readFileSync(join(target, "src/index.ts"), "utf-8");
		expect(index).toContain("export const someThing");
		expect(index).toContain("SomeThingOptions");

		const test = readFileSync(join(target, "src/index.test.ts"), "utf-8");
		expect(test).toContain("someThing.cli.collect");
	});
});
