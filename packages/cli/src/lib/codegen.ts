import { findPackageInfo } from "#lib/package-info";

// ── Runtime-export discovery ────────────────────────────────────────
//
// Shared helper: returns true if the given npm package declares a
// `./runtime` subpath export. Used by both the CLI (to decide whether a
// worker entry is needed at all) and plugin-api (to gate its Worker/
// Middleware/Generate handlers). Lives in core — both consumers need it
// and it has no domain dependency.

export function hasRuntimeExport(packageName: string): boolean {
	const info = findPackageInfo(packageName);
	return !!info?.pkgJson.exports?.["./runtime"];
}
