import { parseDocument } from "yaml";
import {
	STACK_PACKAGES,
	type StackPackage,
	stackBuildKey,
	stackClosure,
	stackGitSpec,
} from "../lib/stack-packages.ts";

// Each git package's `prepare` installs and builds the whole stack workspace
// in its own clone, so several at once can exhaust the machine's memory.
const THROTTLE: Record<string, number> = {
	childConcurrency: 1,
	networkConcurrency: 2,
};

// Merges stack's install settings into the consumer's `pnpm-workspace.yaml`,
// writing only the entries it lacks. `allowBuilds` carries each stack
// package's build-script verdicts, which the first install already needs:
// pnpm refuses an install that meets an undecided build. A git tarball keeps
// the `workspace:*` ranges between stack packages, so (`github`) every package
// the consumer's own reach is overridden to its spec, and each runs its
// `prepare` to build `dist/`. A consumer that installs from npm or links a
// stack checkout (`link`) installs no git package, so it takes the verdicts
// alone.
export function pnpmWorkspaceTemplate(
	existing: string | null,
	packages: Iterable<StackPackage>,
	source: "github" | "link" | "npm",
	commit: string | null,
): string {
	const doc = parseDocument(existing ?? "");
	const setMissing = (path: string[], value: unknown): void => {
		if (!doc.hasIn(path)) doc.setIn(path, value);
	};
	const git = source === "github";
	if (git) {
		for (const name of stackClosure(packages)) {
			setMissing(["overrides", name], stackGitSpec(name, commit));
		}
		// The git packages depend on one another by git spec.
		setMissing(["blockExoticSubdeps"], false);
	}
	const builds: Record<string, boolean> = {};
	for (const name of stackClosure(packages)) {
		if (git) setMissing(["allowBuilds", stackBuildKey(name)], true);
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
	if (git) {
		for (const [name, value] of Object.entries(THROTTLE)) {
			setMissing([name], value);
		}
	}
	return String(doc);
}
