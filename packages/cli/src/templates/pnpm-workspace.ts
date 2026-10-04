import { parseDocument } from "yaml";
import {
	STACK_PACKAGES,
	type StackPackage,
	stackBuildKey,
	stackClosure,
	stackSpec,
} from "../lib/stack-packages.ts";

// Each git package's `prepare` installs and builds the whole stack workspace
// in its own clone, so several at once can exhaust the machine's memory.
// TODO: these go once stack publishes to npm and no install runs a prepare.
const THROTTLE: Record<string, number> = {
	childConcurrency: 1,
	networkConcurrency: 2,
};

// Merges stack's install settings into the consumer's `pnpm-workspace.yaml`,
// writing only the entries it lacks. `allowBuilds` carries each stack
// package's build-script verdicts, which the first install already needs:
// pnpm refuses an install that meets an undecided build. A git tarball keeps the `workspace:*`
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
	const builds: Record<string, boolean> = {};
	for (const name of stackClosure(packages)) {
		setMissing(["allowBuilds", stackBuildKey(name)], true);
		const entry = STACK_PACKAGES[name];
		const verdicts: Readonly<Record<string, boolean>> =
			"builds" in entry ? entry.builds : {};
		for (const [dep, allowed] of Object.entries(verdicts)) {
			if (builds[dep] === !allowed) {
				throw new Error(`Stack packages disagree on the build of ${dep}.`);
			}
			builds[dep] = allowed;
		}
	}
	for (const [dep, allowed] of Object.entries(builds)) {
		setMissing(["allowBuilds", dep], allowed);
	}
	for (const [name, value] of Object.entries(THROTTLE)) {
		setMissing([name], value);
	}
	return String(doc);
}
