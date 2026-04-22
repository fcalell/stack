import type { ScaffoldSpec } from "#ast";
import { slot } from "#lib/slots";
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
	}),
	devWatchers: slot.list<WatcherSpec>({
		source: SOURCE,
		name: "devWatchers",
	}),
	devReadySetup: slot.list<DevReadyTask>({
		source: SOURCE,
		name: "devReadySetup",
	}),
	buildSteps: slot.list<BuildStep>({
		source: SOURCE,
		name: "buildSteps",
		sortBy: comparePhaseOrder,
	}),
	deployChecks: slot.list<DeployCheck>({
		source: SOURCE,
		name: "deployChecks",
	}),
	deploySteps: slot.list<DeployStep>({
		source: SOURCE,
		name: "deploySteps",
		sortBy: comparePhaseOrder,
	}),
	removeFiles: slot.list<string>({ source: SOURCE, name: "removeFiles" }),
	removeDeps: slot.list<string>({ source: SOURCE, name: "removeDeps" }),
	removeDevDeps: slot.list<string>({ source: SOURCE, name: "removeDevDeps" }),
} as const;

export type CliSlots = typeof cliSlots;
