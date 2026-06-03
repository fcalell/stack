import type { ScaffoldSpec } from "#ast";
import { type Contribution, type Slot, slot } from "#lib/slots";
import type {
	BuildStep,
	DeployCheck,
	DeployStep,
	DevReadyTask,
	GeneratedFile,
	ProcessSpec,
	PromptSpec,
	WatcherSpec,
} from "#specs";

// CLI-owned slot tokens — every value the core `stack` CLI consumes from
// plugins flows through one of these. The lifecycle is fixed: each command
// resolves a known set of these slots and acts on the values.
//
// `source: "cli"` is the convention for tokens that aren't owned by a plugin.
// Phase-sorted list slots (buildSteps / deploySteps) carry phase+order on the
// spec itself — `sortBy` at the slot level handles ordering at resolution.
const SOURCE = "cli";

const phaseOrder = { pre: 0, main: 1, post: 2 } as const;

function comparePhaseOrder<T extends { phase: "pre" | "main" | "post" }>(
	a: T,
	b: T,
): number {
	return phaseOrder[a.phase] - phaseOrder[b.phase];
}

export const cliSlots = {
	initPrompts: slot.list<PromptSpec>({ source: SOURCE, name: "initPrompts" }),
	initScaffolds: slot.list<ScaffoldSpec>({
		source: SOURCE,
		name: "initScaffolds",
		// Two plugins claiming the same target is a programming error — surface
		// it at compose time rather than waiting for the writer to detect it.
		uniqueBy: (s) => s.target,
	}),
	initDeps: slot.map<string>({ source: SOURCE, name: "initDeps" }),
	initDevDeps: slot.map<string>({ source: SOURCE, name: "initDevDeps" }),
	gitignore: slot.list<string>({ source: SOURCE, name: "gitignore" }),
	artifactFiles: slot.list<GeneratedFile>({
		source: SOURCE,
		name: "artifactFiles",
	}),
	postWrite: slot.list<() => Promise<void>>({
		source: SOURCE,
		name: "postWrite",
	}),
	devProcesses: slot.list<ProcessSpec>({
		source: SOURCE,
		name: "devProcesses",
		// Process names appear in the supervisor's log prefix; two processes
		// sharing a name produce indistinguishable output and ambiguous
		// shutdown/restart targeting.
		uniqueBy: (p) => p.name,
	}),
	devWatchers: slot.list<WatcherSpec>({
		source: SOURCE,
		name: "devWatchers",
		uniqueBy: (w) => w.name,
	}),
	devReadySetup: slot.list<DevReadyTask>({
		source: SOURCE,
		name: "devReadySetup",
		uniqueBy: (t) => t.name,
	}),
	buildSteps: slot.list<BuildStep>({
		source: SOURCE,
		name: "buildSteps",
		sortBy: comparePhaseOrder,
		uniqueBy: (s) => s.name,
	}),
	deployChecks: slot.list<DeployCheck>({
		source: SOURCE,
		name: "deployChecks",
	}),
	deploySteps: slot.list<DeployStep>({
		source: SOURCE,
		name: "deploySteps",
		sortBy: comparePhaseOrder,
		uniqueBy: (s) => s.name,
	}),
	removeFiles: slot.list<string>({ source: SOURCE, name: "removeFiles" }),
	removeDeps: slot.list<string>({ source: SOURCE, name: "removeDeps" }),
	removeDevDeps: slot.list<string>({ source: SOURCE, name: "removeDevDeps" }),
} as const;

export type CliSlots = typeof cliSlots;

// Shorthand for the canonical "resolve a *Source slot, write it as an
// artifact, skip on null" pattern. A null source means the upstream
// derivation chose not to emit anything (e.g. no runtimes registered) — the
// contribution returns undefined and the artifactFiles list drops it.
export function emitArtifact(
	path: string,
	source: Slot<string | null>,
): Contribution<GeneratedFile[]> {
	return cliSlots.artifactFiles.contribute(async (ctx) => {
		const content = await ctx.resolve(source);
		if (content === null) return undefined;
		return { path, content };
	});
}
