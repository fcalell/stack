import { parseDocument } from "yaml";
import {
	type StackPackage,
	stackBuildKey,
	stackClosure,
	stackSpec,
} from "../lib/stack-packages.ts";

// The install's own build scripts beside the stack packages': esbuild's
// binary, and workerd's under the wrangler every app with a worker carries.
const BUILDS: Record<string, boolean> = {
	esbuild: true,
	workerd: true,
};

// Merges stack's install settings into the consumer's `pnpm-workspace.yaml`,
// writing only the entries it lacks. A git tarball keeps the `workspace:*`
// ranges between stack packages, so every package the consumer's own reach
// is overridden to its spec, and each runs its `prepare` to build `dist/`.
export function pnpmWorkspaceTemplate(
	existing: string | null,
	packages: Iterable<StackPackage>,
): string {
	const doc = parseDocument(existing ?? "");
	const setMissing = (path: string[], value: unknown): void => {
		if (!doc.hasIn(path)) doc.setIn(path, value);
	};
	for (const name of stackClosure(packages)) {
		setMissing(["overrides", name], stackSpec(name));
	}
	// The git packages depend on one another by git spec.
	setMissing(["blockExoticSubdeps"], false);
	for (const name of stackClosure(packages)) {
		setMissing(["allowBuilds", stackBuildKey(name)], true);
	}
	for (const [name, allowed] of Object.entries(BUILDS)) {
		setMissing(["allowBuilds", name], allowed);
	}
	return String(doc);
}
