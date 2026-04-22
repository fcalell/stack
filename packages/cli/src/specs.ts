// Shared spec types consumed across plugins + commands.
// These were formerly exported alongside event tokens from `./events`; the
// slot-based plugin system keeps the spec shapes (what plugins contribute)
// but drops the event tokens and the bus that carried them.

export interface GeneratedFile {
	path: string;
	content: string;
}

export interface ProcessSpec {
	name: string;
	command: string;
	args: string[];
	defaultPort?: number;
	readyPattern?: RegExp;
	color?: string;
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
