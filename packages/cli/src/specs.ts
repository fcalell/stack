// Shared spec types consumed across plugins + commands.
// These were formerly exported alongside event tokens from `./events`; the
// slot-based plugin system keeps the spec shapes (what plugins contribute)
// but drops the event tokens and the bus that carried them.

export interface GeneratedFile {
	path: string;
	content: string;
}

// Restart policy for a supervised dev process.
//   "never"     — exits are terminal; supervisor reports the exit and stops.
//   "on-crash"  — restart only on non-zero exit / signal; clean exit (code 0) stops.
//   "always"    — restart on any exit (rare; useful for long-running daemons).
export type ProcessRestartPolicy = "never" | "on-crash" | "always";

// Hook invoked after every exit. Returning `{ restart: false }` vetoes a
// restart that the policy would otherwise schedule. Returning anything else
// (`undefined` or no return value) defers to the policy. Sync return only —
// the supervisor needs the decision before scheduling backoff.
//
// Declared as a function-type alias rather than a method shorthand because
// callers compose with arrow functions; method-shorthand on the interface
// member (below) gives us the bivariant return-type checking that lets a
// side-effect-only handler (`(event) => { ctx.log.error(...) }`, no return
// statement) typecheck against `{ restart: boolean } | undefined`.
export type ProcessOnExit = (
	event: ProcessExit,
) => { restart: boolean } | undefined;

export interface ProcessSpec {
	name: string;
	command: string;
	args: string[];
	// Optional port hint. Used as a fallback when the default
	// `EADDRINUSE` regex matches but no number is captured (rare with the
	// default pattern, common with custom patterns), and reported back on the
	// `ProcessExit.detectedPort` field so callers can react (e.g. retry on a
	// different port, surface a clearer error).
	defaultPort?: number;
	readyPattern?: RegExp;
	color?: string;
	// Default `"never"`. Most dev processes (vite, wrangler) want
	// `"on-crash"`; we don't make that the default because most contributions
	// are short-lived shell commands where surprise restarts would be wrong.
	restart?: ProcessRestartPolicy;
	// Cap on restart attempts when policy allows restarts. Default 3. Once
	// exceeded, the supervisor reports the final exit and stops.
	maxRestarts?: number;
	// Pattern matched against captured stderr to flag port-in-use. Defaults
	// to a Node.js / Bun / Wrangler EADDRINUSE pattern. Pass `null` to opt
	// out (e.g. processes where stderr noise would false-positive).
	portConflictPattern?: RegExp | null;
	// Per-exit hook — method shorthand makes return-type checking bivariant
	// so callers with side-effect-only handlers (no explicit return) work.
	onExit?(event: ProcessExit): { restart: boolean } | undefined;
}

// Surfaced on every exit (initial run + each restart attempt).
//   restartAttempt — 0 for the first run, increments per restart.
//   portInUse      — `portConflictPattern` matched on stderr.
//   detectedPort   — port number captured from the pattern, or
//                    `defaultPort` as a fallback when classification fired
//                    without a captured number, otherwise `null`.
//   stderrTail     — last ~4 KB of stderr; useful for surfacing the failure
//                    in a higher-level error without re-streaming.
export interface ProcessExit {
	code: number | null;
	signal: NodeJS.Signals | null;
	restartAttempt: number;
	portInUse: boolean;
	detectedPort: number | null;
	stderrTail: string;
}

export interface WatcherSpec {
	name: string;
	paths: string;
	ignore?: string[];
	debounce?: number;
	handler: (
		path: string,
		type: "add" | "unlink" | "change",
	) => void | Promise<void>;
}

export type BuildStep =
	| {
			name: string;
			phase: "pre" | "main" | "post";
			exec: { command: string; args: string[]; cwd?: string };
	  }
	| { name: string; phase: "pre" | "main" | "post"; run: () => Promise<void> };

export type DeployStep =
	| {
			name: string;
			phase: "pre" | "main" | "post";
			exec: { command: string; args: string[]; cwd?: string };
	  }
	| { name: string; phase: "pre" | "main" | "post"; run: () => Promise<void> };

export interface DeployCheck {
	plugin: string;
	description: string;
	items: { label: string; detail?: string }[];
	action: () => Promise<void>;
}

// Prompt contract for `cli.slots.initPrompts`. Each contribution carries the
// plugin's name + an ask function that returns the collected answers keyed by
// plugin name. `priors` contains answers already collected from earlier
// plugins in the init flow (topological order).
export interface PromptSpec {
	plugin: string;
	ask: (
		// Contributions run with a full ContributionCtx, but PromptSpec is
		// structural — we avoid re-exporting ContributionCtx here to keep this
		// file dependency-free for plugin consumers that only need the shape.
		ctx: unknown,
		priors: Record<string, unknown>,
	) => Promise<Record<string, unknown>>;
}

// Setup tasks surfaced via `cli.slots.devReadySetup`. Kept distinct from a
// generic "runnable" because `dev` logs each task's name as it runs.
export interface DevReadyTask {
	name: string;
	run: () => Promise<void>;
}
