// Build/Deploy step sort by phase. Both `BuildStep` and `DeployStep` (in
// `#specs`) carry a `phase: "pre" | "main" | "post"`; the slot-level sort
// uses this helper so order is consistent across the CLI.
//
// Other payload helpers that lived here (deduplicateFiles, mergeDependencies,
// processDevPayloads, …) are gone — the slot graph composes list / map
// slots by construction and each plugin's derivation owns its own merge
// semantics.

const PHASE_ORDER = { pre: 0, main: 1, post: 2 } as const;

export function sortStepsByPhase<T extends { phase: "pre" | "main" | "post" }>(
	steps: T[],
): T[] {
	return [...steps].sort((a, b) => PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase]);
}
