import type { LintPlugin } from "../specs.ts";

// An app in stack's own workspace extends the checkout's root config by path
// (`rootConfig`, from the app to it): Biome refuses a second root config below
// it, so the formatter and linter settings stay the checkout's and only the
// generated plugins are the app's.
//
// TODO: Biome 2.4 takes the `//` shorthand for the root only as a lone
// `extends` string, so it cannot sit beside `./.stack/biome.json`. Use
// `["//", "./.stack/biome.json"]` once an `extends` array takes it.
export function biomeTemplate(options: { rootConfig: string | null }): string {
	const config = options.rootConfig
		? { root: false, extends: [options.rootConfig, "./.stack/biome.json"] }
		: {
				// The installed biome's own schema, so it never lags the version.
				$schema: "./node_modules/@biomejs/biome/configuration_schema.json",
				extends: ["@fcalell/biome-config/shared.json", "./.stack/biome.json"],
			};

	return `${JSON.stringify(config, null, "\t")}\n`;
}

export const LINT_PATH = ".stack/biome.json";

// `.stack/biome.json`: the plugins' GritQL rules, each on the sources it names.
// `root: false` keeps Biome from reading it as a second root config where the
// consumer's `files.includes` does not skip `.stack`.
//
// TODO: Biome resolves a plugin path against the directory of the root config
// (or the nested one), not the extending file, and fails a package specifier,
// so a package's file is spelled under `node_modules/` and each plugin takes
// its `includes` through an override (Biome 2.4 reads no `includes` on a plugin
// entry). Drop both when Biome resolves `@scope/pkg/file.grit` and takes
// per-plugin `includes` (2.5's object form).
//
// `ignore` lists generated sources Biome skips: a plugin's output follows its
// tool's formatting, not the consumer's. They are an override that turns the
// linter, formatter and import sorting off for them, never a `files.includes`
// exclusion: an `includes` list in an extending config replaces the one before
// it (a lone `["!src/migrations"]` leaves nothing to check, `biome check .`
// processing 0 files), where overrides accumulate and leave the shared preset's
// list in force.
export function lintConfig(
	plugins: readonly LintPlugin[],
	ignore: readonly string[] = [],
): string {
	const byIncludes = new Map<string, string[]>();
	for (const { path, includes } of plugins) {
		const key = JSON.stringify(includes);
		byIncludes.set(key, [
			...(byIncludes.get(key) ?? []),
			`node_modules/${path}`,
		]);
	}
	const overrides: object[] = [...byIncludes].map(([includes, paths]) => ({
		includes: JSON.parse(includes) as string[],
		plugins: paths,
	}));
	if (ignore.length > 0) {
		overrides.push({
			// Each entry as a file and as a directory's contents.
			includes: ignore.flatMap((glob) => [glob, `${glob}/**`]),
			linter: { enabled: false },
			formatter: { enabled: false },
			assist: { enabled: false },
		});
	}
	return `${JSON.stringify({ root: false, overrides }, null, "\t")}\n`;
}
