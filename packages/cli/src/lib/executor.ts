import type { ScaffoldSpec } from "#ast";
import type {
	BuildStartPayload,
	BuildStep,
	DeployExecutePayload,
	DeployStep,
	DevReadyPayload,
	DevStartPayload,
	GeneratedFile,
	InitScaffoldPayload,
	WatcherSpec,
} from "#events";

// ── File deduplication ──────────────────────────────────────────────

export function deduplicateFiles(
	files: { path: string; content: string }[],
): { path: string; content: string }[] {
	const byPath = new Map<string, { path: string; content: string }>();
	for (const file of files) {
		byPath.set(file.path, file);
	}
	return [...byPath.values()];
}

// Duplicate-target detection for scaffold specs runs during writeScaffoldSpecs
// and raises ScaffoldError. This helper just flags whether any duplicates exist
// so the executor can surface them consistently with the other payload passes.
export function scaffoldDuplicateTargets(specs: ScaffoldSpec[]): string[] {
	const seen = new Set<string>();
	const dupes: string[] = [];
	for (const spec of specs) {
		if (seen.has(spec.target)) dupes.push(spec.target);
		seen.add(spec.target);
	}
	return dupes;
}

// ── Dependency merging ──────────────────────────────────────────────

export function mergeDependencies(
	...sources: Record<string, string>[]
): Record<string, string> {
	const merged: Record<string, string> = {};
	for (const source of sources) {
		Object.assign(merged, source);
	}
	return merged;
}

// ── Gitignore deduplication ─────────────────────────────────────────

export function deduplicateGitignore(entries: string[]): string[] {
	return [...new Set(entries)];
}

// ── Build/Deploy step sorting ───────────────────────────────────────

const PHASE_ORDER = { pre: 0, main: 1, post: 2 } as const;

export function sortStepsByPhase<T extends { phase: "pre" | "main" | "post" }>(
	steps: T[],
): T[] {
	return [...steps].sort((a, b) => PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase]);
}

// ── Scaffold payload processing ─────────────────────────────────────

export interface ScaffoldResult {
	files: ScaffoldSpec[];
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
	gitignore: string[];
}

export function processScaffoldPayload(
	payload: InitScaffoldPayload,
): ScaffoldResult {
	// No deduplication here: duplicate targets are an error and get caught by
	// writeScaffoldSpecs before any files land on disk.
	return {
		files: payload.files,
		dependencies: payload.dependencies,
		devDependencies: payload.devDependencies,
		gitignore: deduplicateGitignore(payload.gitignore),
	};
}

// ── Dev payload processing ──────────────────────────────────────────

export interface DevPlan {
	processes: DevStartPayload["processes"];
	watchers: WatcherSpec[];
	setupTasks: DevReadyPayload["setup"];
}

export function processDevPayloads(
	startPayload: DevStartPayload,
	readyPayload?: DevReadyPayload,
): DevPlan {
	return {
		processes: startPayload.processes,
		watchers: [...startPayload.watchers, ...(readyPayload?.watchers ?? [])],
		setupTasks: readyPayload?.setup ?? [],
	};
}

// ── Build payload processing ────────────────────────────────────────

export function processBuildPayload(payload: BuildStartPayload): BuildStep[] {
	return sortStepsByPhase(payload.steps);
}

// ── Deploy payload processing ───────────────────────────────────────

export function processDeployPayload(
	payload: DeployExecutePayload,
): DeployStep[] {
	return sortStepsByPhase(payload.steps);
}

// ── Generate payload processing ─────────────────────────────────────

export function processGenerateFiles(files: GeneratedFile[]): GeneratedFile[] {
	return deduplicateFiles(files);
}
